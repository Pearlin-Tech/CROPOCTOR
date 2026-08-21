import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/index'
import { ProgressBar } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { useFarm } from '@/store/FarmContext'
import { useNavigate as useNav } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const FarmDetailPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { farms, setActiveFarm } = useFarm()
  const { t } = useTranslation()
  const farm = farms.find(f => f.id === id) || farms[0]

  if (!farm) return <div className="p-8 text-center text-gray-500">{t('farm.notFound', 'Farm not found.')}</div>

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title={farm.name} subtitle={farm.location.displayName} onBack={() => navigate('/farms')} />

      <PageLayout className="pt-4 pb-8 space-y-4">
        {/* Hero */}
        <div className="relative rounded-3xl overflow-hidden h-48 md:h-64">
          <img src={farm.imageUrl} alt={farm.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="hidden lg:block text-2xl font-bold text-white mb-1">{farm.name}</h1>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="green" size="sm">🌱 {farm.primaryCrop}</Badge>
              <Badge variant="earth" size="sm">📐 {farm.area} acres</Badge>
              <Badge variant="gray" size="sm">🌸 {farm.cropStage}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Health */}
          <Card padding="md">
            <h3 className="font-bold text-gray-800 mb-3">{t('farm.details.health', 'Farm Health')}</h3>
            <div className="flex items-center gap-4 mb-3">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E8F5E9" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#2E7D32" strokeWidth="3"
                    strokeDasharray={`${farm.healthScore * 0.974} ${100 - farm.healthScore * 0.974}`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-green-forest">{farm.healthScore}%</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{farm.healthScore}<span className="text-lg text-gray-400">/100</span></p>
                <Badge variant="green" dot>{t('farm.details.healthy', 'Looking Healthy')}</Badge>
              </div>
            </div>
            <ProgressBar value={farm.healthScore} color="green" />
          </Card>

          {/* Details */}
          <Card padding="md">
            <h3 className="font-bold text-gray-800 mb-3">{t('farm.details.title', 'Farm Details')}</h3>
            <div className="space-y-2">
              {[
                { label: t('farm.location.locationLabel', 'Location'), value: farm.location.displayName, icon: '📍' },
                { label: t('farm.location.primaryCrop', 'Crop'), value: farm.primaryCrop, icon: '🌱' },
                { label: t('farm.location.soilTitle', 'Soil'), value: farm.soilType, icon: '🪨' },
                { label: t('farm.location.stageTitle', 'Stage'), value: farm.cropStage, icon: '🌸' },
                { label: t('farm.location.areaLabel', 'Area'), value: `${farm.area} ${t('dashboard.overview.acres', 'acres')}`, icon: '📐' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex items-center gap-2.5 py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-base w-6">{icon}</span>
                  <span className="text-xs text-gray-400 w-16">{label}</span>
                  <span className="text-sm font-semibold text-gray-700 capitalize">{value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="primary" onClick={() => navigate('/advisor')}>{t('dashboard.actions.askAdvisor', 'Ask AI Advisor')}</Button>
          <Button variant="secondary" onClick={() => navigate('/diagnose')}>{t('dashboard.actions.diagnose', 'Diagnose Crop')}</Button>
          <Button variant="outline" onClick={() => navigate('/weather')}>{t('nav.weather', 'View Weather')}</Button>
          <Button variant="outline" onClick={() => navigate('/insights')}>{t('nav.insights', 'View Insights')}</Button>
        </div>

        <Button variant="ghost" fullWidth onClick={() => { setActiveFarm(farm); navigate('/home') }}>
          {t('farm.details.setActive', 'Set as Active Farm')}
        </Button>
      </PageLayout>
    </motion.div>
  )
}

export default FarmDetailPage
