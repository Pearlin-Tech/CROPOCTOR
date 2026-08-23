import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cropDoctorService } from '@/services/cropDoctorService'
import type { DiagnosisResult } from '@/types'

const STEPS = [
  { label: 'Examining plant image',         icon: '🔍' },
  { label: 'Identifying crop species',      icon: '🌱' },
  { label: 'Detecting visual leaf lesions', icon: '🔬' },
  { label: 'Running Gemini Multimodal AI',  icon: '🧠' },
  { label: 'Preparing treatment plan',      icon: '✅' },
]

const ImageAnalysisPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  const state = (location.state as any) || {}
  const { imageUrl, imageBase64, isSample, farmContext } = state

  const diagnosisRef = useRef<DiagnosisResult | null>(null)
  const apiCompletedRef = useRef<boolean>(false)

  // 1. Trigger API Analysis in parallel with animation
  useEffect(() => {
    let isCancelled = false

    cropDoctorService.analyzeImage({
      imageBase64,
      imageUrl,
      isSample,
      farmContext
    }).then(res => {
      if (isCancelled) return
      if (res.success && res.diagnosis) {
        diagnosisRef.current = res.diagnosis
      } else if (res.error) {
        console.warn('[ImageAnalysisPage] Diagnostic API error:', res.error)
        setErrorMessage(res.error)
      }
      apiCompletedRef.current = true
    }).catch(err => {
      if (isCancelled) return
      console.error('[ImageAnalysisPage] Exception during diagnosis:', err)
      apiCompletedRef.current = true
    })

    return () => { isCancelled = true }
  }, [imageBase64, imageUrl, isSample, farmContext])

  // 2. Step animation sequence & navigation upon completion
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStep(prev => {
        if (prev < STEPS.length - 1) {
          return prev + 1
        } else {
          clearInterval(stepInterval)

          // Once animation reaches final step, check API result and navigate
          setTimeout(() => {
            const finalDiagnosis = diagnosisRef.current
            navigate('/diagnosis-result', {
              state: {
                diagnosis: finalDiagnosis,
                imageUrl: imageUrl || finalDiagnosis?.imageUrl || '/images/disease_leaf_1787238259522.jpg'
              },
              replace: true
            })
          }, 600)

          return prev
        }
      })
    }, 800)

    return () => clearInterval(stepInterval)
  }, [navigate, imageUrl])

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 text-white relative">
      {/* Background radial glow */}
      <div className="absolute top-1/4 w-96 h-96 bg-green-900/20 rounded-full blur-3xl pointer-events-none" />

      {/* Image Preview & Scanning Effect */}
      {imageUrl && (
        <div className="relative w-full max-w-xs aspect-square rounded-3xl overflow-hidden mb-8 shadow-2xl border border-green-500/30">
          <img src={imageUrl} alt="Crop being diagnosed" className="w-full h-full object-cover" />
          
          {/* Scanning Bar */}
          <motion.div
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-emerald-300 to-green-400 shadow-[0_0_15px_rgba(74,222,128,0.8)]"
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
          />

          <div className="absolute inset-0 bg-black/20" />

          {/* Corner Bounding Markers */}
          {['top-3 left-3 border-t-2 border-l-2', 'top-3 right-3 border-t-2 border-r-2', 'bottom-3 left-3 border-b-2 border-l-2', 'bottom-3 right-3 border-b-2 border-r-2'].map((pos, idx) => (
            <div key={idx} className={`absolute ${pos} w-5 h-5 border-green-400 rounded-xs`} />
          ))}
        </div>
      )}

      {/* Step Indicators */}
      <div className="space-y-3.5 w-full max-w-xs z-10">
        {STEPS.map((s, i) => (
          <AnimatePresence key={s.label}>
            {i <= step && (
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-3 bg-gray-900/60 backdrop-blur-md p-3 rounded-2xl border border-gray-800"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${i === step ? 'bg-green-500 text-gray-950 animate-pulse' : 'bg-green-950/80 text-green-400 border border-green-800/40'}`}>
                  {i < step ? '✓' : s.icon}
                </div>
                <span className={`text-sm font-medium ${i === step ? 'text-white font-semibold' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {errorMessage && (
        <p className="mt-4 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 px-3 py-1.5 rounded-lg text-center max-w-xs">
          ⚠️ {errorMessage}
        </p>
      )}
    </div>
  )
}

export default ImageAnalysisPage
