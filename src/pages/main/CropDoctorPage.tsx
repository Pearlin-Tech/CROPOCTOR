import React, { useRef, useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Camera, Upload, FlaskConical, ChevronRight, RefreshCw, AlertCircle, Stethoscope, AlertTriangle, RotateCcw, ShieldAlert } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IMAGES } from '@/config/images'
import { useTranslation } from 'react-i18next'
import { useApp } from '@/store/AppContext'
import { useUser } from '@/store/UserContext'
import { useFarm } from '@/store/FarmContext'
import { cropDoctorService, validateCropImage } from '@/services/cropDoctorService'
import { compressImageWithFallback } from '@/utils/imageCompressor'
import { formatDiagnosisTimestamp } from '@/utils/format'
import type { DiagnosisResult } from '@/types'
import { CameraModal } from '@/components/ui/CameraModal'

export type ImageSource = 'camera' | 'upload' | 'sample'

export interface AcquiredImageState {
  file: File | Blob | null
  previewUrl: string
  source: ImageSource
  fileName: string
  originalSizeBytes: number
  compressedBase64?: string
  compressedSizeBytes?: number
}

const CropDoctorPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useApp()
  const { authUser } = useUser()
  const { activeFarm } = useFarm()
  const { t } = useTranslation()

  // Input refs for camera capture & file upload
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Temporary Image Acquisition State (Pure browser memory)
  const [acquiredImage, setAcquiredImage] = useState<AcquiredImageState | null>(null)
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false)

  // API Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // History State
  const [recentDiagnoses, setRecentDiagnoses] = useState<DiagnosisResult[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [diagnosisRefreshKey, setDiagnosisRefreshKey] = useState(0)

  // Handle "Diagnose Another Crop" state reset triggered via router
  useEffect(() => {
    if (location.state?.reset) {
      clearAcquiredImage()
      setIsAnalyzing(false)
      setAnalysisError(null)
    }
  }, [location.state])

  // Load Recent Diagnoses from Firestore for UI list display
  useEffect(() => {
    let isMounted = true
    setIsLoadingHistory(true)
    setHistoryError(null)

    cropDoctorService.getRecentDiagnoses(5, activeFarm?.id).then(list => {
      if (!isMounted) return
      setRecentDiagnoses(list)
      setIsLoadingHistory(false)
    }).catch(err => {
      if (!isMounted) return
      setIsLoadingHistory(false)
      if (err?.message === 'FIRESTORE_PERMISSION_DENIED') {
        setHistoryError('Permission denied reading diagnosis history. Check Firestore rules.')
      } else {
        console.warn('[CropDoctorPage] Failed to fetch diagnosis history:', err)
      }
    })

    return () => { isMounted = false }
  }, [authUser?.uid, activeFarm?.id, diagnosisRefreshKey])

  /**
   * Resets current image selection in memory
   */
  const clearAcquiredImage = () => {
    if (acquiredImage?.previewUrl && acquiredImage.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(acquiredImage.previewUrl)
    }
    setAcquiredImage(null)
    setPermissionError(null)
    setAnalysisError(null)
    setIsAnalyzing(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  /**
   * 1. Trigger Camera with Permission Handling
   */
  const handleTriggerCamera = () => {
    setPermissionError(null)
    setAnalysisError(null)
    setIsCameraModalOpen(true)
  }

  const handleCameraCapture = async (file: File) => {
    // Client-side validation (< 10MB, JPG/PNG/WebP)
    const validation = validateCropImage(file)
    if (!validation.valid) {
      toast.error(validation.error || 'Unsupported image format')
      return
    }

    if (acquiredImage?.previewUrl && acquiredImage.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(acquiredImage.previewUrl)
    }
    setAnalysisError(null)
    setIsAnalyzing(false)
    setIsProcessingImage(true)
    setPermissionError(null)

    const blobPreviewUrl = URL.createObjectURL(file)
    const origSizeKb = (file.size / 1024).toFixed(0) + ' KB'

    try {
      const compResult = await compressImageWithFallback(file)
      const compSizeKb = (compResult.compressedSizeBytes / 1024).toFixed(0) + ' KB'

      setAcquiredImage({
        file,
        previewUrl: blobPreviewUrl,
        source: 'camera',
        fileName: file.name,
        originalSizeBytes: file.size,
        compressedBase64: compResult.compressedBase64,
        compressedSizeBytes: compResult.compressedSizeBytes
      })

      toast.success(`Photo acquired! Optimized (${origSizeKb} → ${compSizeKb})`)
    } catch (err) {
      console.warn('[CropDoctorPage] Canvas compression fallback:', err)
      setAcquiredImage({
        file,
        previewUrl: blobPreviewUrl,
        source: 'camera',
        fileName: file.name,
        originalSizeBytes: file.size
      })
    } finally {
      setIsProcessingImage(false)
    }
  }

  /**
   * 2. Handle File Input Selection
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, source: ImageSource) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side validation (< 10MB, JPG/PNG/WebP)
    const validation = validateCropImage(file)
    if (!validation.valid) {
      toast.error(validation.error || 'Unsupported image format')
      e.target.value = ''
      return
    }

    // Reset previous image & analysis state when a NEW image is selected
    if (acquiredImage?.previewUrl && acquiredImage.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(acquiredImage.previewUrl)
    }
    setAnalysisError(null)
    setIsAnalyzing(false)

    setIsProcessingImage(true)
    setPermissionError(null)

    const blobPreviewUrl = URL.createObjectURL(file)
    const origSizeKb = (file.size / 1024).toFixed(0) + ' KB'

    try {
      // In-browser Canvas compression
      const compResult = await compressImageWithFallback(file)
      const compSizeKb = (compResult.compressedSizeBytes / 1024).toFixed(0) + ' KB'

      setAcquiredImage({
        file,
        previewUrl: blobPreviewUrl,
        source,
        fileName: file.name,
        originalSizeBytes: file.size,
        compressedBase64: compResult.compressedBase64,
        compressedSizeBytes: compResult.compressedSizeBytes
      })

      toast.success(`Photo acquired! Optimized (${origSizeKb} → ${compSizeKb})`)
    } catch (err) {
      console.warn('[CropDoctorPage] Canvas compression fallback:', err)
      setAcquiredImage({
        file,
        previewUrl: blobPreviewUrl,
        source,
        fileName: file.name,
        originalSizeBytes: file.size
      })
    } finally {
      setIsProcessingImage(false)
    }
  }

  /**
   * 3. Handle Sample Selection
   */
  const handleSampleSelect = () => {
    clearAcquiredImage()
    const sampleUrl = IMAGES.diagnosis.sampleDisease || '/images/disease_leaf_1787238259522.jpg'
    
    setAcquiredImage({
      file: null,
      previewUrl: sampleUrl,
      source: 'sample',
      fileName: 'sample_groundnut_leaf.jpg',
      originalSizeBytes: 835457,
      compressedSizeBytes: 120400
    })

    toast.info('Sample leaf image selected.')
  }

  /**
   * 4. Main "Diagnose Crop" Trigger (Calls POST /api/analyze-crop with current selected image)
   */
  const handleDiagnoseCrop = async () => {
    if (!acquiredImage) {
      toast.warning('Please select an image or take a photo first.')
      return
    }

    if (isAnalyzing) return // Prevent duplicate requests

    setIsAnalyzing(true)
    setAnalysisError(null)

    const farmContext = {
      farmId: activeFarm?.id || 'farm-001',
      crop: activeFarm?.primaryCrop || 'Groundnut',
      cropStage: activeFarm?.cropStage || 'Vegetative',
      soilType: activeFarm?.soilType || 'Loam',
      location: activeFarm?.location?.displayName || 'Farm'
    }

    try {
      // Send CURRENT selected image (compressed base64 or sample URL) to serverless backend
      const result = await cropDoctorService.analyzeImage({
        file: acquiredImage.file,
        imageBase64: acquiredImage.compressedBase64,
        imageUrl: acquiredImage.previewUrl,
        isSample: acquiredImage.source === 'sample',
        source: acquiredImage.source,
        farmContext
      })

      if (!result.success || !result.diagnosis) {
        const errorMsg = result.error || 'Failed to process crop diagnosis. Please check network and retry.'
        setAnalysisError(errorMsg)
        toast.error(errorMsg)
        setIsAnalyzing(false)
        return
      }

      if (result.diagnosis.isPlantImage === false) {
        const errorMsg = 'Please upload a clear photo of a plant leaf or crop. The uploaded image does not appear to contain a plant.'
        setAnalysisError(errorMsg)
        toast.error(errorMsg)
        setIsAnalyzing(false)
        return
      }

      // On Success: Trigger history refresh then navigate to result page
      setDiagnosisRefreshKey(k => k + 1)
      navigate('/diagnosis-result', {
        state: {
          diagnosis: result.diagnosis,
          imageUrl: acquiredImage.previewUrl
        }
      })
    } catch (err: any) {
      console.error('[CropDoctorPage Diagnosis Exception]:', err)
      const errText = err?.message || 'An unexpected error occurred during diagnosis. Please try again.'
      setAnalysisError(errText)
      toast.error(errText)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title={t('diagnose.title', 'Crop Doctor AI')} subtitle={t('diagnose.subtitle', 'Acquire a crop leaf image for instant diagnosis')} />

      <CameraModal 
        isOpen={isCameraModalOpen} 
        onClose={() => setIsCameraModalOpen(false)} 
        onCapture={handleCameraCapture} 
      />

      {/* Hidden File Inputs */}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'upload')}
      />

      <PageLayout className="pt-4 pb-8 space-y-4">
        {/* Desktop Header */}
        <div className="hidden lg:block mb-4">
          <h1 className="text-2xl font-bold text-green-forest tracking-tight">{t('diagnose.title', 'Crop Doctor AI')}</h1>
          <p className="text-brown-earth/80 text-sm font-medium">{t('diagnose.subtitle', 'Acquire a crop leaf image for instant diagnosis')}</p>
        </div>

        {/* 3-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Acquisition & Action Zone */}
          <div className="lg:col-span-1 space-y-4">
            
            {/* Image Preview & Touch Upload Zone */}
            <div
              onClick={() => {
                if (!acquiredImage && !isAnalyzing && fileInputRef.current) {
                  fileInputRef.current.click()
                }
              }}
              className="relative w-full aspect-square lg:aspect-[4/3] rounded-3xl overflow-hidden border-2 border-dashed border-brown-pastel/50 bg-gradient-to-br from-green-pastel/20 to-cream flex flex-col items-center justify-center cursor-pointer hover:border-green-forest shadow-sm transition-all group"
            >
              {acquiredImage ? (
                <>
                  <img src={acquiredImage.previewUrl} alt="Acquired leaf" className="absolute inset-0 w-full h-full object-cover" />
                  
                  {/* Source Badge */}
                  <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                    {acquiredImage.source === 'camera' && <Camera className="w-3.5 h-3.5 text-green-400" />}
                    {acquiredImage.source === 'upload' && <Upload className="w-3.5 h-3.5 text-blue-400" />}
                    {acquiredImage.source === 'sample' && <FlaskConical className="w-3.5 h-3.5 text-amber-400" />}
                    <span className="capitalize">{acquiredImage.source} Image</span>
                  </div>

                  {/* Loading State Overlay */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 z-20">
                      <RefreshCw className="w-10 h-10 text-green-400 animate-spin mb-3" />
                      <p className="font-bold text-lg text-center animate-pulse">Analyzing your crop...</p>
                      <p className="text-xs text-gray-300 mt-1 font-mono">Gemini Multimodal AI processing</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="absolute inset-4 border border-brown-pastel/30 rounded-2xl pointer-events-none" />
                  <img src={IMAGES.diagnosis.uploadPlaceholder} alt="Crop leaf" className="absolute inset-0 w-full h-full object-cover opacity-[0.03] mix-blend-multiply" />
                  <div className="relative text-center p-6 z-10">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-button group-hover:scale-105 transition-transform border border-brown-pastel/30">
                      <Camera className="w-8 h-8 text-green-forest" />
                    </div>
                    <p className="font-bold text-green-forest text-lg">{t('diagnose.tapToUpload', 'Tap to select leaf photo')}</p>
                    <p className="text-sm text-brown-earth/80 mt-1 font-medium">{t('diagnose.orTakePhoto', 'or snap using camera')}</p>
                  </div>
                </>
              )}
            </div>

            {/* Permission Error Banner */}
            {permissionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{permissionError}</span>
              </div>
            )}

            {/* Analysis Error Banner (Preserves selected image & allows retry) */}
            {analysisError && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 space-y-1.5 shadow-sm">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Diagnosis Error</span>
                </div>
                <p className="leading-relaxed">{analysisError}</p>
                <p className="text-[11px] font-semibold text-amber-700">Your selected image is preserved. Tap "Diagnose Crop" below to retry.</p>
              </div>
            )}

            {/* Selected Image Information & Primary "Diagnose Crop" Button */}
            {acquiredImage && (
              <div className="bg-cream border border-brown-pastel/40 rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between text-xs text-brown-earth font-medium">
                  <span className="truncate max-w-[160px] font-semibold">{acquiredImage.fileName}</span>
                  <span className="text-green-800 font-bold">
                    {acquiredImage.compressedSizeBytes
                      ? `${(acquiredImage.compressedSizeBytes / 1024).toFixed(0)} KB (compressed)`
                      : `${(acquiredImage.originalSizeBytes / 1024).toFixed(0)} KB`}
                  </span>
                </div>

                {/* Primary "Diagnose Crop" Action Button */}
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={isAnalyzing}
                  disabled={isAnalyzing || isProcessingImage}
                  icon={<Stethoscope className="w-5 h-5" />}
                  onClick={handleDiagnoseCrop}
                  className="py-3.5 text-base font-bold shadow-md bg-green-forest hover:bg-green-dark"
                >
                  {isAnalyzing ? 'Analyzing your crop...' : 'Diagnose Crop'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                  onClick={clearAcquiredImage}
                  disabled={isAnalyzing || isProcessingImage}
                >
                  Change Image
                </Button>
              </div>
            )}

            {/* Primary Acquisition Triggers */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="primary"
                size="md"
                fullWidth
                icon={<Camera className="w-4 h-4" />}
                onClick={handleTriggerCamera}
                disabled={isAnalyzing || isProcessingImage}
              >
                {t('diagnose.takePhoto', 'Take Photo')}
              </Button>
              
              <Button
                variant="secondary"
                size="md"
                fullWidth
                icon={<Upload className="w-4 h-4" />}
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing || isProcessingImage}
              >
                {t('diagnose.uploadImage', 'Upload Image')}
              </Button>
            </div>

            {/* Sample Image Action */}
            <Button
              variant="outline"
              size="md"
              fullWidth
              icon={<FlaskConical className="w-4 h-4" />}
              onClick={handleSampleSelect}
              disabled={isAnalyzing || isProcessingImage}
            >
              {t('diagnose.useSample', 'Use Sample Leaf Image')}
            </Button>
          </div>

          {/* Right Column: Guidelines & Recent Diagnoses */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Guidelines Card */}
            <Card padding="md" className="border-brown-pastel/30 bg-cream">
              <h3 className="font-bold text-brown-earth mb-3 flex items-center gap-2">
                <span className="text-lg">📸</span> {t('diagnose.tips.title', 'Tips for high accuracy diagnosis')}
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary font-medium">
                {[
                  t('diagnose.tips.tip1', 'Use bright, natural daylight — avoid heavy shadows.'),
                  t('diagnose.tips.tip2', 'Focus clearly on the affected leaf spots or lesions.'),
                  t('diagnose.tips.tip3', 'Include 2–3 leaves showing symptoms for best comparison.'),
                  t('diagnose.tips.tip4', 'Keep camera steady and close to the infected foliage area.'),
                ].map(tip => (
                  <li key={tip} className="flex gap-2.5">
                    <span className="text-green-forest font-bold shrink-0">✓</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </Card>

            {/* History List Card */}
            <Card padding="md" className="border-brown-pastel/30 bg-off-white shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-brown-earth flex items-center gap-2">
                  <span className="text-lg">📋</span> {t('diagnose.recentTitle', 'Recent Diagnoses')}
                </h3>
                {recentDiagnoses.length > 0 && (
                  <button
                    onClick={() => setDiagnosisRefreshKey(k => k + 1)}
                    className="text-xs text-green-forest font-semibold flex items-center gap-1 hover:underline"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </button>
                )}
              </div>

              {isLoadingHistory ? (
                <div className="py-6 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-green-forest" />
                  Loading from Firestore...
                </div>
              ) : historyError ? (
                <div className="flex flex-col items-center gap-2 py-5 px-3 bg-red-50 rounded-xl border border-red-100">
                  <ShieldAlert className="w-7 h-7 text-red-400" />
                  <p className="text-xs font-semibold text-red-700 text-center">Permission Denied</p>
                  <p className="text-xs text-red-500 text-center">{historyError}</p>
                </div>
              ) : recentDiagnoses.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <span className="text-3xl">🌿</span>
                  <p className="text-sm font-semibold text-gray-600">No diagnoses yet</p>
                  <p className="text-xs text-gray-400">Upload a crop photo above to get your first diagnosis</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentDiagnoses.map(d => {
                    const severityColor =
                      d.severity === 'severe'
                        ? 'text-red-600 bg-red-50'
                        : d.severity === 'moderate'
                        ? 'text-amber-600 bg-amber-50'
                        : 'text-green-700 bg-green-50'

                    return (
                      <button
                        key={d.id}
                        onClick={() => navigate('/diagnosis-result', { state: { diagnosis: d } })}
                        className="w-full flex items-start gap-3 p-3.5 bg-white border border-brown-pastel/30 rounded-2xl shadow-sm hover:border-green-forest/40 hover:shadow-card-lg transition-all text-left group"
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-brown-pastel/20">
                          <img
                            src={d.imageUrl || '/images/disease_leaf_1787238259522.jpg'}
                            alt={d.diseaseName || d.disease}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/images/disease_leaf_1787238259522.jpg' }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-text-main text-sm leading-tight">
                            {d.diseaseName || d.disease || 'Issue Detected'}
                          </p>
                          <p className="text-xs text-text-secondary font-medium mt-0.5">
                            🌿 {d.cropName || d.crop}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${severityColor}`}>
                              {d.severity ? d.severity.charAt(0).toUpperCase() + d.severity.slice(1) : 'Unknown'}
                            </span>
                            <span className="text-xs text-green-forest font-bold">
                              {d.confidence}% confidence
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDiagnosisTimestamp(d.timestamp)}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-green-forest shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </PageLayout>
    </motion.div>
  )
}

export default CropDoctorPage
