import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { IMAGES } from '@/config/images'
import { useTranslation } from 'react-i18next'

const WelcomePage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <motion.div
      variants={pageVariants} initial="initial" animate="animate"
      className="min-h-screen flex flex-col bg-cream"
    >
      {/* Hero image */}
      <div className="relative flex-1 min-h-[55vh] overflow-hidden">
        <img
          src={IMAGES.backgrounds.welcome}
          alt="Lush agricultural farm field"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        {/* Soft cream overlay gradient instead of heavy dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-cream via-cream/60 to-black/10" />

        {/* Logo over image */}
        <div className="absolute top-12 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-2 bg-white/70 backdrop-blur-md px-5 py-2.5 rounded-full shadow-sm border border-white/50">
            <span className="text-2xl">🌿</span>
            <span className="text-2xl font-bold text-green-forest">Cropoctor</span>
          </div>
        </div>

        {/* Headline */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-2 drop-shadow-sm" dangerouslySetInnerHTML={{ __html: t('welcome.headline') }}>
          </h1>
          <p className="text-brown-deep font-medium text-base max-w-sm drop-shadow-sm">
            {t('welcome.subheading')}
          </p>
        </div>
      </div>

      {/* CTA section */}
      <div className="px-6 py-8 space-y-4 bg-cream">
        <Button
          variant="primary"
          size="xl"
          fullWidth
          onClick={() => navigate('/language')}
        >
          🌱 {t('welcome.cta')}
        </Button>

        <button
          onClick={() => navigate('/login')}
          className="w-full py-3 text-center text-green-forest font-semibold text-base hover:text-green-soft transition-colors"
        >
          {t('welcome.signin')}
        </button>

        {/* Language hint */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <span className="text-xs text-gray-400">🌐</span>
          <button
            onClick={() => navigate('/language')}
            className="text-xs text-gray-400 hover:text-green-forest transition-colors"
          >
            English · Português · Русский · 中文 · हिन्दी · + more
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default WelcomePage
