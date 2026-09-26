import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { CROP_STAGES } from '@/config/soils'
import { Input } from '@/components/ui/Input'
import { useTranslation } from 'react-i18next'

const CropStagePage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [stage, setStage] = useState('flowering')
  const [date, setDate]   = useState('')
  const stageOptions = CROP_STAGES.map(s => ({ id: s.id, name: s.name }))

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-cream flex flex-col max-w-md mx-auto w-full px-6 py-10">
      <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-light text-green-forest mb-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">{t('farm.stage.title', 'Crop Stage')}</h1>
      <p className="text-gray-500 text-sm mb-8">{t('farm.stage.subtitle', 'What stage is your crop at?')}</p>

      <div className="flex-1 space-y-5">
        <SearchableSelect
          label={t('farm.stage.title', 'Crop Stage')}
          options={stageOptions.map(s => ({ ...s, name: t(`stages.${s.id}`, s.name) }))}
          value={stage}
          onChange={setStage}
          placeholder={t('farm.stage.select', 'Select Crop Stage')}
          searchPlaceholder={t('farm.crop.search', 'Search...')}
        />
        <Input
          label={t('farm.stage.plantingDate', 'When did you plant?')}
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      <div className="mt-10">
        <Button variant="primary" size="xl" fullWidth onClick={() => navigate('/onboarding/complete')}>
          {t('language.continue', 'Continue')} →
        </Button>
      </div>
    </motion.div>
  )
}

export default CropStagePage
