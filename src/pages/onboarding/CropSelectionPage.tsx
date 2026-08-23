import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { CROPS } from '@/config/crops'
import { useTranslation } from 'react-i18next'
import { useFarmSetup } from '@/store/FarmSetupContext'

const CropSelectionPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { setCrop } = useFarmSetup()
  const [cropId, setCropId] = useState('groundnut')

  const cropOptions = CROPS.map(c => ({ id: c.id, name: c.name, category: c.category }))

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-cream flex flex-col max-w-md mx-auto w-full px-6 py-10">
      <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-pastel/30 text-green-forest mb-6 shadow-sm hover:bg-green-pastel/50 transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 className="text-2xl font-bold text-green-forest mb-1">{t('farm.location.cropTitle', 'Select Your Crop')}</h1>
      <p className="text-text-secondary text-sm mb-8 font-medium">{t('farm.location.cropSubtitle', 'Choose the primary crop for this farm.')}</p>

      <div className="flex-1">
        <SearchableSelect
          label={t('farm.location.primaryCrop', 'Primary Crop')}
          required
          options={cropOptions}
          value={cropId}
          onChange={setCropId}
          placeholder={t('farm.location.selectCrop', 'Select Crop')}
          searchPlaceholder={t('farm.location.searchCrops', 'Search crops...')}
          grouped
        />

        {cropId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-5 p-4 bg-green-pastel/20 rounded-2xl border border-green-pastel/40 shadow-sm relative overflow-hidden"
          >
            <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-green-pastel/30 rounded-full blur-[20px]" />
            <div className="relative z-10">
              <p className="text-sm font-bold text-green-forest flex items-center gap-1.5">
                <span className="text-lg">🌱</span> {CROPS.find(c => c.id === cropId)?.name} {t('farm.location.selected', 'selected')}
              </p>
              <p className="text-xs text-text-secondary mt-1 font-medium">
                {t('farm.location.category', 'Category')}: {CROPS.find(c => c.id === cropId)?.category}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="mt-10">
        <Button variant="primary" size="xl" fullWidth onClick={() => {
          const crop = CROPS.find(c => c.id === cropId)
          setCrop(cropId, crop?.name || cropId)
          navigate('/onboarding/soil')
        }} disabled={!cropId}>
          {t('country.continue')} →
        </Button>
      </div>
    </motion.div>
  )
}

export default CropSelectionPage
