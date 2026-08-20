import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Cloud, Droplets, Wind, ChevronRight, AlertTriangle, Bot, Stethoscope, BarChart2, Plus, Bell, Lightbulb } from 'lucide-react'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { PageLayout } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/index'
import { ProgressBar } from '@/components/ui/index'
import { WeatherSkeleton, FarmHealthSkeleton } from '@/components/skeletons'
import { useFarm } from '@/store/FarmContext'
import { useUser } from '@/store/UserContext'
import { weatherService } from '@/services'
import type { WeatherData } from '@/types'
import { getGreeting } from '@/utils/format'
import { IMAGES } from '@/config/images'

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { activeFarm } = useFarm()
  const { farmer } = useUser()
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loadingWeather, setLoadingWeather] = useState(true)

  useEffect(() => {
    if (!activeFarm) return
    weatherService.getWeather(activeFarm.id).then(w => { setWeather(w); setLoadingWeather(false) })
  }, [activeFarm])

  const greeting = getGreeting()
  const greetingText = greeting === 'morning' ? `Good morning, ${farmer?.name?.split(' ')[0] || 'Farmer'} 🌱`
    : greeting === 'afternoon' ? `Good afternoon, ${farmer?.name?.split(' ')[0] || 'Farmer'} 🌾`
    : `Good evening, ${farmer?.name?.split(' ')[0] || 'Farmer'} 🌙`

  const health = activeFarm?.healthScore ?? 82
  const healthColor = health >= 70 ? 'green' : health >= 50 ? 'warning' : 'danger'

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="relative overflow-hidden">
        <img src={IMAGES.backgrounds.dashboard} alt="Farm" className="w-full h-40 md:h-52 lg:h-64 object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-background" />
        <div className="absolute inset-0 px-4 md:px-6 lg:px-8 flex flex-col justify-between py-4">
          {/* Notification bell */}
          <div className="flex justify-end">
            <button onClick={() => navigate('/notifications')} className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center relative">
              <Bell className="w-5 h-5 text-white" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-muted-warning rounded-full border-2 border-white" />
            </button>
          </div>
          {/* Greeting */}
          <div>
            <p className="text-white/80 text-sm font-medium">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white mt-0.5">{greetingText}</h1>
          </div>
        </div>
      </div>

      <PageLayout className="pt-3 pb-6 space-y-4">
        {/* Farm pill */}
        {activeFarm && (
          <div className="flex items-center gap-2 bg-white shadow-sm border border-green-pastel/20 rounded-full px-4 py-2 w-fit">
            <span className="text-green-forest text-sm">🏡</span>
            <span className="text-sm font-semibold text-gray-700">{activeFarm.name}</span>
            <span className="text-xs text-gray-400">· {activeFarm.location.displayName}</span>
            <span className="text-xs bg-green-light text-green-forest px-2 py-0.5 rounded-full font-medium">{activeFarm.primaryCrop} · {activeFarm.area} acres</span>
          </div>
        )}

        {/* Desktop 3-column layout wrapper */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Weather card */}
            {loadingWeather ? <WeatherSkeleton /> : weather && (
              <motion.div variants={cardVariants}>
                <Card className="bg-gradient-to-br from-[#1565C0] to-[#1976D2] text-white border-none" padding="md">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-blue-100 text-sm font-medium mb-1">Today's Weather</p>
                      <div className="flex items-end gap-2">
                        <span className="text-5xl font-bold">{weather.temperature}°</span>
                        <span className="text-blue-200 text-lg pb-1">{weather.description}</span>
                      </div>
                    </div>
                    <Cloud className="w-12 h-12 text-blue-200 opacity-80" />
                  </div>
                  <div className="flex gap-4 mb-4">
                    <div className="flex items-center gap-1.5"><Droplets className="w-4 h-4 text-blue-200" /><span className="text-sm text-blue-100">Rain {weather.rainChance}%</span></div>
                    <div className="flex items-center gap-1.5"><Droplets className="w-4 h-4 text-blue-200" /><span className="text-sm text-blue-100">Humidity {weather.humidity}%</span></div>
                    <div className="flex items-center gap-1.5"><Wind className="w-4 h-4 text-blue-200" /><span className="text-sm text-blue-100">Wind {weather.windSpeed} km/h</span></div>
                  </div>
                  {weather.isDemo && <Badge variant="demo" size="sm">Demo Data</Badge>}
                  <button onClick={() => navigate('/weather')} className="mt-3 flex items-center gap-1 text-blue-100 text-sm font-medium hover:text-white transition-colors">
                    View Weather Intelligence <ChevronRight className="w-4 h-4" />
                  </button>
                </Card>
              </motion.div>
            )}

            {/* Alert */}
            <motion.div variants={cardVariants}>
              <Card className="border-l-4 border-l-muted-warning bg-amber-50 border-amber-100" padding="md">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-muted-warning shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-800 text-sm">Heavy rain expected tomorrow.</p>
                    <p className="text-amber-700 text-xs mt-0.5">Consider delaying irrigation and checking drainage channels.</p>
                  </div>
                  <button
                    onClick={() => navigate('/advisor')}
                    className="text-xs text-muted-warning font-bold shrink-0 hover:underline"
                  >
                    Why?
                  </button>
                </div>
              </Card>
            </motion.div>

            {/* Farm Health */}
            {!loadingWeather ? (
              <motion.div variants={cardVariants}>
                <Card padding="md">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-0.5">Farm Health</p>
                      <h2 className="text-3xl font-bold text-gray-800">{health}<span className="text-lg text-gray-400">/100</span></h2>
                      <Badge variant={healthColor === 'green' ? 'green' : healthColor === 'warning' ? 'warning' : 'danger'} dot>
                        {health >= 70 ? 'Looking Healthy' : health >= 50 ? 'Needs Attention' : 'At Risk'}
                      </Badge>
                    </div>
                    {/* Circular progress */}
                    <div className="relative w-16 h-16">
                      <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E8F5E9" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#2E7D32" strokeWidth="3"
                          strokeDasharray={`${health * 0.974} ${100 - health * 0.974}`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-green-forest">{health}%</span>
                    </div>
                  </div>
                  <ProgressBar value={health} color={healthColor as any} size="sm" />
                  <button onClick={() => navigate('/insights')} className="mt-3 flex items-center gap-1 text-green-forest text-sm font-medium hover:underline">
                    View Insights <ChevronRight className="w-4 h-4" />
                  </button>
                </Card>
              </motion.div>
            ) : <FarmHealthSkeleton />}
          </div>

          {/* ── RIGHT COLUMN (desktop) ── */}
          <div className="space-y-4">
            {/* Next Best Action */}
            <motion.div variants={cardVariants}>
              <Card className="bg-gradient-to-br from-brown-earth to-brown-deep border-none text-white shadow-card-lg" padding="md">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-sm border border-white/20">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Next Best Action</p>
                    <p className="font-semibold text-white text-base mt-0.5 leading-snug">Check soil moisture before irrigation.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" fullWidth className="border-white/30 text-white hover:bg-white/10 hover:border-white/50" onClick={() => navigate('/next-action')}>
                  View Action Plan <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={cardVariants}>
              <Card padding="md">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Bot,         label: 'Ask AI',   route: '/advisor',    bg: 'bg-green-light',   color: 'text-green-forest' },
                    { icon: Stethoscope, label: 'Diagnose', route: '/diagnose',   bg: 'bg-green-pastel/20', color: 'text-green-deep' },
                    { icon: Cloud,       label: 'Weather',  route: '/weather',    bg: 'bg-green-light',   color: 'text-green-forest' },
                    { icon: BarChart2,   label: 'Insights', route: '/insights',   bg: 'bg-beige-warm',    color: 'text-brown-earth' },
                    { icon: Plus,        label: 'Add Farm', route: '/onboarding/location', bg: 'bg-green-light', color: 'text-green-forest' },
                  ].map(({ icon: Icon, label, route, bg, color }) => (
                    <button
                      key={label}
                      onClick={() => navigate(route)}
                      className={`${bg} rounded-2xl p-4 flex flex-col items-center gap-2 hover:opacity-80 hover:scale-[1.02] active:scale-[0.98] transition-all`}
                    >
                      <Icon className={`w-6 h-6 ${color}`} />
                      <span className={`text-xs font-semibold ${color}`}>{label}</span>
                    </button>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </PageLayout>
    </motion.div>
  )
}

export default HomePage
