import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, X, RotateCcw } from 'lucide-react'
import { pageVariants, fadeVariants } from '@/animations/variants'

const STEPS = ['Listening…', 'Understanding your question…', 'Preparing your recommendation…']

const VoicePage: React.FC = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [active, setActive] = useState(false)

  const startListening = () => {
    setActive(true)
    setStep(0)
    const t1 = setTimeout(() => setStep(1), 2000)
    const t2 = setTimeout(() => setStep(2), 4000)
    const t3 = setTimeout(() => { navigate('/advisor') }, 6000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate"
      className="min-h-screen bg-gradient-to-b from-green-forest to-[#1A3B22] flex flex-col items-center justify-center px-6 relative overflow-hidden"
    >
      {/* Background organic shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-green-light/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#8D6245]/20 rounded-full blur-[120px]" />

      <button onClick={() => navigate(-1)} className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors backdrop-blur-md">
        <X className="w-5 h-5 text-white" />
      </button>

      <p className="text-green-pastel text-xs font-bold mb-12 uppercase tracking-[0.2em]">Agri AI Voice</p>

      {/* Microphone button */}
      <div className="relative">
        <motion.button
          onClick={startListening}
          whileTap={{ scale: 0.95 }}
          className="relative z-10 w-36 h-36 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-8 focus:outline-none border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:bg-white/15 transition-colors"
        >
          {active && (
            <>
              <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full border-2 border-green-light/40" />
              <motion.div animate={{ scale: [1, 1.7, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full border-2 border-green-light/20" />
            </>
          )}
          <Mic className={`w-14 h-14 ${active ? 'text-green-pastel' : 'text-white'} transition-colors`} />
        </motion.button>
      </div>

      {/* Waveform animation */}
      {active && (
        <div className="flex items-end gap-1.5 h-16 mb-8">
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1.5 bg-green-light rounded-full"
              animate={{ height: [8, Math.random() * 48 + 8, 8] }}
              transition={{ duration: 0.5 + Math.random() * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.05 }}
            />
          ))}
        </div>
      )}

      {/* Status text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={step}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="text-white text-lg font-medium text-center mb-10"
        >
          {active ? STEPS[step] : 'Tap microphone to speak'}
        </motion.p>
      </AnimatePresence>

      {/* Controls */}
      {active ? (
        <div className="flex gap-4">
          <button onClick={() => navigate(-1)} className="px-6 py-3 bg-white/10 rounded-full text-white text-sm font-medium">Cancel</button>
          <button onClick={() => { setActive(false); setStep(0) }} className="px-6 py-3 bg-white/10 rounded-full text-white text-sm font-medium flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : (
        <p className="text-green-pastel/60 text-xs text-center">Speak in any supported language</p>
      )}
    </motion.div>
  )
}

export default VoicePage
