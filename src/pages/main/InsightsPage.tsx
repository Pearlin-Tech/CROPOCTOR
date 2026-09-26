import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/index'
import { ProgressBar } from '@/components/ui/index'
import { Chip } from '@/components/ui/index'
import { InsightSkeleton } from '@/components/skeletons'
import { insightsService } from '@/services'
import { useFarm } from '@/store/FarmContext'
import { useApp } from '@/store/AppContext'
import { IMAGES } from '@/config/images'
import type { FarmInsights } from '@/types'
import { useTranslation } from 'react-i18next'
import { formatNumbersInText, formatNumber } from '@/utils/formatters'

const InsightsPage: React.FC = () => {
  const { activeFarm } = useFarm()
  const { language } = useApp()
  const { t } = useTranslation()
  const [insights, setInsights] = useState<FarmInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'crop' | 'soil' | 'satellite'>('crop')

  useEffect(() => {
    insightsService.getInsights(activeFarm?.id || '').then(d => { setInsights(d); setLoading(false) })
  }, [activeFarm])

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title={t('nav.insights')} />
      <PageLayout className="pt-4 pb-8 space-y-4">
        <div className="hidden lg:block mb-4">
          <h1 className="text-2xl font-bold text-green-forest tracking-tight">{t('nav.insights')}</h1>
          <p className="text-sm text-brown-earth/80 font-medium">{t('insights.subtitle', 'Crop health, soil moisture, and satellite metrics.')}</p>
        </div>

        <div className="flex gap-2">
          <Chip selected={tab === 'crop'} onClick={() => setTab('crop')}>{t('insights.cropHealth', 'Crop Health')}</Chip>
          <Chip selected={tab === 'soil'} onClick={() => setTab('soil')}>{t('insights.soilHealth', 'Soil Health')}</Chip>
          <Chip selected={tab === 'satellite'} onClick={() => setTab('satellite')}>{t('insights.satellite', 'Satellite')}</Chip>
        </div>

        {loading ? <InsightSkeleton /> : insights && (
          <>
            {tab === 'crop' && (
              <div className="space-y-4">
                <Card padding="md" className="bg-cream border-brown-pastel/40 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-brown-earth/80 font-bold mb-0.5">{t('insights.cropHealthScore', 'Crop Health Score')}</p>
                      <h2 className="text-4xl font-bold text-green-forest">{formatNumber(insights.cropHealth.score, language)}<span className="text-xl text-brown-earth/60">/{formatNumber(100, language)}</span></h2>
                      <Badge variant="green" dot className="mt-1">
                        {insights.cropHealth.trend === 'up' ? t('insights.trend.improving', '↑ Improving') : insights.cropHealth.trend === 'down' ? t('insights.trend.declining', '↓ Declining') : t('insights.trend.stable', '→ Stable')}
                      </Badge>
                    </div>
                    <div className="text-5xl">💚</div>
                  </div>
                  <ProgressBar value={insights.cropHealth.score} color="green" size="md" />
                  <div className="mt-4 pt-4 border-t border-brown-pastel/20">
                    <p className="text-[10px] font-bold text-brown-earth uppercase tracking-widest mb-2">{t('insights.contributingFactors', 'Contributing Factors')}</p>
                    <div className="space-y-2">
                      {insights.cropHealth.factors.map((f: string) => (
                        <div key={f} className="flex items-center gap-2.5 text-sm text-text-main font-medium">
                          <span className="text-green-forest shrink-0">✓</span>{formatNumbersInText(t(`insights.factors.${f}`, f), language)}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {tab === 'soil' && (
              <div className="space-y-4">
                <Card padding="md" className="bg-cream border-brown-pastel/40 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-brown-earth/80 font-bold mb-0.5">{t('insights.soilHealthScore', 'Soil Health Score')}</p>
                      <h2 className="text-4xl font-bold text-brown-deep">{formatNumber(insights.soilHealth.score, language)}<span className="text-xl text-brown-earth/60">/{formatNumber(100, language)}</span></h2>
                      <Badge variant="earth" className="mt-1">{t('insights.moisture', 'Moisture')}: {t(`insights.moistureValue.${insights.soilHealth.moisture}`, insights.soilHealth.moisture)}</Badge>
                    </div>
                    <div className="text-5xl">🪨</div>
                  </div>
                  <ProgressBar value={insights.soilHealth.score} color="earth" size="md" />
                  <div className="mt-4 p-3 bg-white border border-brown-pastel/30 rounded-xl shadow-sm">
                    <p className="text-[10px] font-bold text-brown-earth uppercase tracking-widest mb-1">{t('insights.nutrientStatus', 'Nutrient Status')}</p>
                    <p className="text-sm text-text-main font-medium">{formatNumbersInText(t('insights.nutrientsText', insights.soilHealth.nutrients), language)}</p>
                  </div>
                </Card>
              </div>
            )}

            {tab === 'satellite' && (
              <div className="space-y-4">
                <Card padding="none" className="overflow-hidden bg-cream border-brown-pastel/40 shadow-sm">
                  <div className="relative">
                    <img src={IMAGES.farms.satellite} alt="Satellite farm view" className="w-full h-64 object-cover" />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <Badge variant="demo">{t('dashboard.demoData', 'Demo Data')}</Badge>
                    </div>
                    {/* NDVI overlay legend */}
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl p-2 border border-brown-pastel/30 shadow-sm">
                      <div className="flex items-center gap-4">
                        {[['#ff4444','Poor'],['#ffaa00','Fair'],['#44aa44','Good'],['#006600','Excellent']].map(([color, label]) => (
                          <div key={label} className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full shadow-inner" style={{backgroundColor: color}} />
                            <span className="text-text-main text-[10px] font-bold uppercase tracking-wider">{t(`insights.${label.toLowerCase()}`, label)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-widest text-brown-earth/80 font-bold mb-0.5">{t('insights.ndviIndex', 'NDVI Index')}</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-green-forest">{formatNumber(insights.ndvi.value, language)}</p>
                          <Badge variant="green" dot>{t(`insights.goodVegetation`, insights.ndvi.label)}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-brown-earth uppercase tracking-widest mb-1.5">{t('insights.range', 'Range')}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-text-secondary font-medium">{t('insights.poor', 'Poor')}</span>
                          <div className="w-24 h-2 rounded-full" style={{background: 'linear-gradient(to right, #ff4444, #ffaa00, #44aa44, #006600)'}} />
                          <span className="text-xs text-text-secondary font-medium">{t('insights.excellent', 'Excellent')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
                {insights.isDemo && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-sm">
                    <span>🛰️</span>
                    <p className="text-xs text-amber-700 font-medium">{formatNumbersInText(t('insights.demoNotice', 'Satellite data shown is demo. Live Earth Engine data will be connected in Stage 4.'), language)}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </PageLayout>
    </motion.div>
  )
}

export default InsightsPage
