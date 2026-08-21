import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Globe, Mic, Bell, Shield, Database, Ruler, ChevronRight, Moon, Wifi, Trash2, Download, Info, LogOut } from 'lucide-react'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { useApp } from '@/store/AppContext'
import { useUser } from '@/store/UserContext'

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label }) => (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-green-forest border border-brown-pastel/20 ${checked ? 'bg-green-forest' : 'bg-brown-pastel/30'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
)

const SettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useApp()
  const { logout } = useUser()
  const [notifWeather, setNotifWeather]     = useState(true)
  const [notifDisease, setNotifDisease]     = useState(true)
  const [notifIrrigation, setNotifIrrigation] = useState(false)
  const [notifAI, setNotifAI]               = useState(true)
  const [darkMode, setDarkMode]             = useState(false)
  const [offlineMode, setOfflineMode]       = useState(true)
  const [metricUnits, setMetricUnits]       = useState(true)

  const handleLogout = () => {
    logout()
    navigate('/welcome')
    toast.info('You have been signed out.')
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title="Settings" onBack={() => navigate(-1)} />

      <PageLayout className="pt-4 pb-8 space-y-6">
        <h1 className="hidden lg:block text-2xl font-bold text-green-forest tracking-tight mb-2">Settings</h1>

        {/* Language & Region */}
        <div>
          <p className="text-[10px] font-bold text-brown-earth uppercase tracking-widest mb-3">Language & Region</p>
          <Card padding="none" className="divide-y divide-brown-pastel/20 border-brown-pastel/30 bg-white shadow-sm">
            <button onClick={() => navigate('/settings/language')} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-green-pastel/10 transition-colors text-left">
              <Globe className="w-5 h-5 text-brown-earth/70 shrink-0" strokeWidth={1.8} />
              <div className="flex-1">
                <p className="text-sm font-bold text-text-main">App Language</p>
                <p className="text-xs text-text-secondary font-medium">English</p>
              </div>
              <ChevronRight className="w-4 h-4 text-brown-earth/40" />
            </button>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Ruler className="w-5 h-5 text-brown-earth/70 shrink-0" strokeWidth={1.8} />
              <div className="flex-1">
                <p className="text-sm font-bold text-text-main">Metric Units</p>
                <p className="text-xs text-text-secondary font-medium">{metricUnits ? 'Acres, °C' : 'Hectares, °F'}</p>
              </div>
              <Toggle checked={metricUnits} onChange={v => { setMetricUnits(v); toast.info(`Units changed to ${v ? 'Metric' : 'Imperial'}.`) }} label="Toggle metric units" />
            </div>
          </Card>
        </div>

        {/* Voice */}
        <div>
          <p className="text-[10px] font-bold text-brown-earth uppercase tracking-widest mb-3">Voice & AI</p>
          <Card padding="none" className="divide-y divide-brown-pastel/20 border-brown-pastel/30 bg-white shadow-sm">
            <button onClick={() => navigate('/settings/voice')} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-green-pastel/10 transition-colors text-left">
              <Mic className="w-5 h-5 text-brown-earth/70 shrink-0" strokeWidth={1.8} />
              <div className="flex-1">
                <p className="text-sm font-bold text-text-main">Voice Settings</p>
                <p className="text-xs text-text-secondary font-medium">Speech rate, language, output</p>
              </div>
              <ChevronRight className="w-4 h-4 text-brown-earth/40" />
            </button>
          </Card>
        </div>

        {/* Notifications */}
        <div>
          <p className="text-[10px] font-bold text-brown-earth uppercase tracking-widest mb-3">Notifications</p>
          <Card padding="none" className="divide-y divide-brown-pastel/20 border-brown-pastel/30 bg-white shadow-sm">
            {[
              { label: 'Weather Alerts', desc: 'Rain, storms, and extreme events', value: notifWeather, setter: setNotifWeather },
              { label: 'Disease Warnings', desc: 'High-risk disease conditions', value: notifDisease, setter: setNotifDisease },
              { label: 'Irrigation Reminders', desc: 'Scheduled irrigation checks', value: notifIrrigation, setter: setNotifIrrigation },
              { label: 'AI Recommendations', desc: 'Daily farm intelligence updates', value: notifAI, setter: setNotifAI },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 px-4 py-3.5">
                <Bell className="w-5 h-5 text-brown-earth/70 shrink-0" strokeWidth={1.8} />
                <div className="flex-1">
                  <p className="text-sm font-bold text-text-main">{item.label}</p>
                  <p className="text-xs text-text-secondary font-medium">{item.desc}</p>
                </div>
                <Toggle checked={item.value} onChange={v => { item.setter(v); toast.info(`${item.label} ${v ? 'enabled' : 'disabled'}.`) }} label={item.label} />
              </div>
            ))}
          </Card>
        </div>

        {/* App Preferences */}
        <div>
          <p className="text-[10px] font-bold text-brown-earth uppercase tracking-widest mb-3">App Preferences</p>
          <Card padding="none" className="divide-y divide-brown-pastel/20 border-brown-pastel/30 bg-white shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Moon className="w-5 h-5 text-brown-earth/70 shrink-0" strokeWidth={1.8} />
              <div className="flex-1">
                <p className="text-sm font-bold text-text-main">Dark Mode</p>
                <p className="text-xs text-text-secondary font-medium">Coming in next update</p>
              </div>
              <Toggle checked={darkMode} onChange={v => { setDarkMode(v); toast.info('Dark mode coming soon!') }} label="Dark mode" />
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Wifi className="w-5 h-5 text-brown-earth/70 shrink-0" strokeWidth={1.8} />
              <div className="flex-1">
                <p className="text-sm font-bold text-text-main">Offline Mode</p>
                <p className="text-xs text-text-secondary font-medium">Cache farm data for offline use</p>
              </div>
              <Toggle checked={offlineMode} onChange={v => { setOfflineMode(v); toast.info(`Offline mode ${v ? 'enabled' : 'disabled'}.`) }} label="Offline mode" />
            </div>
          </Card>
        </div>

        {/* Privacy & Data */}
        <div>
          <p className="text-[10px] font-bold text-brown-earth uppercase tracking-widest mb-3">Privacy & Data</p>
          <Card padding="none" className="divide-y divide-brown-pastel/20 border-brown-pastel/30 bg-white shadow-sm">
            <button onClick={() => toast.info('Privacy policy opens in browser.')} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-green-pastel/10 transition-colors text-left">
              <Shield className="w-5 h-5 text-brown-earth/70 shrink-0" strokeWidth={1.8} />
              <span className="flex-1 text-sm font-bold text-text-main">Privacy Policy</span>
              <ChevronRight className="w-4 h-4 text-brown-earth/40" />
            </button>
            <button onClick={() => toast.success('Farm data downloaded.')} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-green-pastel/10 transition-colors text-left">
              <Download className="w-5 h-5 text-brown-earth/70 shrink-0" strokeWidth={1.8} />
              <div className="flex-1">
                <p className="text-sm font-bold text-text-main">Export My Data</p>
                <p className="text-xs text-text-secondary font-medium">Download your farm history</p>
              </div>
              <ChevronRight className="w-4 h-4 text-brown-earth/40" />
            </button>
            <button onClick={() => toast.warning('This will delete all local data.')} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 transition-colors text-left">
              <Trash2 className="w-5 h-5 text-muted-danger shrink-0" strokeWidth={1.8} />
              <div className="flex-1">
                <p className="text-sm font-bold text-muted-danger">Clear Local Data</p>
                <p className="text-xs text-brown-earth/60 font-medium">Remove all cached farm data</p>
              </div>
              <ChevronRight className="w-4 h-4 text-brown-earth/40" />
            </button>
          </Card>
        </div>

        {/* About */}
        <button onClick={() => navigate('/about')} className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-brown-pastel/30 hover:bg-green-pastel/10 transition-colors shadow-sm text-left">
          <Info className="w-5 h-5 text-brown-earth/70" strokeWidth={1.8} />
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-text-main">About Cropoctor</p>
            <p className="text-xs text-text-secondary font-medium">Version 1.0.0 · Agricultural Intelligence Platform</p>
          </div>
          <ChevronRight className="w-4 h-4 text-brown-earth/40" />
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 border border-red-100 rounded-2xl text-muted-danger font-bold hover:bg-red-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </PageLayout>
    </motion.div>
  )
}

export default SettingsPage
