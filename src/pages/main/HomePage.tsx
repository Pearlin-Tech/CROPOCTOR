import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Cloud, Droplets, Wind, ChevronRight, AlertTriangle, Bot, Stethoscope, BarChart2, Plus, Bell, Lightbulb, MapPin } from 'lucide-react'
import { pageVariants, cardVariants } from '@/animations/variants'
import { PageLayout } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/index'
import { ProgressBar } from '@/components/ui/index'
import { WeatherSkeleton, FarmHealthSkeleton } from '@/components/skeletons'
import { useFarm } from '@/store/FarmContext'
import { useUser } from '@/store/UserContext'
import { weatherService, aiService } from '@/services'
import { cropDoctorService } from '@/services/cropDoctorService'
import { satelliteService } from '@/services/satelliteService'
import { calculateFarmHealthScore, type FarmHealth } from '@/services/healthService'
import type { WeatherData, DiagnosisResult } from '@/types'
import type { NDVIResult } from '@/services/satelliteService'
import { getGreeting, formatLocalizedNumber, formatLocalizedPercent } from '@/utils/format'
import { IMAGES } from '@/config/images'
import { useTranslation } from 'react-i18next'

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { activeFarm } = useFarm()
  const { farmer } = useUser()
  const { t, i18n } = useTranslation()
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null)
  const [satellite, setSatellite] = useState<NDVIResult | null>(null)
  const [loadingWeather, setLoadingWeather] = useState(true)
  const [farmHealth, setFarmHealth] = useState<FarmHealth | null>(null)

  useEffect(() => {
    if (!activeFarm) return
    let isSubscribed = true
    setLoadingWeather(true)
    
    Promise.all([
      weatherService.getWeather(activeFarm.id).catch(() => null),
      cropDoctorService.getRecentDiagnoses(1, activeFarm.id).then(res => res?.[0] || null).catch(() => null),
      (activeFarm.location?.lat && activeFarm.location?.lng) 
        ? satelliteService.getSatelliteData(activeFarm.id, activeFarm.location.lat, activeFarm.location.lng).catch(() => null)
        : Promise.resolve(null)
    ]).then(([w, d, s]) => {
      if (isSubscribed) {
        if (w) setWeather(w)
        if (d) setDiagnosis(d)
        if (s) setSatellite(s)
        
        const health = calculateFarmHealthScore(activeFarm, d, s, w)
        setFarmHealth(health)
        setLoadingWeather(false)
      }
    })

    return () => { isSubscribed = false }
  }, [activeFarm])

  const greeting = getGreeting()
  const name = farmer?.name?.split(' ')[0] || 'Rahul'
  const greetingText = greeting === 'morning' ? t('dashboard.greeting', { name })
    : greeting === 'afternoon' ? t('dashboard.greetingAfternoon', { name })
    : t('dashboard.greetingEvening', { name })

  const healthScoreVal = farmHealth?.score ?? (activeFarm?.healthScore ?? 82)
  const healthStatus = farmHealth?.status ?? 'Unknown'

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background pb-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden w-full h-44 md:h-56 lg:h-64">
        <img src={IMAGES.backgrounds.dashboard} alt="Farm Sunrise" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-[#FAF8F3]/95" />
        <div className="absolute inset-0 px-4 md:px-6 lg:px-8 flex flex-col justify-between py-5 relative z-10">
          {/* Top header elements */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 bg-white/25 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
              <span className="text-white text-xs font-bold uppercase tracking-wider">{t('dashboard.title', 'Cropoctor Dashboard')}</span>
            </div>
            <button onClick={() => navigate('/notifications')} className="w-10 h-10 bg-white/25 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 relative hover:scale-105 active:scale-95 transition-transform">
              <Bell className="w-5 h-5 text-white" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-muted-warning rounded-full border-2 border-white" />
            </button>
          </div>
          {/* Greeting */}
          <div>
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest">{new Date().toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white mt-1 tracking-tight drop-shadow-sm">{greetingText}</h1>
          </div>
        </div>
      </div>

      <PageLayout className="pt-4 space-y-5">
        {/* Active Farm Bar */}
        {activeFarm && (
          <motion.div variants={cardVariants} whileHover={{ y: -1 }} className="w-full">
            <div 
              onClick={() => navigate('/farms')} 
              className="flex items-center justify-between p-4 bg-cream border border-brown-pastel/55 rounded-2xl cursor-pointer hover:bg-beige-warm/30 transition-all shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brown-pastel/50 border border-brown-pastel/40 flex items-center justify-center text-lg shadow-inner">
                  🌾
                </div>
                <div>
                  <h2 className="text-text-main font-bold text-base leading-tight group-hover:text-green-forest transition-colors">{t(`farms.${activeFarm.id}.name`, activeFarm.name)}</h2>
                  <p className="text-text-secondary text-xs font-semibold mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-brown-earth" /> {t(`locations.${activeFarm.location.displayName}`, activeFarm.location.displayName)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="green" size="sm" className="hidden sm:inline-flex">
                  {t(`crops.${activeFarm.primaryCrop}`, activeFarm.primaryCrop)} · {formatLocalizedNumber(activeFarm.area, i18n.language)} {t('units.acres', 'acres')}
                </Badge>
                <ChevronRight className="w-5 h-5 text-brown-earth/60 group-hover:text-brown-earth transition-colors" />
              </div>
            </div>
          </motion.div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ── LEFT COLUMN: Weather & Health ── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Weather Card */}
            {loadingWeather ? <WeatherSkeleton /> : weather && (
              <motion.div variants={cardVariants}>
                <Card className="bg-cream border border-brown-pastel/40 shadow-card relative overflow-hidden" padding="md">
                  {/* Decorative background shapes */}
                  <div className="absolute top-[-25%] right-[-10%] w-40 h-40 bg-beige-warm rounded-full blur-[45px] opacity-60 pointer-events-none" />
                  <div className="absolute bottom-[-25%] left-[-15%] w-40 h-40 bg-green-light rounded-full blur-[45px] opacity-60 pointer-events-none" />
                  
                  <div className="relative z-10 flex items-start justify-between mb-4">
                    <div>
                      <p className="text-brown-earth text-xs font-bold uppercase tracking-wider mb-1">{t('dashboard.currentWeather', 'Current Weather')}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-text-main">{formatLocalizedNumber(weather.temperature, i18n.language)}°</span>
                        <span className="text-text-secondary text-sm font-semibold capitalize">{t(`weatherDesc.${weather.icon}`, weather.description)}</span>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-white border border-brown-pastel/30 flex items-center justify-center shadow-sm">
                      <Cloud className="w-7 h-7 text-green-forest animate-bounce-gentle" />
                    </div>
                  </div>

                  <div className="relative z-10 grid grid-cols-3 gap-2.5 mb-4 mt-2">
                    {[
                      { icon: Droplets, label: `${t('dashboard.weatherCard.rain', 'Rain')} ${formatLocalizedPercent(weather.rainChance, i18n.language)}` },
                      { icon: Droplets, label: `${t('dashboard.weatherCard.humidity', 'Humidity')} ${formatLocalizedPercent(weather.humidity, i18n.language)}` },
                      { icon: Wind, label: `${t('dashboard.weatherCard.wind', 'Wind')} ${formatLocalizedNumber(weather.windSpeed, i18n.language)} km/h` }
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="bg-white/50 border border-brown-pastel/30 rounded-xl p-2 flex items-center gap-1.5 shadow-sm">
                        <Icon className="w-4 h-4 text-green-forest shrink-0" />
                        <span className="text-xs text-text-main font-semibold truncate">{label}</span>
                      </div>
                    ))}
                  </div>

                  {weather.isDemo && <div className="mb-3"><Badge variant="demo" size="sm">{t('dashboard.demoData')}</Badge></div>}
                  
                  <button 
                    onClick={() => navigate('/weather')} 
                    className="relative z-10 w-full py-3 bg-white rounded-xl border border-brown-pastel/55 flex items-center justify-center gap-1 text-brown-earth text-xs font-bold hover:bg-beige-warm transition-colors shadow-sm"
                  >
                    {t('dashboard.viewWeather')} <ChevronRight className="w-4 h-4" />
                  </button>
                </Card>
              </motion.div>
            )}

            {/* Alert */}
            <motion.div variants={cardVariants}>
              <Card className="border-l-4 border-l-brown-earth bg-[#FAF5EE] border border-brown-pastel/40" padding="md">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-brown-earth shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-text-main text-sm">{t('dashboard.demoAlert.title', 'Heavy rain expected tomorrow.')}</p>
                    <p className="text-text-secondary text-xs mt-0.5 font-medium">{t('dashboard.demoAlert.desc', 'Consider delaying irrigation and checking drainage channels.')}</p>
                  </div>
                  <button onClick={() => navigate('/advisor')} className="text-xs text-brown-earth font-bold shrink-0 hover:underline">
                    {t('dashboard.demoAlert.why', 'Why?')}
                  </button>
                </div>
              </Card>
            </motion.div>

            {/* Farm Health Card */}
            {!loadingWeather ? (
              <motion.div variants={cardVariants}>
                <Card variant="pastelGreen" className="border-green-pastel/55 shadow-card" padding="md">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-green-forest uppercase tracking-widest mb-1">{t('dashboard.farmHealth')}</p>
                      <h2 className="text-4xl font-extrabold text-green-forest tracking-tight">{formatLocalizedNumber(healthScoreVal, i18n.language)}<span className="text-xl text-green-forest/60 font-medium">/{formatLocalizedNumber(100, i18n.language)}</span></h2>
                      <Badge variant="green" dot className="mt-2">
                        {healthStatus}
                      </Badge>
                    </div>
                    {/* Circular progress with dark green indicator */}
                    <div className="relative w-16 h-16">
                      <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-green-light)" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-green-forest)" strokeWidth="3.5"
                          strokeDasharray={`${healthScoreVal * 0.974} ${100 - healthScoreVal * 0.974}`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-green-forest">{formatLocalizedPercent(healthScoreVal, i18n.language)}</span>
                    </div>
                  </div>
                  <ProgressBar value={healthScoreVal} color="green" size="sm" />
                  <button onClick={() => navigate('/insights')} className="mt-4 flex items-center gap-1 text-green-forest text-xs font-bold hover:underline">
                    {t('dashboard.viewInsights')} <ChevronRight className="w-4 h-4" />
                  </button>
                </Card>
              </motion.div>
            ) : <FarmHealthSkeleton />}
          </div>

          {/* ── RIGHT COLUMN: Next Action & Quick Actions ── */}
          <div className="space-y-5">
            {/* Next Best Action */}
            <motion.div variants={cardVariants}>
              <Card className="bg-gradient-to-br from-brown-earth to-brown-secondary border-none text-white shadow-card-lg relative overflow-hidden" padding="md">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[30px] pointer-events-none" />
                <div className="relative z-10 flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
                    <Lightbulb className="w-5 h-5 text-cream animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[10px] text-cream/80 font-bold uppercase tracking-[0.2em] mb-1">{t('dashboard.nextBestAction')}</p>
                    <p className="font-bold text-white text-base leading-snug">{t('dashboard.nba.action', 'Check soil moisture before irrigation.')}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" fullWidth className="relative z-10 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 backdrop-blur-sm shadow-sm font-bold" onClick={() => navigate('/next-action')}>
                  {t('dashboard.viewActionPlan')} <ChevronRight className="w-4 h-4 ml-1 opacity-80" />
                </Button>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={cardVariants}>
              <Card padding="md" className="border-brown-pastel/30 bg-cream shadow-sm">
                <p className="text-[10px] font-bold text-brown-earth uppercase tracking-widest mb-3 pl-1">{t('dashboard.quickActions')}</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { icon: Bot,         label: t('nav.advisor'),   route: '/advisor',    bg: 'bg-green-pastel/30 border border-green-pastel/50 hover:bg-green-pastel/40', color: 'text-green-forest' },
                    { icon: Stethoscope, label: t('nav.diagnose'), route: '/diagnose',   bg: 'bg-white border border-brown-pastel/40 hover:bg-off-white',         color: 'text-brown-earth' },
                    { icon: Cloud,       label: t('nav.weather'),  route: '/weather',    bg: 'bg-green-light/40 border border-green-pastel/30 hover:bg-green-light/60', color: 'text-green-forest' },
                    { icon: BarChart2,   label: t('nav.insights'), route: '/insights',   bg: 'bg-brown-pastel/30 border border-brown-pastel/40 hover:bg-brown-pastel/40', color: 'text-brown-earth' },
                    { icon: Plus,        label: t('farm.addNew'), route: '/onboarding/location', bg: 'bg-white border border-brown-pastel/35 hover:bg-off-white col-span-2 py-3', color: 'text-green-forest' },
                  ].map(({ icon: Icon, label, route, bg, color }) => (
                    <button
                      key={label}
                      onClick={() => navigate(route)}
                      className={`${bg} rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98] transition-all shadow-sm`}
                    >
                      <Icon className={`w-5 h-5 ${color}`} strokeWidth={2} />
                      <span className={`text-xs font-bold ${color} tracking-tight`}>{label}</span>
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
