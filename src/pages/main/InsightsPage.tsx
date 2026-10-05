import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { pageVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Badge, ProgressBar, Chip } from '@/components/ui/index'
import { InsightSkeleton } from '@/components/skeletons'
import { weatherService } from '@/services'
import { satelliteService, type NDVIResult } from '@/services/satelliteService'
import { cropDoctorService } from '@/services/cropDoctorService'
import { calculateFarmHealthScore, type FarmHealth } from '@/services/healthService'
import { useLocalizedLabels } from '@/services/translationClient'
import { isFallbackRecord } from '@/utils/diagnosis'
import { useFarm } from '@/store/FarmContext'
import type { DiagnosisResult, WeatherData } from '@/types'
import { useTranslation } from 'react-i18next'

type Tab = 'crop' | 'soil' | 'satellite'

interface InsightSources {
  diagnosis: DiagnosisResult | null
  weather: WeatherData | null
  satellite: NDVIResult | null
}

/** Where a number comes from — shown next to every metric. */
const SourceTag: React.FC<{ kind: 'measured' | 'estimated' | 'diagnosis' | 'unavailable' }> = ({ kind }) => {
  const { t } = useTranslation()
  const styles = {
    measured: 'bg-green-50 text-green-800 border-green-200',
    estimated: 'bg-sky-50 text-sky-800 border-sky-200',
    diagnosis: 'bg-amber-50 text-amber-800 border-amber-200',
    unavailable: 'bg-gray-50 text-gray-600 border-gray-200'
  }[kind]
  const label = {
    measured: t('insights.source.measured', 'Measured'),
    estimated: t('insights.source.estimated', 'Estimated'),
    diagnosis: t('insights.source.diagnosis', 'From your diagnosis'),
    unavailable: t('insights.source.unavailable', 'Unavailable')
  }[kind]
  return <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${styles}`}>{label}</span>
}

const FACTOR_KIND: Record<string, 'measured' | 'estimated' | 'diagnosis'> = {
  'Crop Diagnosis': 'diagnosis',
  'Satellite NDVI': 'measured',
  'Weather Stress': 'estimated'
}

const InsightsPage: React.FC = () => {
  const { activeFarm } = useFarm()
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState<Tab>('crop')
  const [loading, setLoading] = useState(true)
  const [sources, setSources] = useState<InsightSources>({ diagnosis: null, weather: null, satellite: null })

  useEffect(() => {
    if (!activeFarm) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    const hasLocation = typeof activeFarm.location?.lat === 'number' && typeof activeFarm.location?.lng === 'number' &&
      !(activeFarm.location.lat === 0 && activeFarm.location.lng === 0)
    Promise.all([
      cropDoctorService.getRecentDiagnoses(1, activeFarm.id).then(r => r?.[0] || null).catch(() => null),
      weatherService.getWeather(activeFarm.id, activeFarm).catch(() => null),
      hasLocation
        ? satelliteService.getSatelliteData(activeFarm.id, activeFarm.location.lat, activeFarm.location.lng, activeFarm.boundary).catch(() => null)
        : Promise.resolve(null)
    ]).then(([diagnosis, weather, satellite]) => {
      if (cancelled) return
      setSources({
        diagnosis: diagnosis && !isFallbackRecord(diagnosis) ? diagnosis : null,
        weather: weather && !weather.isDemo ? weather : null,
        satellite
      })
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [activeFarm?.id, activeFarm?.location?.lat, activeFarm?.location?.lng])

  const satelliteOk = sources.satellite?.source === 'earth-engine' && typeof sources.satellite.ndvi?.value === 'number'
  const health: FarmHealth = calculateFarmHealthScore(activeFarm, sources.diagnosis, satelliteOk ? sources.satellite : null, sources.weather)

  // Factor explanations are generated in English — translate them for display
  const explanations = useLocalizedLabels(
    Object.fromEntries(health.factors.map(f => [f.name, f.explanation])),
    i18n.language
  )

  const missing: string[] = []
  if (!sources.diagnosis) missing.push(t('insights.missing.diagnosis', 'No crop diagnosis for this farm yet — use Crop Doctor to add one.'))
  if (!satelliteOk) missing.push(t('insights.missing.satellite', 'Satellite vegetation data is unavailable.'))
  if (!sources.weather) missing.push(t('insights.missing.weather', 'Live weather is unavailable.'))

  const soilMoisture = sources.weather?.soilMoisture
  const moistureLabel = sources.weather?.soilMoistureStatus && sources.weather.soilMoistureStatus !== 'UNAVAILABLE'
    ? t(`insights.moisture.${sources.weather.soilMoistureStatus}`, sources.weather.soilMoistureStatus)
    : null

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title={t('nav.insights')} />
      <PageLayout className="pt-4 pb-8 space-y-4">
        <div className="hidden lg:block mb-4">
          <h1 className="text-2xl font-bold text-green-forest tracking-tight">{t('nav.insights')}</h1>
          <p className="text-sm text-brown-earth/80 font-medium">{t('insights.subtitle', 'Crop health, soil moisture, and satellite metrics.')}</p>
        </div>

        {!activeFarm ? (
          <Card padding="md" className="text-center text-sm text-text-secondary">{t('insights.noFarm', 'Add or select a farm to see insights.')}</Card>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1" role="tablist">
              <Chip selected={tab === 'crop'} onClick={() => setTab('crop')}>{t('insights.cropHealth', 'Crop Health')}</Chip>
              <Chip selected={tab === 'soil'} onClick={() => setTab('soil')}>{t('insights.soilHealth', 'Soil Health')}</Chip>
              <Chip selected={tab === 'satellite'} onClick={() => setTab('satellite')}>{t('insights.satellite', 'Satellite')}</Chip>
            </div>

            {loading ? <InsightSkeleton /> : (
              <>
                {tab === 'crop' && (
                  <Card padding="md" className="bg-cream border-brown-pastel/40 shadow-sm space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-widest text-brown-earth/80 font-bold mb-0.5">{t('insights.cropHealth', 'Crop Health')} {t('insights.score', 'Score')}</p>
                        {health.score === null ? (
                          <h2 className="text-2xl font-bold text-gray-500">{t('health.status.Unknown', 'No data yet')}</h2>
                        ) : (
                          <>
                            <h2 className="text-4xl font-bold text-green-forest">{health.score}<span className="text-xl text-brown-earth/60">/100</span></h2>
                            <Badge variant={health.score >= 75 ? 'green' : health.score >= 40 ? 'warning' : 'danger'} dot className="mt-1">
                              {t(`health.status.${health.status}`, health.status)}
                            </Badge>
                          </>
                        )}
                      </div>
                      <div className="text-5xl shrink-0" aria-hidden>💚</div>
                    </div>
                    {health.score !== null && <ProgressBar value={health.score} color="green" size="md" />}

                    {health.factors.length > 0 && (
                      <div className="pt-4 border-t border-brown-pastel/20">
                        <p className="text-[10px] font-bold text-brown-earth uppercase tracking-widest mb-2">{t('insights.contributingFactors', 'Contributing Factors')}</p>
                        <ul className="space-y-3">
                          {health.factors.map(f => (
                            <li key={f.name} className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-text-main">{t(`health.factor.${f.name}`, f.name)}</span>
                                <SourceTag kind={FACTOR_KIND[f.name] || 'estimated'} />
                                <span className="ml-auto text-xs font-bold text-green-forest">{f.score}/100 · {Math.round(f.weight * 100)}%</span>
                              </div>
                              <p className="text-xs text-text-secondary">{explanations[f.name] || f.explanation}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {missing.length > 0 && (
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">{t('insights.notIncluded', 'Not included in the score')}</p>
                        <ul className="space-y-1 text-xs text-gray-700 list-disc pl-4">{missing.map(m => <li key={m}>{m}</li>)}</ul>
                      </div>
                    )}
                  </Card>
                )}

                {tab === 'soil' && (
                  <Card padding="md" className="bg-cream border-brown-pastel/40 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-widest text-brown-earth/80 font-bold">{t('farm.context.soil', 'Soil Type')}</p>
                        <p className="text-xl font-bold text-brown-deep">
                          {activeFarm.soilType && activeFarm.soilType !== 'Unknown' ? t(`soils.${activeFarm.soilType}`, activeFarm.soilType) : t('states.unavailable', 'Unavailable')}
                        </p>
                      </div>
                      <div className="text-5xl" aria-hidden>🪨</div>
                    </div>

                    <div className="p-3 bg-white border border-brown-pastel/30 rounded-xl">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-[10px] font-bold text-brown-earth uppercase tracking-widest">{t('insights.soil.moisture', 'Moisture')}</p>
                        <SourceTag kind={typeof soilMoisture === 'number' ? 'estimated' : 'unavailable'} />
                      </div>
                      {typeof soilMoisture === 'number' ? (
                        <>
                          <p className="text-sm text-text-main font-semibold">
                            {Math.round(soilMoisture * 100)}% {t('insights.soil.volumetric', 'volumetric (top 0–7 cm)')}{moistureLabel ? ` · ${moistureLabel}` : ''}
                          </p>
                          <p className="text-[11px] text-text-secondary mt-0.5">{t('insights.soil.modelNote', 'Weather-model estimate from Open-Meteo, not a sensor in your field.')}</p>
                        </>
                      ) : (
                        <p className="text-sm text-text-secondary">{t('insights.soil.noMoisture', 'Soil moisture data is unavailable right now.')}</p>
                      )}
                    </div>

                    <div className="p-3 bg-white border border-brown-pastel/30 rounded-xl">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-[10px] font-bold text-brown-earth uppercase tracking-widest">{t('insights.soil.nutrientStatus', 'Nutrient Status')}</p>
                        <SourceTag kind="unavailable" />
                      </div>
                      <p className="text-sm text-text-main">{t('insights.soil.noSoilTest', 'No soil test recorded. Nutrient levels can only be known from a laboratory soil test.')}</p>
                    </div>
                  </Card>
                )}

                {tab === 'satellite' && (
                  satelliteOk && sources.satellite ? (
                    <Card padding="none" className="overflow-hidden bg-cream border-brown-pastel/40 shadow-sm">
                      {sources.satellite.satelliteImageUrl && (
                        <img src={sources.satellite.satelliteImageUrl} alt={t('ui.insightsPage.satelliteFarmView', 'Satellite farm view')} className="w-full h-56 sm:h-64 md:h-80 lg:h-[400px] object-cover" />
                      )}
                      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-[11px] uppercase tracking-widest text-brown-earth/80 font-bold">{t('insights.ndvi', 'NDVI Index')}</p>
                            <SourceTag kind="measured" />
                          </div>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-green-forest">{sources.satellite.ndvi.value.toFixed(2)}</p>
                            <Badge variant="green" dot>{t(`insights.ndviLabel.${sources.satellite.ndvi.label}`, sources.satellite.ndvi.label)}</Badge>
                          </div>
                          <p className="text-[11px] text-text-secondary mt-1">{t('insights.ndviSource', 'Sentinel-2 imagery via Google Earth Engine')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-brown-earth uppercase tracking-widest mb-1.5">{t('insights.range', 'Range')}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-secondary font-medium">{t('insights.rangeLabels.poor', 'Poor')}</span>
                            <div className="w-24 h-2 rounded-full" style={{ background: 'linear-gradient(to right, #ff4444, #ffaa00, #44aa44, #006600)' }} />
                            <span className="text-xs text-text-secondary font-medium">{t('insights.rangeLabels.excellent', 'Excellent')}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Card padding="md" className="border-gray-200 bg-gray-50 text-center space-y-1.5" role="status">
                      <p className="text-3xl" aria-hidden>🛰️</p>
                      <p className="font-bold text-gray-800">{t('insights.satelliteUnavailable', 'Satellite data is unavailable')}</p>
                      <p className="text-sm text-gray-600">
                        {sources.satellite?.source === 'error'
                          ? t('insights.satelliteError', 'Earth Engine could not process this farm right now. Please try again later.')
                          : t('insights.noData', 'No satellite data available.')}
                      </p>
                    </Card>
                  )
                )}
              </>
            )}
          </>
        )}
      </PageLayout>
    </motion.div>
  )
}

export default InsightsPage
