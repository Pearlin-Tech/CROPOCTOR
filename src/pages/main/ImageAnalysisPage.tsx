import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const STEPS = [
  { label: 'Examining image',         icon: '🔍' },
  { label: 'Identifying crop',        icon: '🌱' },
  { label: 'Checking symptoms',       icon: '🔬' },
  { label: 'Analyzing visual patterns',icon: '🧠' },
  { label: 'Preparing recommendation',icon: '✅' },
]

const ImageAnalysisPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState(0)
  const imageUrl = (location.state as any)?.imageUrl

  useEffect(() => {
    const timers = STEPS.map((_, i) =>
      setTimeout(() => setStep(i), i * 700)
    )
    const done = setTimeout(() => navigate('/diagnosis-result', { state: location.state }), STEPS.length * 700 + 500)
    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [navigate, location.state])

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-6">
      {/* Image preview */}
      {imageUrl && (
        <div className="relative w-full max-w-sm aspect-square rounded-3xl overflow-hidden mb-8">
          <img src={imageUrl} alt="Crop being analyzed" className="w-full h-full object-cover" />
          {/* Scanning line */}
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-green-forest/70"
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/20" />
          {/* Corner markers */}
          {['top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3'].map(pos => (
            <div key={pos} className={`absolute ${pos} w-6 h-6 border-2 border-green-400 rounded-sm`} />
          ))}
        </div>
      )}

      {/* Steps */}
      <div className="space-y-3 w-full max-w-sm">
        {STEPS.map((s, i) => (
          <AnimatePresence key={s.label}>
            {i <= step && (
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${i === step ? 'bg-green-forest text-white animate-pulse-soft' : 'bg-green-forest/30 text-green-400'}`}>
                  {i < step ? '✓' : s.icon}
                </div>
                <span className={`text-sm font-medium ${i === step ? 'text-white' : 'text-gray-400'}`}>{s.label}</span>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>
    </div>
  )
}

export default ImageAnalysisPage
