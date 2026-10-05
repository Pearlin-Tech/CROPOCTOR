import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { useUser } from '@/store/UserContext'
import { useFarmSetup } from '@/store/FarmSetupContext'
import { useFarm } from '@/store/FarmContext'
import { farmService } from '@/services'
import { useTranslation } from 'react-i18next'

const SetupCompletePage: React.FC = () => {
  const navigate = useNavigate()
  const { setOnboarded } = useUser()
  const { setup, reset } = useFarmSetup()
  const { addFarm } = useFarm()
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Snapshot the setup so the summary survives reset() after a successful save
  const [summary] = useState(setup)
  const isComplete = !!(summary.location && summary.farmName.trim() && (summary.cropName || summary.cropId))
  // StrictMode runs mount effects twice in development; this guard makes the write happen once
  const saveStarted = useRef(false)

  const save = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    const farmData = {
      name: summary.farmName.trim(),
      location: {
        lat: summary.location!.lat,
        lng: summary.location!.lng,
        address: summary.location!.name || '',
        displayName: summary.location!.name || '',
        country: ''
      },
      area: summary.area || 0,
      areaUnit: summary.areaUnit || ('acres' as const),
      primaryCrop: summary.cropName || summary.cropId,
      soilType: summary.soilName || summary.soilId || '',
      cropStage: summary.cropStage || '',
      plantingDate: summary.plantingDate || undefined,
      boundary: summary.boundary || [],
    }
    try {
      const created = await farmService.saveFarm(farmData)
      addFarm(created) // the new farm becomes the active farm
      setSaved(true)
      reset()
    } catch (err: any) {
      console.error('[SetupCompletePage] saveFarm failed:', err?.code || err?.message)
      setSaveError(t('farm.complete.saveError', 'Could not save your farm. Check your connection and try again.'))
    } finally {
      setSaving(false)
    }
  }, [summary, reset, t, addFarm])

  useEffect(() => {
    if (!isComplete || saveStarted.current) return
    saveStarted.current = true
    save()
  }, [isComplete, save])

  const handleGoToDashboard = () => {
    setOnboarded(true)
    navigate('/farms')
  }

  const summaryItems = [
    { icon: '🌾', label: t('farm.complete.farm', 'Farm'), value: summary.farmName },
    { icon: '📍', label: t('farm.complete.location', 'Location'), value: summary.location?.name || '' },
    { icon: '🌱', label: t('farm.complete.crop', 'Crop'), value: summary.cropName || summary.cropId },
    { icon: '🌍', label: t('farm.complete.area', 'Area'), value: summary.area ? `${summary.area} ${t(`farm.units.${summary.areaUnit}`, summary.areaUnit)}` : '' },
    { icon: '🪨', label: t('farm.complete.soil', 'Soil'), value: summary.soilName || summary.soilId },
    { icon: '🌸', label: t('farm.complete.stage', 'Stage'), value: summary.cropStage },
  ].filter(i => i.value)

  // Opened directly or after a page refresh: the in-memory setup is gone — never save an empty farm
  if (!isComplete && !saved) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center gap-4">
        <span className="text-6xl" aria-hidden>🗺️</span>
        <h1 className="text-2xl font-bold text-green-forest">{t('farm.complete.incompleteTitle', 'Farm setup was interrupted')}</h1>
        <p className="text-text-secondary max-w-sm">{t('farm.complete.incompleteDesc', 'Some farm details are missing, so nothing was saved. Please start adding the farm again.')}</p>
        <div className="w-full max-w-sm">
          <Button variant="primary" size="lg" fullWidth onClick={() => navigate('/onboarding/location', { replace: true })}>
            {t('farm.complete.restart', 'Start again')}
          </Button>
        </div>
      </div>
    )
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
        {saving ? '⏳' : saveError ? '❌' : '🌱'}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="text-3xl font-bold text-white mb-3"
      >
        {saving ? t('farm.complete.saving', 'Saving your farm…') : saveError ? t('farm.complete.saveFailedTitle', 'Could not save farm') : t('farm.complete.title')}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="text-green-pastel text-base mb-10"
      >
        {saving ? t('farm.complete.savingDesc', 'This only takes a moment.')
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
            <span className="text-white font-semibold text-sm text-right break-words min-w-0">{value}</span>
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
          disabled={saving || !saved}
        >
          {saving ? `⏳ ${t('farm.complete.saving', 'Saving your farm…')}` : '🏠 ' + t('farm.complete.goToDashboard')}
        </Button>

        {saveError && (
          <Button variant="outline" size="lg" fullWidth onClick={save} className="bg-white/10 text-white border-white/40">
            {t('common.retry', 'Retry')}
          </Button>
        )}
      </motion.div>
    </motion.div>
  )
}

export default SetupCompletePage

