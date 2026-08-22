import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { pageVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, Chip } from '@/components/ui/index'
import { WeatherSkeleton } from '@/components/skeletons'
import { weatherService } from '@/services'
import type { WeatherData } from '@/types'
import { useFarm } from '@/store/FarmContext'
import { useTranslation } from 'react-i18next'
import { formatLocalizedNumber, formatLocalizedPercent } from '@/utils/format'

const WEATHER_ICONS: Record<string, string> = {
  'sunny': '☀️', 'partly-cloudy': '⛅', 'cloudy': '☁️', 'rainy': '🌧️', 'stormy': '⛈️',
}

function formatUpdatedTime(isoString?: string, t?: any, lang?: string): string {
  if (!isoString) return t ? t('weather.updatedJustNow', 'Updated just now') : 'Updated just now'
  try {
    const d = new Date(isoString)
    const now = new Date()
    const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diffMins < 1) return t ? t('weather.updatedJustNow', 'Updated just now') : 'Updated just now'
    if (diffMins < 60) return t ? t('weather.updatedMinAgo', { count: formatLocalizedNumber(diffMins, lang), defaultValue: `Updated ${diffMins} min ago` }) : `Updated ${diffMins} min ago`
    return `Updated at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  } catch {
    return t ? t('weather.updatedJustNow', 'Updated just now') : 'Updated just now'
  }
}

const WeatherPage: React.FC = () => {
  const { activeFarm } = useFarm()
  const { t, i18n } = useTranslation()
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'today' | '7day'>('today')

  const fetchIdRef = useRef<number>(0)

  const fetchWeather = useCallback(async () => {
    if (!activeFarm) return
    const currentFetchId = ++fetchIdRef.current
    setLoading(true)
    setError(null)

    try {
      const data = await weatherService.getWeather(activeFarm.id, activeFarm)
      // Ignore stale response if farm changed mid-flight
      if (currentFetchId !== fetchIdRef.current) return

      setWeather(data)
      setLoading(false)
    } catch (err: any) {
      if (currentFetchId !== fetchIdRef.current) return
      setError(t('weather.error', 'Weather data temporarily unavailable for {{farmName}}.', { farmName: activeFarm.name }))
      setLoading(false)
    }
  }, [activeFarm, t])

  // Fetch when active farm changes or on initial mount
  useEffect(() => {
    fetchWeather()
  }, [fetchWeather])

  // Periodic refresh (15 mins) & window focus re-fetch
  useEffect(() => {
    const interval = setInterval(() => {
      fetchWeather()
    }, 15 * 60 * 1000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchWeather()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchWeather])

  const impact = weather?.farmImpact
  const statusColor = { delay: 'warning', postpone: 'warning', caution: 'warning', proceed: 'green', monitor: 'gray', low: 'green', moderate: 'warning', elevated: 'warning', high: 'danger' } as const

  const locationDisplay = activeFarm?.location.displayName || weather?.location?.displayName || t('weather.farmLocation', 'Farm Location')

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title={t('nav.weather')} />

      <PageLayout className="pt-4 pb-8 space-y-4">
        <div className="hidden lg:block mb-4">
          <h1 className="text-2xl font-bold text-green-forest tracking-tight">{t('nav.weather')}</h1>
          <p className="text-brown-earth/80 text-sm font-medium">{t('weather.subtitle', 'Real-time weather and farm impact analysis.')}</p>
        </div>

        {loading ? (
          <WeatherSkeleton />
        ) : error ? (
          <Card padding="lg" className="border-brown-pastel/30 bg-cream text-center py-8 space-y-4">
            <span className="text-4xl">🌦️</span>
            <p className="text-sm font-bold text-brown-earth">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchWeather}>{t('states.retry', 'Retry')}</Button>
          </Card>
        ) : weather && (
          <>
            {/* Tab switcher */}
            <div className="flex gap-2">
              <Chip selected={tab === 'today'} onClick={() => setTab('today')}>{t('weather.today', 'Today')}</Chip>
              <Chip selected={tab === '7day'} onClick={() => setTab('7day')}>{t('weather.sevenDay', '7 Days')}</Chip>
            </div>

            {/* Main weather card */}
            {tab === 'today' ? (
              <Card className="bg-cream border border-brown-pastel/30 shadow-card relative overflow-hidden" padding="lg">
                {/* Decorative background shapes */}
                <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-beige-warm rounded-full blur-[50px] opacity-60" />
                <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-green-light rounded-full blur-[50px] opacity-60" />
                
                <div className="relative z-10 flex items-start justify-between mb-4">
                  <div>
                    <p className="text-brown-earth font-bold uppercase tracking-wider text-[11px] mb-2">{t(`locations.${locationDisplay}`, locationDisplay)}</p>
                    <div className="flex items-end gap-2">
                      <span className="text-6xl font-bold text-text-main">{formatLocalizedNumber(weather.temperature, i18n.language)}°</span>
                      <span className="text-text-secondary text-xl pb-2 font-medium">C</span>
                    </div>
                    <p className="text-text-main font-semibold mt-1">{t(`weatherDesc.${weather.icon}`, weather.description)}</p>
                  </div>
                  <div className="w-20 h-20 rounded-full bg-beige-warm flex items-center justify-center shadow-sm border border-brown-pastel/20">
                    <span className="text-4xl">{WEATHER_ICONS[weather.icon] || '🌤️'}</span>
                  </div>
                </div>
                <div className="relative z-10 grid grid-cols-4 gap-3 mt-6 border-t border-brown-pastel/30 pt-6">
                  {[
                    { label: t('dashboard.weatherCard.rain', 'Rain'), value: formatLocalizedPercent(weather.rainChance, i18n.language), icon: '🌧' },
                    { label: t('dashboard.weatherCard.humidity', 'Humidity'), value: formatLocalizedPercent(weather.humidity, i18n.language), icon: '💧' },
                    { label: t('dashboard.weatherCard.wind', 'Wind'), value: `${formatLocalizedNumber(weather.windSpeed, i18n.language)} km/h`, icon: '💨' },
                    { label: 'UV', value: formatLocalizedNumber(weather.uvIndex, i18n.language), icon: '☀️' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-off-white rounded-xl p-2.5 text-center border border-brown-pastel/20 shadow-sm">
                      <p className="text-xl mb-1">{stat.icon}</p>
                      <p className="text-green-forest font-bold text-sm">{stat.value}</p>
                      <p className="text-brown-earth/80 font-medium text-[10px] uppercase tracking-wider">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Badge variant={weather.isDemo ? "demo" : "green"}>
                    {weather.isDemo ? t('weather.demo', 'Demo Weather Data') : t('insights.live', 'Live')}
                  </Badge>
                  <span className="text-[11px] font-medium text-text-secondary">
                    {formatUpdatedTime(weather.updatedAt, t, i18n.language)}
                  </span>
                </div>
              </Card>
            ) : (
              <Card padding="md" className="border-brown-pastel/30 bg-off-white shadow-sm">
                <div className="space-y-2">
                  {weather.forecast.map(day => (
                    <div key={day.date} className="flex items-center gap-3 py-2 border-b last:border-b-0 border-brown-pastel/20">
                      <span className="w-16 text-sm font-semibold text-text-secondary">{day.dayLabel}</span>
                      <span className="text-2xl">{WEATHER_ICONS[day.icon] || '🌤️'}</span>
                      <span className="flex-1 text-xs text-text-secondary font-medium">{t(`weatherDesc.${day.icon}`, day.description)}</span>
                      <span className="text-xs text-green-forest font-bold">{formatLocalizedPercent(day.rainChance, i18n.language)}</span>
                      <span className="text-sm font-bold text-text-main">{formatLocalizedNumber(day.high, i18n.language)}°</span>
                      <span className="text-sm text-brown-earth/60 font-medium">{formatLocalizedNumber(day.low, i18n.language)}°</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Farm Impact — NOT a generic weather app */}
            {impact && (
              <Card padding="md" className="border-brown-pastel/30 bg-cream shadow-sm">
                <h3 className="font-bold text-brown-earth mb-3 flex items-center gap-2">
                  <span className="text-lg">🌾</span> {t('weather.farmImpact', 'Farm Impact')} ({activeFarm?.name})
                </h3>
                <div className="space-y-3">
                  {[
                    { label: t('weather.irrigation', 'Irrigation'),    status: impact.irrigation.status,    reason: impact.irrigation.reason,    icon: '💧' },
                    { label: t('weather.spraying', 'Spraying'),      status: impact.spraying.status,      reason: impact.spraying.reason,      icon: '🌿' },
                    { label: t('weather.diseaseRisk', 'Disease Risk'),  status: impact.diseaseRisk.level,    reason: impact.diseaseRisk.reason,   icon: '🔬' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-3 bg-white border border-brown-pastel/20 rounded-xl shadow-sm">
                      <span className="text-xl mt-0.5">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-text-main">{item.label}</p>
                          <Badge variant={statusColor[item.status as keyof typeof statusColor] || 'gray'} size="sm">
                            {t(`weather.status.${item.status}`, item.status.charAt(0).toUpperCase() + item.status.slice(1))}
                          </Badge>
                        </div>
                        <p className="text-xs text-text-secondary font-medium">{t(`weather.reasons.${item.reason}`, item.reason)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </PageLayout>
    </motion.div>
  )
}

export default WeatherPage
