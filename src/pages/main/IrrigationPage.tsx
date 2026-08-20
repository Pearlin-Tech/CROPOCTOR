import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Droplets, Thermometer, Wind, Sun, Zap, AlertTriangle, ChevronRight, RefreshCcw } from 'lucide-react'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { useFarm } from '@/store/FarmContext'
import { weatherService } from '@/services'
import type { WeatherData } from '@/types'
import { WeatherSkeleton } from '@/components/skeletons'
import { useApp } from '@/store/AppContext'

const IrrigationPage: React.FC = () => {
  const navigate = useNavigate()
  const { activeFarm } = useFarm()
  const { toast } = useApp()
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    weatherService.getWeather(activeFarm?.id || '').then(w => { setWeather(w); setLoading(false) })
  }, [activeFarm])

  const schedules = [
    {
      id: 'today',
      label: 'TODAY',
      title: 'Skip Irrigation',
      reason: 'Rain expected (35–50mm). Soil moisture is adequate.',
      status: 'skip' as const,
      confidence: 94,
      icon: '⛔',
    },
    {
      id: 'tomorrow',
      label: 'TOMORROW',
      title: 'Monitor after rain',
      reason: 'Check soil drainage and field conditions post-rain.',
      status: 'monitor' as const,
      confidence: 88,
      icon: '👁️',
    },
    {
      id: 'day3',
      label: 'IN 2 DAYS',
      title: 'Light irrigation if needed',
      reason: 'If rain < 20mm, apply 25mm of supplemental irrigation.',
      status: 'conditional' as const,
      confidence: 72,
      icon: '💧',
    },
  ]

  const statusColors = {
    skip: 'danger',
    monitor: 'warning',
    conditional: 'gray',
    proceed: 'green',
  } as const

  const tips = [
    { icon: '🌱', title: 'Flowering Stage', text: 'Your crop is in flowering. Avoid water stress — but also avoid waterlogging which causes flower drop.' },
    { icon: '🕓', title: 'Best Time to Irrigate', text: 'If irrigation is needed, do it in the early morning (6–8 AM) to minimize evaporation losses.' },
    { icon: '📏', title: 'Recommended Amount', text: 'Groundnut at flowering needs 25–35mm per week. Current soil has adequate moisture from recent rain.' },
    { icon: '🌡️', title: 'Soil Moisture Check', text: 'Insert a finger 6 inches into soil near root zone. If it still feels moist, skip irrigation today.' },
  ]

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title="Irrigation Intelligence" subtitle="AI-powered scheduling for your farm" onBack={() => navigate(-1)} />

      <PageLayout className="pt-4 pb-8 space-y-5">
        <div className="hidden lg:flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Irrigation Intelligence</h1>
            <p className="text-sm text-gray-500 mt-1">AI-powered smart irrigation scheduling based on weather & soil data.</p>
          </div>
          <button onClick={() => { setLoading(true); weatherService.getWeather(activeFarm?.id || '').then(w => { setWeather(w); setLoading(false); toast.success('Updated!') }) }}
            className="flex items-center gap-2 px-4 py-2 bg-green-light text-green-forest rounded-xl text-sm font-semibold hover:bg-green-pastel/50 transition-colors">
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Active farm context */}
        {activeFarm && (
          <div className="flex items-center gap-3 bg-green-light/50 rounded-2xl px-4 py-3 border border-green-pastel/30">
            <span className="text-2xl">🏡</span>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{activeFarm.name}</p>
              <p className="text-xs text-gray-400">{activeFarm.primaryCrop} · {activeFarm.area} acres · {activeFarm.cropStage}</p>
            </div>
            <Badge variant="green" size="sm" className="ml-auto">Active Farm</Badge>
          </div>
        )}

        {/* Current weather context */}
        {loading ? <WeatherSkeleton /> : weather && (
          <Card className="bg-gradient-to-br from-[#1565C0] to-[#1976D2] text-white border-none" padding="md">
            <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-3">Current Conditions</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: Thermometer, label: 'Temp', value: `${weather.temperature}°C` },
                { icon: Droplets,    label: 'Rain', value: `${weather.rainChance}%` },
                { icon: Droplets,    label: 'Humidity', value: `${weather.humidity}%` },
                { icon: Wind,        label: 'Wind', value: `${weather.windSpeed} km/h` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white/15 rounded-xl p-2.5 text-center">
                  <Icon className="w-4 h-4 mx-auto text-blue-200 mb-1" />
                  <p className="font-bold text-sm">{value}</p>
                  <p className="text-blue-200 text-xs">{label}</p>
                </div>
              ))}
            </div>
            {weather.isDemo && <Badge variant="demo" size="sm" className="mt-3">Demo Data</Badge>}
          </Card>
        )}

        {/* AI Schedule */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">AI Irrigation Schedule</p>
          <motion.div variants={listVariants} animate="animate" className="space-y-3">
            {schedules.map(s => (
              <motion.div key={s.id} variants={cardVariants}>
                <Card padding="md" className={s.status === 'skip' ? 'border-l-4 border-l-muted-danger' : s.status === 'monitor' ? 'border-l-4 border-l-muted-warning' : ''}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{s.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="gray" size="sm">{s.label}</Badge>
                        <Badge variant={statusColors[s.status]} size="sm" dot>
                          {s.status === 'skip' ? 'Skip' : s.status === 'monitor' ? 'Monitor' : 'Conditional'}
                        </Badge>
                        <span className="ml-auto text-xs text-gray-400">{s.confidence}% confidence</span>
                      </div>
                      <p className="font-semibold text-gray-800">{s.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{s.reason}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Tips */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Smart Irrigation Tips</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tips.map(tip => (
              <Card key={tip.title} padding="sm" variant="flat">
                <div className="flex gap-3">
                  <span className="text-xl shrink-0">{tip.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{tip.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{tip.text}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="primary" fullWidth onClick={() => navigate('/advisor')} icon={<Zap className="w-4 h-4" />}>
            Ask AI about Irrigation
          </Button>
          <Button variant="outline" fullWidth onClick={() => navigate('/weather')} icon={<Sun className="w-4 h-4" />}>
            View Full Weather
          </Button>
        </div>
      </PageLayout>
    </motion.div>
  )
}

export default IrrigationPage
