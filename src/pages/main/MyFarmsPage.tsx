import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/index'
import { ProgressBar } from '@/components/ui/index'
import { FarmCardSkeleton } from '@/components/skeletons'
import { useFarm } from '@/store/FarmContext'
import { useTranslation } from 'react-i18next'
import { formatLocalizedNumber, formatLocalizedPercent } from '@/utils/format'

const MyFarmsPage: React.FC = () => {
  const navigate = useNavigate()
  const { farms, activeFarm, setActiveFarm } = useFarm()
  const { t, i18n } = useTranslation()

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title={t('nav.myFarm')} action={
        <button onClick={() => navigate('/onboarding/location')} className="w-9 h-9 bg-green-forest rounded-full flex items-center justify-center shadow-button">
          <Plus className="w-5 h-5 text-white" />
        </button>
      } />

      <PageLayout className="pt-4 pb-8 space-y-4">
        <div className="hidden lg:flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t('nav.myFarm', 'My Farms')}</h1>
            <p className="text-sm text-gray-500">{formatLocalizedNumber(t('profile.farmsRegistered', { count: farms.length }), i18n.language)}</p>
          </div>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/onboarding/location')}>
            {t('farm.addNew')}
          </Button>
        </div>

        <motion.div variants={listVariants} animate="animate" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {farms.map(farm => (
            <motion.div key={farm.id} variants={cardVariants}>
              <button
                onClick={() => { setActiveFarm(farm); navigate(`/farms/${farm.id}`) }}
                className="w-full text-left"
              >
                <Card padding="none" className={`overflow-hidden transition-all hover:shadow-card-lg ${activeFarm?.id === farm.id ? 'ring-2 ring-green-forest' : ''}`}>
                  <div className="relative h-40">
                    <img src={farm.imageUrl} alt={farm.name} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-hero" />
                    {activeFarm?.id === farm.id && (
                      <div className="absolute top-3 left-3">
                        <Badge variant="green" size="sm">{t('farm.details.setActive', 'Active Farm')}</Badge>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="font-bold text-white text-lg leading-tight">{t(`farms.${farm.id}.name`, farm.name)}</h3>
                      <p className="text-white/80 text-xs">{t(`locations.${farm.location.displayName}`, farm.location.displayName)}</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <Badge variant="green" size="sm">🌱 {t(`crops.${farm.primaryCrop}`, farm.primaryCrop)}</Badge>
                      <Badge variant="earth" size="sm">📐 {formatLocalizedNumber(farm.area, i18n.language)} {t('units.acres', 'acres')}</Badge>
                      <Badge variant="gray" size="sm">🌸 {t(`stages.${farm.cropStage}`, farm.cropStage)}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={farm.healthScore} color="green" size="sm" />
                      <span className="text-xs font-bold text-green-forest shrink-0">{formatLocalizedPercent(farm.healthScore, i18n.language)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{t('farm.health')}</p>
                  </div>
                </Card>
              </button>
            </motion.div>
          ))}

          {/* Add farm card */}
          <motion.div variants={cardVariants}>
            <button
              onClick={() => navigate('/onboarding/location')}
              className="w-full h-full min-h-[240px] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-green-pastel rounded-2xl text-green-forest hover:border-green-forest hover:bg-green-light/30 transition-all p-6"
            >
              <div className="w-14 h-14 bg-green-light rounded-full flex items-center justify-center">
                <Plus className="w-7 h-7" />
              </div>
              <p className="font-semibold">{t('farm.addNew')}</p>
              <p className="text-xs text-gray-400 text-center">{t('farm.addAnotherHint', 'Add another farm to get personalized insights.')}</p>
            </button>
          </motion.div>
        </motion.div>
      </PageLayout>
    </motion.div>
  )
}

export default MyFarmsPage
