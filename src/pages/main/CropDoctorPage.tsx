import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Camera, Upload, FlaskConical, ChevronRight } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IMAGES } from '@/config/images'
import { MOCK_DIAGNOSIS_HISTORY } from '@/mock/diagnosis'
import { timeAgo } from '@/utils/format'

const CropDoctorPage: React.FC = () => {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    setPreview(url)
    setTimeout(() => navigate('/image-analysis', { state: { imageUrl: url } }), 500)
  }

  const handleSample = () => {
    navigate('/image-analysis', { state: { imageUrl: IMAGES.diagnosis.sampleDisease, isSample: true } })
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title="Crop Doctor" subtitle="Take a photo of your crop or upload one." />

      <PageLayout className="pt-4 space-y-4">
        {/* Desktop header */}
        <div className="hidden lg:block mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Crop Doctor</h1>
          <p className="text-gray-500 text-sm">Take a photo of your crop or upload one.</p>
        </div>

        {/* Desktop 3-col layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Upload area */}
          <div className="lg:col-span-1 space-y-4">
            {/* Large upload zone */}
            <div
              onClick={() => fileRef.current?.click()}
              className="relative w-full aspect-square lg:aspect-[4/3] rounded-3xl overflow-hidden border-2 border-dashed border-green-pastel bg-gradient-to-br from-green-light to-cream flex flex-col items-center justify-center cursor-pointer hover:border-green-forest shadow-sm transition-all group"
            >
              {preview ? (
                <img src={preview} alt="Selected crop" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <div className="absolute inset-4 border border-green-pastel/50 rounded-2xl pointer-events-none" />
                  <img src={IMAGES.diagnosis.uploadPlaceholder} alt="Crop" className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-multiply" />
                  <div className="relative text-center p-6 z-10">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-button group-hover:scale-105 transition-transform">
                      <Camera className="w-8 h-8 text-green-forest" />
                    </div>
                    <p className="font-semibold text-green-forest text-lg">Tap to upload</p>
                    <p className="text-sm text-green-forest/70 mt-1 font-medium">or take a photo</p>
                  </div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="primary" size="md" fullWidth icon={<Camera className="w-4 h-4" />} onClick={() => fileRef.current?.click()}>
                Take Photo
              </Button>
              <Button variant="secondary" size="md" fullWidth icon={<Upload className="w-4 h-4" />} onClick={() => fileRef.current?.click()}>
                Upload
              </Button>
            </div>
            <Button variant="outline" size="md" fullWidth icon={<FlaskConical className="w-4 h-4" />} onClick={handleSample}>
              Use Sample Image
            </Button>
            <p className="text-xs text-center text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">
              💡 Sample image lets you demo the full diagnosis without a camera.
            </p>
          </div>

          {/* Tips + History */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tips */}
            <Card padding="md">
              <h3 className="font-bold text-gray-700 mb-3">📸 Tips for best results</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {[
                  'Use natural daylight — avoid harsh shadows.',
                  'Photograph the affected leaf clearly.',
                  'Include 2–3 leaves showing symptoms.',
                  'Keep the camera steady and focused.',
                  'Include both sides of the leaf if possible.',
                ].map(tip => (
                  <li key={tip} className="flex gap-2">
                    <span className="text-green-forest mt-0.5">✓</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Recent diagnoses */}
            <Card padding="md" className="border-brown-pastel/20 shadow-sm">
              <h3 className="font-bold text-brown-earth mb-3 flex items-center gap-2">
                <span className="text-lg">📋</span> Recent Diagnoses
              </h3>
              <div className="space-y-3">
                {MOCK_DIAGNOSIS_HISTORY.map(d => (
                  <button
                    key={d.id}
                    onClick={() => navigate('/diagnosis-result')}
                    className="w-full flex items-center gap-4 p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-green-pastel hover:bg-green-50 transition-all text-left"
                  >
                    <img src={d.imageUrl} alt={d.disease} className="w-14 h-14 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{d.disease}</p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">{d.crop} · <span className="text-green-forest">{d.confidence}% match</span></p>
                      <p className="text-xs text-gray-400 mt-0.5">{d.date}</p>
                    </div>
                    <span className="w-8 h-8 rounded-full bg-green-light flex items-center justify-center shrink-0">
                      <ChevronRight className="w-4 h-4 text-green-forest" />
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </PageLayout>
    </motion.div>
  )
}

export default CropDoctorPage
