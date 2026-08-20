import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/index'
import { Chip } from '@/components/ui/index'
import { WeatherSkeleton } from '@/components/skeletons'
import { weatherService } from '@/services'
import type { WeatherData } from '@/types'
import { useFarm } from '@/store/FarmContext'

const WEATHER_ICONS: Record<string, string> = {
  'sunny': '☀️', 'partly-cloudy': '⛅', 'cloudy': '☁️', 'rainy': '🌧️', 'stormy': '⛈️',
}

const WeatherPage: React.FC = () => {
  const { activeFarm } = useFarm()
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'today' | '7day'>('today')

  useEffect(() => {
    weatherService.getWeather(activeFarm?.id || '').then(w => { setWeather(w); setLoading(false) })
  }, [activeFarm])

  const impact = weather?.farmImpact
  const statusColor = { delay: 'warning', postpone: 'warning', caution: 'warning', proceed: 'green', monitor: 'gray', low: 'green', moderate: 'warning', elevated: 'warning', high: 'danger' } as const

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title="Weather Intelligence" />

      <PageLayout className="pt-4 pb-8 space-y-4">
        <div className="hidden lg:block mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Weather Intelligence</h1>
          <p className="text-sm text-gray-500">AI-interpreted weather for your farm.</p>
        </div>

        {loading ? <WeatherSkeleton /> : weather && (
          <>
            {/* Tab switcher */}
            <div className="flex gap-2">
              <Chip selected={tab === 'today'} onClick={() => setTab('today')}>Today</Chip>
              <Chip selected={tab === '7day'} onClick={() => setTab('7day')}>7-Day Forecast</Chip>
            </div>

            {/* Main weather card */}
            {tab === 'today' ? (
              <Card className="bg-gradient-to-br from-[#1565C0] to-[#0D47A1] text-white border-none" padding="lg">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-blue-200 text-sm mb-1">{activeFarm?.location.displayName || 'Rajkot, Gujarat'}</p>
                    <div className="flex items-end gap-2">
                      <span className="text-6xl font-bold">{weather.temperature}°</span>
                      <span className="text-blue-200 text-xl pb-2">C</span>
                    </div>
                    <p className="text-blue-100">{weather.description}</p>
                  </div>
                  <span className="text-6xl">{WEATHER_ICONS[weather.icon] || '🌤️'}</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Rain', value: `${weather.rainChance}%`, icon: '🌧' },
                    { label: 'Humidity', value: `${weather.humidity}%`, icon: '💧' },
                    { label: 'Wind', value: `${weather.windSpeed} km/h`, icon: '💨' },
                    { label: 'UV', value: weather.uvIndex.toString(), icon: '☀️' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-white/10 rounded-xl p-2.5 text-center">
                      <p className="text-xl mb-1">{stat.icon}</p>
                      <p className="text-white font-bold text-sm">{stat.value}</p>
                      <p className="text-blue-200 text-xs">{stat.label}</p>
                    </div>
                  ))}
                </div>
                {weather.isDemo && <div className="mt-3"><Badge variant="demo">Demo Weather Data</Badge></div>}
              </Card>
            ) : (
              <Card padding="md">
                <div className="space-y-2">
                  {weather.forecast.map(day => (
                    <div key={day.date} className="flex items-center gap-3 py-2 border-b last:border-b-0 border-gray-50">
                      <span className="w-16 text-sm font-semibold text-gray-600">{day.dayLabel}</span>
                      <span className="text-2xl">{WEATHER_ICONS[day.icon] || '🌤️'}</span>
                      <span className="flex-1 text-xs text-gray-400">{day.description}</span>
                      <span className="text-xs text-blue-500 font-medium">{day.rainChance}%</span>
                      <span className="text-sm font-bold text-gray-800">{day.high}°</span>
                      <span className="text-sm text-gray-400">{day.low}°</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Farm Impact — NOT a generic weather app */}
            {impact && (
              <Card padding="md">
                <h3 className="font-bold text-gray-800 mb-3">🌾 Farm Impact</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Irrigation',    status: impact.irrigation.status,    reason: impact.irrigation.reason,    icon: '💧' },
                    { label: 'Spraying',      status: impact.spraying.status,      reason: impact.spraying.reason,      icon: '🌿' },
                    { label: 'Disease Risk',  status: impact.diseaseRisk.level,    reason: impact.diseaseRisk.reason,   icon: '🔬' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-3 bg-off-white rounded-xl">
                      <span className="text-xl">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-gray-700">{item.label}</p>
                          <Badge variant={statusColor[item.status as keyof typeof statusColor] || 'gray'} size="sm">
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500">{item.reason}</p>
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
