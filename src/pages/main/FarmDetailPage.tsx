import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, RefreshCw, Satellite, Droplets, Thermometer, Info, X } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/index'
import { ProgressBar } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { useFarm } from '@/store/FarmContext'
import { useTranslation } from 'react-i18next'
import { weatherService } from '@/services'
import { cropDoctorService } from '@/services/cropDoctorService'
import { satelliteService, type NDVIResult } from '@/services/satelliteService'
import { calculateFarmHealthScore, type FarmHealth } from '@/services/healthService'
import type { WeatherData, DiagnosisResult } from '@/types'

// ── Health Score Drawer ───────────────────────────────────────────────────────
const HealthDrawer = ({ health, open, onClose }: { health: FarmHealth; open: boolean; onClose: () => void }) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto shadow-2xl"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-gray-800">How is this calculated?</h3>
              <p className="text-xs text-gray-500 mt-0.5">Calculated {new Date(health.calculatedAt).toLocaleTimeString()}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Formula */}
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-5">
            <p className="text-xs font-bold text-green-800 uppercase tracking-wider mb-1">Formula</p>
            <p className="text-sm text-green-900 font-mono">
              Score = Σ(factor_score × weight) / Σ(weights present)
            </p>
            <p className="text-xs text-green-700 mt-1">Missing data is excluded — remaining weights are renormalized.</p>
          </div>

          {/* Factors */}
          <div className="space-y-4">
            {health.factors.map(factor => {
              const colorClass = factor.score >= 80 ? 'bg-green-100 text-green-800' : factor.score >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
              return (
                <div key={factor.name} className="border border-gray-100 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-gray-800">{factor.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">weight: {Math.round(factor.weight * 100)}%</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colorClass}`}>{factor.score}/100</span>
                    </div>
                  </div>
                  <ProgressBar value={factor.score} color={factor.score >= 80 ? 'green' : factor.score >= 60 ? 'warning' : 'danger'} size="sm" />
                  <p className="text-xs text-gray-500 mt-2">{factor.explanation}</p>
                </div>
              )
            })}

            {health.factors.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No factor data available yet. Health score is the default baseline.</p>
            )}
          </div>

          {/* Confidence */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Confidence</p>
              <p className="text-sm font-bold text-gray-800">
                {health.factors.length >= 3 ? '🟢 High' : health.factors.length >= 2 ? '🟡 Medium' : '🔴 Low'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Data sources active</p>
              <p className="text-sm font-bold text-gray-800">{health.factors.length} / 4</p>
            </div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
)

// ── Satellite Data Panel ──────────────────────────────────────────────────────
const SatellitePanel = ({ satellite, loading }: { satellite: NDVIResult | null; loading: boolean }) => {
  if (loading) {
    return (
      <Card padding="md">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-100 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
        </div>
      </Card>
    )
  }

  if (!satellite) return null

  const isUnavailable = satellite.source === 'error' || satellite.ndvi.label === 'Data Unavailable'

  const ndviColor = (v: number) => {
    if (v >= 0.7) return 'text-green-700'
    if (v >= 0.5) return 'text-green-600'
    if (v >= 0.3) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
            <Satellite className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Satellite Data</h3>
            <p className="text-[10px] text-gray-400">{satellite.source === 'error' ? 'Unavailable' : satellite.source || 'Earth Engine'}</p>
          </div>
        </div>
        {isUnavailable ? (
          <Badge variant="warning" size="sm">Unavailable</Badge>
        ) : (
          <Badge variant="green" size="sm">Live</Badge>
        )}
      </div>

      {isUnavailable ? (
        <div className="text-center py-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-500">🛰️ No clear satellite image available</p>
          <p className="text-xs text-gray-400 mt-1">{satellite.errorDetails || 'Cloud cover may be too high. Try again later.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* NDVI */}
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
            <div>
              <p className="text-xs text-gray-500 font-medium">NDVI (Vegetation Index)</p>
              <p className={`text-2xl font-black ${ndviColor(satellite.ndvi.value)}`}>
                {satellite.ndvi.value.toFixed(3)}
              </p>
              <p className="text-xs text-gray-500">{satellite.ndvi.label}</p>
            </div>
            <div className="w-16">
              <ProgressBar value={satellite.ndvi.value * 100} color="green" size="md" />
            </div>
          </div>

          {/* Moisture Index (if present) */}
          {(satellite as any).moisture && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
              <div>
                <p className="text-xs text-gray-500 font-medium">Moisture Index (NDMI)</p>
                <p className="text-lg font-bold text-blue-700">
                  {(satellite as any).moisture.value?.toFixed(3) || 'N/A'}
                </p>
                <p className="text-xs text-gray-500">{(satellite as any).moisture.label || ''}</p>
              </div>
              <Droplets className="w-6 h-6 text-blue-400" />
            </div>
          )}

          {/* Date + Cloud % */}
          <div className="grid grid-cols-2 gap-2">
            {(satellite as any).imageDate && (
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <p className="text-[10px] text-gray-400 font-medium">Image Date</p>
                <p className="text-xs font-bold text-gray-700">{new Date((satellite as any).imageDate).toLocaleDateString()}</p>
              </div>
            )}
            {(satellite as any).cloudPercentage !== undefined && (
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <p className="text-[10px] text-gray-400 font-medium">Cloud Cover</p>
                <p className="text-xs font-bold text-gray-700">{(satellite as any).cloudPercentage}%</p>
              </div>
            )}
          </div>

          {/* Radar fallback note */}
          {(satellite as any).radarFallback && (
            <div className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-100">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-700">
                Using Sentinel-1 radar fallback — no clear optical image in the last {(satellite as any).daysSinceOptical || 'N'} days.
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ── Main FarmDetailPage ───────────────────────────────────────────────────────
const FarmDetailPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { farms, setActiveFarm } = useFarm()
  const { t } = useTranslation()
  const farm = farms.find(f => f.id === id) || null

  const [farmHealth, setFarmHealth] = React.useState<FarmHealth | null>(null)
  const [weather, setWeather] = React.useState<WeatherData | null>(null)
  const [satellite, setSatellite] = React.useState<NDVIResult | null>(null)
  const [diagnosis, setDiagnosis] = React.useState<DiagnosisResult | null>(null)
  const [loadingData, setLoadingData] = React.useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAllData = React.useCallback(async () => {
    if (!farm) return
    setLoadingData(true)
    
    const [w, d, s] = await Promise.all([
      weatherService.getWeather(farm.id, farm).catch(() => null),
      cropDoctorService.getRecentDiagnoses(1, farm.id).then(res => res?.[0] || null).catch(() => null),
      (farm.location?.lat && farm.location?.lng)
        ? satelliteService.getSatelliteData(farm.id, farm.location.lat, farm.location.lng).catch(() => null)
        : Promise.resolve(null)
    ])
    
    if (w) setWeather(w)
    if (d) setDiagnosis(d)
    if (s) setSatellite(s)
    const health = calculateFarmHealthScore(farm, d, s, w)
    setFarmHealth(health)
    setLoadingData(false)
  }, [farm?.id])

  React.useEffect(() => { fetchAllData() }, [fetchAllData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAllData()
    setRefreshing(false)
  }

  const healthScoreVal = farmHealth?.score ?? (farm?.healthScore ?? 82)
  const healthStatus = farmHealth?.status ?? 'Unknown'

  const healthColor = (s: string) => {
    if (s === 'Excellent') return 'bg-green-100 text-green-800'
    if (s === 'Good') return 'bg-emerald-100 text-emerald-800'
    if (s === 'Fair') return 'bg-yellow-100 text-yellow-800'
    if (s === 'At Risk') return 'bg-orange-100 text-orange-800'
    return 'bg-red-100 text-red-800'
  }

  if (!farm) return (
    <div className="p-8 text-center text-gray-500">
      <p className="text-4xl mb-3">🌾</p>
      <p>{t('farm.notFound', 'Farm not found.')}</p>
      <button onClick={() => navigate('/farms')} className="mt-4 text-green-600 font-semibold text-sm hover:underline">← Back to My Farms</button>
    </div>
  )

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader
        title={farm.name}
        subtitle={farm.location.displayName}
        onBack={() => navigate('/farms')}
        action={
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center border border-green-200 hover:bg-green-100 transition-colors disabled:opacity-50"
            title="Refresh all data"
          >
            <RefreshCw className={`w-4 h-4 text-green-700 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        }
      />

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
              {weather?.isDemo && <Badge variant="demo" size="sm">Demo Data</Badge>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ── Health Score ── */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">{t('farm.details.health', 'Farm Health')}</h3>
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-1 text-xs text-green-700 font-semibold hover:underline"
              >
                <Info className="w-3 h-3" />
                How calculated?
              </button>
            </div>
            <div className="flex items-center gap-4 mb-3">
              <div className="relative w-16 h-16 shrink-0">
                <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E8F5E9" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#2E7D32" strokeWidth="3"
                    strokeDasharray={`${healthScoreVal * 0.974} ${100 - healthScoreVal * 0.974}`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-green-forest">{healthScoreVal}%</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{healthScoreVal}<span className="text-lg text-gray-400">/100</span></p>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${healthColor(healthStatus)}`}>{healthStatus}</span>
                {loadingData && <p className="text-[10px] text-gray-400 mt-1">Calculating…</p>}
              </div>
            </div>
            <ProgressBar value={healthScoreVal} color="green" />

            {farmHealth && farmHealth.factors.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Factors Used</p>
                {farmHealth.factors.map(f => (
                  <div key={f.name} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{f.name}</span>
                    <span className="font-bold text-green-forest">{f.score}/100 ({Math.round(f.weight * 100)}%)</span>
                  </div>
                ))}
              </div>
            )}

            {weather?.source && !weather.isDemo && (
              <p className="text-[10px] text-gray-400 mt-3">
                Weather: {weather.source.weather} · Updated {new Date(weather.source.updatedAt).toLocaleTimeString()}
              </p>
            )}
          </Card>

          {/* ── Farm Details ── */}
          <Card padding="md">
            <h3 className="font-bold text-gray-800 mb-3">{t('farm.details.title', 'Farm Details')}</h3>
            <div className="space-y-2">
              {[
                { label: t('farm.location.locationLabel', 'Location'), value: farm.location.displayName || `${farm.location.lat?.toFixed(4)}, ${farm.location.lng?.toFixed(4)}`, icon: '📍' },
                { label: t('farm.location.primaryCrop', 'Crop'), value: farm.primaryCrop, icon: '🌱' },
                { label: t('farm.location.soilTitle', 'Soil'), value: farm.soilType, icon: '🪨' },
                { label: t('farm.location.stageTitle', 'Stage'), value: farm.cropStage, icon: '🌸' },
                { label: t('farm.location.areaLabel', 'Area'), value: `${farm.area} ${t('dashboard.overview.acres', 'acres')}`, icon: '📐' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex items-center gap-2.5 py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-base w-6">{icon}</span>
                  <span className="text-xs text-gray-400 w-16">{label}</span>
                  <span className="text-sm font-semibold text-gray-700 capitalize">{value || '—'}</span>
                </div>
              ))}
            </div>

            {/* Recent Diagnosis */}
            {diagnosis && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2">Latest Diagnosis</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    diagnosis.severity === 'healthy' ? 'bg-green-100 text-green-800' :
                    diagnosis.severity === 'mild' ? 'bg-yellow-100 text-yellow-800' :
                    diagnosis.severity === 'moderate' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>{diagnosis.severity}</span>
                  <span className="text-xs text-gray-600 truncate">{diagnosis.diseaseName}</span>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ── Satellite Data ── */}
        <SatellitePanel satellite={satellite} loading={loadingData} />

        {/* ── Weather Summary ── */}
        {weather && !loadingData && (
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-sky-50 rounded-xl flex items-center justify-center">
                  <Thermometer className="w-4 h-4 text-sky-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Current Weather</h3>
                  <p className="text-[10px] text-gray-400">
                    {weather.isDemo ? '⚠️ Demo data — start server for live weather' : `${weather.source?.weather || 'Open-Meteo'} · ${new Date(weather.updatedAt || '').toLocaleTimeString()}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-gray-800">{weather.temperature}°C</p>
                <p className="text-xs text-gray-500">{weather.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <p className="text-[10px] text-gray-400">Humidity</p>
                <p className="text-sm font-bold text-gray-700">{weather.humidity}%</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <p className="text-[10px] text-gray-400">Rain</p>
                <p className="text-sm font-bold text-gray-700">{weather.rainChance}%</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <p className="text-[10px] text-gray-400">Wind</p>
                <p className="text-sm font-bold text-gray-700">{weather.windSpeed} km/h</p>
              </div>
            </div>
          </Card>
        )}

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

      {/* Health Score Drawer */}
      {farmHealth && <HealthDrawer health={farmHealth} open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
    </motion.div>
  )
}

export default FarmDetailPage
