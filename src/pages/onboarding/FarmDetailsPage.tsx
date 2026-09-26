import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useTranslation } from 'react-i18next'

const FarmDetailsPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-cream flex flex-col max-w-md mx-auto w-full px-6 py-10">
      <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-light text-green-forest mb-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <div className="flex gap-1.5 mb-6">
        {[1,2,3].map(s => <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= 3 ? 'bg-green-forest' : 'bg-gray-200'}`} />)}
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">{t('farm.details.title', 'Farm Details')}</h1>
      <p className="text-gray-500 text-sm mb-8">{t('farm.details.subtitle', 'Complete your farm setup.')}</p>

      <div className="space-y-4 flex-1">
        <Input label={t('farm.details.name', 'Farm name')} placeholder={t('farm.details.namePlaceholder', 'e.g. Rajkot Groundnut Farm')} defaultValue="Rajkot Groundnut Farm" />
        <Input label={t('farm.context.location', 'Location')} defaultValue="Rajkot, Gujarat, India" disabled hint={t('farm.location.subtitle', 'Find your farm on the map and drop a pin.')} />
        <Input label={t('farm.details.area', 'Area')} defaultValue="2.45 acres" disabled />
      </div>

      <div className="mt-10 space-y-3">
        <Button variant="primary" size="xl" fullWidth onClick={() => navigate('/onboarding/crop')}>
          {t('farm.details.save', 'Save Farm')} →
        </Button>
      </div>
    </motion.div>
  )
}

export default FarmDetailsPage
