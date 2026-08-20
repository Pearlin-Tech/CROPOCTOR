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
import type { FarmInsights } from '@/types'
import { useFarm } from '@/store/FarmContext'
import { IMAGES } from '@/config/images'

const InsightsPage: React.FC = () => {
  const { activeFarm } = useFarm()
  const [insights, setInsights] = useState<FarmInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'crop' | 'soil' | 'satellite'>('crop')

  useEffect(() => {
    insightsService.getInsights(activeFarm?.id || '').then(d => { setInsights(d); setLoading(false) })
  }, [activeFarm])

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title="Farm Insights" />
      <PageLayout className="pt-4 pb-8 space-y-4">
        <div className="hidden lg:block mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Farm Insights</h1>
          <p className="text-sm text-gray-500">Crop health, soil health, and satellite intelligence.</p>
        </div>

        <div className="flex gap-2">
          <Chip selected={tab === 'crop'} onClick={() => setTab('crop')}>Crop Health</Chip>
          <Chip selected={tab === 'soil'} onClick={() => setTab('soil')}>Soil Health</Chip>
          <Chip selected={tab === 'satellite'} onClick={() => setTab('satellite')}>Satellite</Chip>
        </div>

        {loading ? <InsightSkeleton /> : insights && (
          <>
            {tab === 'crop' && (
              <div className="space-y-4">
                <Card padding="md">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Crop Health Score</p>
                      <h2 className="text-4xl font-bold text-gray-800">{insights.cropHealth.score}<span className="text-xl text-gray-400">/100</span></h2>
                      <Badge variant="green" dot className="mt-1">
                        {insights.cropHealth.trend === 'up' ? '↑ Improving' : insights.cropHealth.trend === 'down' ? '↓ Declining' : '→ Stable'}
                      </Badge>
                    </div>
                    <div className="text-5xl">💚</div>
                  </div>
                  <ProgressBar value={insights.cropHealth.score} color="green" size="md" />
                  <div className="mt-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contributing Factors</p>
                    <div className="space-y-1.5">
                      {insights.cropHealth.factors.map(f => (
                        <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="text-green-forest">✓</span>{f}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {tab === 'soil' && (
              <div className="space-y-4">
                <Card padding="md">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Soil Health Score</p>
                      <h2 className="text-4xl font-bold text-gray-800">{insights.soilHealth.score}<span className="text-xl text-gray-400">/100</span></h2>
                      <Badge variant="earth" className="mt-1">Moisture: {insights.soilHealth.moisture}</Badge>
                    </div>
                    <div className="text-5xl">🪨</div>
                  </div>
                  <ProgressBar value={insights.soilHealth.score} color="earth" size="md" />
                  <div className="mt-4 p-3 bg-beige-warm rounded-xl">
                    <p className="text-xs font-bold text-brown-earth mb-1">Nutrient Status</p>
                    <p className="text-sm text-gray-700">{insights.soilHealth.nutrients}</p>
                  </div>
                </Card>
              </div>
            )}

            {tab === 'satellite' && (
              <div className="space-y-4">
                <Card padding="none" className="overflow-hidden">
                  <div className="relative">
                    <img src={IMAGES.farms.satellite} alt="Satellite farm view" className="w-full h-64 object-cover" />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <Badge variant="demo">Demo Data</Badge>
                    </div>
                    {/* NDVI overlay legend */}
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded-xl p-2">
                      <div className="flex items-center gap-4">
                        {[['#ff4444','Poor'],['#ffaa00','Fair'],['#44aa44','Good'],['#006600','Excellent']].map(([color, label]) => (
                          <div key={label} className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full" style={{backgroundColor: color}} />
                            <span className="text-white text-xs">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">NDVI Index</p>
                        <p className="text-3xl font-bold text-green-forest">{insights.ndvi.value}</p>
                        <Badge variant="green" dot>{insights.ndvi.label}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Range</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">Poor</span>
                          <div className="w-24 h-2 rounded-full" style={{background: 'linear-gradient(to right, #ff4444, #ffaa00, #44aa44, #006600)'}} />
                          <span className="text-xs text-gray-500">Excellent</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
                {insights.isDemo && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <span>🛰️</span>
                    <p className="text-xs text-amber-700">Satellite data shown is demo. Live Earth Engine data will be connected in Stage 4.</p>
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
