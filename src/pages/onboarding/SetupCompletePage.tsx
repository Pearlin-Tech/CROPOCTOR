import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { useUser } from '@/store/UserContext'
import { useFarmSetup } from '@/store/FarmSetupContext'
import { farmService } from '@/services'
import { useTranslation } from 'react-i18next'

const SetupCompletePage: React.FC = () => {
  const navigate = useNavigate()
  const { setOnboarded } = useUser()
  const { setup, reset } = useFarmSetup()
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Save the farm to Firestore as soon as this page mounts
  useEffect(() => {
    const save = async () => {
      setSaving(true)
      setSaveError(null)

      const farmData = {
        name: setup.farmName || '',
        location: {
          lat: setup.location?.lat || 0,
          lng: setup.location?.lng || 0,
          address: setup.location?.name || '',
          displayName: setup.location?.name || '',
          country: ''
        },
        area: setup.area || 0,
        areaUnit: setup.areaUnit || 'acres' as const,
        primaryCrop: setup.cropName || setup.cropId || '',
        soilType: setup.soilName || setup.soilId || '',
        cropStage: setup.cropStage || '',
        plantingDate: setup.plantingDate || undefined,
        healthScore: 100,
        boundary: setup.boundary || [],
      }

      console.log('🌱 [SetupCompletePage] Calling saveFarm with data:', farmData)

      try {
        const saved = await farmService.saveFarm(farmData)
        console.log('✅ [SetupCompletePage] Farm saved! Firestore doc ID:', saved.id)
        setSaved(true)
        reset() // clear setup state
      } catch (err: any) {
        console.error('❌ [SetupCompletePage] saveFarm FAILED')
        console.error('❌ error.code:', err.code)
        console.error('❌ error.message:', err.message)
        setSaveError(err.message || 'Failed to save farm. Please try again.')
      } finally {
        setSaving(false)
      }
    }

    save()
  }, [])

  const handleGoToDashboard = () => {
    setOnboarded(true)
    navigate('/farms')
  }

  const summaryItems = [
    { icon: '🌾', label: 'Farm', value: setup.farmName || '' },
    { icon: '📍', label: 'Location', value: setup.location?.name || '' },
    { icon: '🌱', label: 'Crop', value: setup.cropName || setup.cropId || '' },
    { icon: '🌍', label: 'Area', value: `${setup.area || 0} ${setup.areaUnit || 'acres'}` },
    { icon: '🪨', label: 'Soil', value: setup.soilName || setup.soilId || '' },
    { icon: '🌸', label: 'Stage', value: setup.cropStage || '' },
  ]

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
        {saving ? '⏳' : saveError ? '❌' : '🌱'}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="text-3xl font-bold text-white mb-3"
      >
        {saving ? 'Saving your farm…' : saveError ? 'Could not save farm' : t('farm.complete.title')}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="text-green-pastel text-base mb-10"
      >
        {saving ? 'Creating your farm in Firestore…'
          : saveError ? saveError
          : t('farm.complete.subtitle')}
      </motion.p>

      {/* Summary */}
      <motion.div
        variants={listVariants} animate="animate" initial="initial"
        className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 mb-10 w-full max-w-sm text-left space-y-3"
      >
        {summaryItems.map(({ icon, label, value }) => (
          <motion.div key={label} variants={cardVariants} className="flex items-center gap-3">
            <span className="text-xl w-7">{icon}</span>
            <span className="text-green-pastel text-sm flex-1">{label}</span>
            <span className="text-white font-semibold text-sm">{value}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}
        className="w-full max-w-sm space-y-3"
      >
        <Button
          variant="secondary" size="xl" fullWidth
          onClick={handleGoToDashboard}
          disabled={saving}
        >
          {saving ? '⏳ Saving…' : '🏠 ' + t('farm.complete.goToDashboard')}
        </Button>

        {saveError && (
          <button
            className="text-white/70 text-sm underline"
            onClick={() => navigate(-1)}
          >
            ← Go back and try again
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}

export default SetupCompletePage

