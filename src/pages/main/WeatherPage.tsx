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

const WEATHER_ICONS: Record<string, string> = {
  'sunny': '☀️', 'partly-cloudy': '⛅', 'cloudy': '☁️', 'rainy': '🌧️', 'stormy': '⛈️',
}

function formatUpdatedTime(isoString?: string): string {
  if (!isoString) return 'Updated just now'
  try {
    const d = new Date(isoString)
    const now = new Date()
    const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diffMins < 1) return 'Updated just now'
    if (diffMins < 60) return `Updated ${diffMins} min ago`
    return `Updated at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  } catch {
    return 'Updated just now'
  }
}

const WeatherPage: React.FC = () => {
  const { activeFarm } = useFarm()
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
      setError(`Weather data temporarily unavailable for ${activeFarm.name}.`)
      setLoading(false)
    }
  }, [activeFarm])

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

  const locationDisplay = activeFarm?.location.displayName || weather?.location?.displayName || 'Farm Location'

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title="Weather Intelligence" />

      <PageLayout className="pt-4 pb-8 space-y-4">
        <div className="hidden lg:block mb-4">
          <h1 className="text-2xl font-bold text-green-forest tracking-tight">Weather Intelligence</h1>
          <p className="text-brown-earth/80 text-sm font-medium">AI-interpreted weather for your farm.</p>
        </div>

        {loading ? (
          <WeatherSkeleton />
        ) : error ? (
          <Card padding="lg" className="border-brown-pastel/30 bg-cream text-center py-8 space-y-4">
            <span className="text-4xl">🌦️</span>
            <p className="text-sm font-bold text-brown-earth">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchWeather}>Retry</Button>
          </Card>
        ) : weather && (
          <>
            {/* Tab switcher */}
            <div className="flex gap-2">
              <Chip selected={tab === 'today'} onClick={() => setTab('today')}>Today</Chip>
              <Chip selected={tab === '7day'} onClick={() => setTab('7day')}>7-Day Forecast</Chip>
            </div>

            {/* Main weather card */}
            {tab === 'today' ? (
              <Card className="bg-cream border border-brown-pastel/30 shadow-card relative overflow-hidden" padding="lg">
                {/* Decorative background shapes */}
                <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-beige-warm rounded-full blur-[50px] opacity-60" />
                <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-green-light rounded-full blur-[50px] opacity-60" />
                
                <div className="relative z-10 flex items-start justify-between mb-4">
                  <div>
                    <p className="text-brown-earth font-bold uppercase tracking-wider text-[11px] mb-2">{locationDisplay}</p>
                    <div className="flex items-end gap-2">
                      <span className="text-6xl font-bold text-text-main">{weather.temperature}°</span>
                      <span className="text-text-secondary text-xl pb-2 font-medium">C</span>
                    </div>
                    <p className="text-text-main font-semibold mt-1">{weather.description}</p>
                  </div>
                  <div className="w-20 h-20 rounded-full bg-beige-warm flex items-center justify-center shadow-sm border border-brown-pastel/20">
                    <span className="text-4xl">{WEATHER_ICONS[weather.icon] || '🌤️'}</span>
                  </div>
                </div>
                <div className="relative z-10 grid grid-cols-4 gap-3 mt-6 border-t border-brown-pastel/30 pt-6">
                  {[
                    { label: 'Rain', value: `${weather.rainChance}%`, icon: '🌧' },
                    { label: 'Humidity', value: `${weather.humidity}%`, icon: '💧' },
                    { label: 'Wind', value: `${weather.windSpeed} km/h`, icon: '💨' },
                    { label: 'UV', value: weather.uvIndex.toString(), icon: '☀️' },
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
                    {weather.isDemo ? "Demo Weather Data" : "Live Weather Data"}
                  </Badge>
                  <span className="text-[11px] font-medium text-text-secondary">
                    {formatUpdatedTime(weather.updatedAt)}
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
                      <span className="flex-1 text-xs text-text-secondary font-medium">{day.description}</span>
                      <span className="text-xs text-green-forest font-bold">{day.rainChance}%</span>
                      <span className="text-sm font-bold text-text-main">{day.high}°</span>
                      <span className="text-sm text-brown-earth/60 font-medium">{day.low}°</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Farm Impact — NOT a generic weather app */}
            {impact && (
              <Card padding="md" className="border-brown-pastel/30 bg-cream shadow-sm">
                <h3 className="font-bold text-brown-earth mb-3 flex items-center gap-2">
                  <span className="text-lg">🌾</span> Farm Impact ({activeFarm?.name})
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Irrigation',    status: impact.irrigation.status,    reason: impact.irrigation.reason,    icon: '💧' },
                    { label: 'Spraying',      status: impact.spraying.status,      reason: impact.spraying.reason,      icon: '🌿' },
                    { label: 'Disease Risk',  status: impact.diseaseRisk.level,    reason: impact.diseaseRisk.reason,   icon: '🔬' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-3 bg-white border border-brown-pastel/20 rounded-xl shadow-sm">
                      <span className="text-xl mt-0.5">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-text-main">{item.label}</p>
                          <Badge variant={statusColor[item.status as keyof typeof statusColor] || 'gray'} size="sm">
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-xs text-text-secondary font-medium">{item.reason}</p>
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
