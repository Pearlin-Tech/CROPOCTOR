import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { IMAGES } from '@/config/images'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

const WelcomePage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-gray-950 select-none"
    >
      {/* Full-Screen High-Resolution Realistic Farm Background */}
      <img
        src={IMAGES.backgrounds.welcome}
        alt="Lush agricultural farm field at sunrise"
        className="absolute inset-0 w-full h-full object-cover object-center"
        loading="eager"
      />

      {/* Subtle Dark Gradient Overlay for Maximum Text Legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/85" />

      {/* Header: Centered Cropoctor Logo */}
      <div className="relative z-10 pt-10 md:pt-12 px-6 flex justify-center">
        <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-md px-5 py-2 rounded-full border border-white/20 shadow-md">
          <span className="text-2xl">🌿</span>
          <span className="text-xl font-bold tracking-tight text-white">Cropoctor</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 max-w-lg mx-auto w-full px-6 pb-10 md:pb-14 flex flex-col items-center text-center">
        {/* Headline & Subtitle */}
        <div className="mb-8 md:mb-10">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight mb-3 drop-shadow-md"
            dangerouslySetInnerHTML={{ __html: t('welcome.headline') }}
          />
          <p className="text-gray-200 text-sm sm:text-base font-medium max-w-md mx-auto leading-relaxed drop-shadow-sm">
            {t('welcome.subheading')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-4">
          <Button
            variant="primary"
            size="xl"
            fullWidth
            onClick={() => navigate('/language')}
            className="bg-[#2E7D32] hover:bg-[#256629] text-white font-semibold text-lg py-4 rounded-xl shadow-lg border border-green-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <span>🌱</span> {t('welcome.cta')}
          </Button>

          <button
            onClick={() => navigate('/login')}
            className="w-full py-2.5 text-center text-white/90 font-semibold text-base hover:text-white transition-colors"
          >
            {t('welcome.signin')}
          </button>

          {/* Language Selector Link */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <Globe className="w-3.5 h-3.5 text-white/60" />
            <button
              onClick={() => navigate('/language')}
              className="text-xs text-white/70 hover:text-white transition-colors"
            >
              English · Português · Русский · 中文 · हिन्दी · + more
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default WelcomePage
