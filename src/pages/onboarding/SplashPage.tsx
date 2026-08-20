import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { splashLeafVariants, splashTextVariants } from '@/animations/variants'

const SplashPage: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => navigate('/welcome'), 3000)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-forest to-[#1b5e20] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Soft glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(102,184,106,0.2),transparent_70%)]" />

      {/* Animated leaf/logo */}
      <motion.div
        variants={splashLeafVariants}
        initial="initial"
        animate="animate"
        className="text-8xl mb-6 select-none"
      >
        🌿
      </motion.div>

      {/* Brand */}
      <motion.div
        variants={splashTextVariants}
        initial="initial"
        animate="animate"
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Agri AI</h1>
        <p className="text-green-pastel text-base font-medium">Smarter decisions for every farm.</p>
      </motion.div>

      {/* Loading dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-16 flex gap-2"
      >
        {[0, 0.2, 0.4].map((delay, i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-green-pastel rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay }}
          />
        ))}
      </motion.div>
    </div>
  )
}

export default SplashPage
