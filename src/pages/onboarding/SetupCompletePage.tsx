import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { useUser } from '@/store/UserContext'
import { useTranslation } from 'react-i18next'

const SetupCompletePage: React.FC = () => {
  const navigate = useNavigate()
  const { setOnboarded } = useUser()
  const { t } = useTranslation()

  const handleGoToDashboard = () => {
    setOnboarded(true)
    navigate('/home')
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate"
      className="min-h-screen bg-gradient-to-b from-green-forest to-[#1b5e20] flex flex-col items-center justify-center px-6 text-center"
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 150, delay: 0.2 }}
        className="text-8xl mb-6"
      >
        🌱
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="text-3xl font-bold text-white mb-3"
      >
        {t('farm.complete.title')}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="text-green-pastel text-base mb-10"
      >
        {t('farm.complete.subtitle')}
      </motion.p>

      {/* Summary */}
      <motion.div
        variants={listVariants} animate="animate" initial="initial"
        className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 mb-10 w-full max-w-sm text-left space-y-3"
      >
        {[
          { icon: '🌾', label: 'Farm', value: 'Rajkot Groundnut Farm' },
          { icon: '📍', label: 'Location', value: 'Rajkot, Gujarat' },
          { icon: '🌱', label: 'Crop', value: 'Groundnut' },
          { icon: '🌍', label: 'Area', value: '2.45 acres' },
          { icon: '🪨', label: 'Soil', value: 'Loamy' },
          { icon: '🌸', label: 'Stage', value: 'Flowering' },
        ].map(({ icon, label, value }) => (
          <motion.div key={label} variants={cardVariants} className="flex items-center gap-3">
            <span className="text-xl w-7">{icon}</span>
            <span className="text-green-pastel text-sm flex-1">{label}</span>
            <span className="text-white font-semibold text-sm">{value}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}
        className="w-full max-w-sm"
      >
        <Button variant="secondary" size="xl" fullWidth onClick={handleGoToDashboard}>
          🏠 {t('farm.complete.goToDashboard')}
        </Button>
      </motion.div>
    </motion.div>
  )
}

export default SetupCompletePage
