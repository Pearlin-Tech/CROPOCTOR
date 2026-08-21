import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, Globe, Flag, Ruler, Mic, Bell, Shield, Database, HelpCircle, Info, LogOut } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { useUser } from '@/store/UserContext'
import { useApp } from '@/store/AppContext'

const ProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const { farmer, logout } = useUser()
  const { toast } = useApp()

  const sections = [
    {
      title: 'Preferences',
      items: [
        { icon: Globe,    label: 'Language',        value: 'English', route: '/settings/language' },
        { icon: Flag,     label: 'Country',          value: 'India 🇮🇳', route: '/country' },
        { icon: Ruler,    label: 'Units',            value: 'Metric (acres, °C)', route: '/settings' },
        { icon: Mic,      label: 'Voice Settings',   value: null, route: '/settings/voice' },
      ],
    },
    {
      title: 'Notifications & Privacy',
      items: [
        { icon: Bell,     label: 'Notifications',    value: 'Enabled', route: '/settings' },
        { icon: Shield,   label: 'Privacy',          value: null, route: '/settings' },
        { icon: Database, label: 'Data Management',  value: null, route: '/settings' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help & Support', value: null, route: '/help' },
        { icon: Info,       label: 'About Cropoctor',  value: 'v1.0.0', route: '/about' },
      ],
    },
  ]

  const handleLogout = () => {
    logout()
    navigate('/welcome')
    toast.info('You have been signed out.')
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title="Profile & Settings" />

      <PageLayout className="pt-4 pb-8 space-y-4">
        {/* Profile card */}
        <Card className="bg-gradient-to-br from-green-forest to-green-soft text-white border-none" padding="lg">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl border-2 border-white/30">
              👨‍🌾
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{farmer?.name || 'Rahul Patel'}</h2>
              <p className="text-green-pastel text-sm">{farmer?.email || 'rahul@example.com'}</p>
              <p className="text-green-pastel/70 text-xs capitalize mt-0.5">
                {farmer?.country || 'India'} · {farmer?.experience || 'Intermediate'} farmer
              </p>
            </div>
            <button
              onClick={() => navigate('/onboarding/profile')}
              className="px-3 py-1.5 bg-white/20 rounded-xl text-white text-xs font-medium hover:bg-white/30 transition-colors shrink-0"
            >
              Edit
            </button>
          </div>
        </Card>

        {/* Farms summary */}
        <Card padding="md" className="flex items-center justify-between cursor-pointer hover:shadow-card-lg transition-shadow" onClick={() => navigate('/farms')}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏡</span>
            <div>
              <p className="font-semibold text-gray-800">My Farms</p>
              <p className="text-xs text-gray-400">2 farms registered</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </Card>

        {/* Settings sections */}
        {sections.map(section => (
          <div key={section.title}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">{section.title}</p>
            <Card padding="none" className="overflow-hidden divide-y divide-gray-50">
              {section.items.map(({ icon: Icon, label, value, route }) => (
                <button
                  key={label}
                  onClick={() => navigate(route)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-green-light/30 transition-colors text-left"
                >
                  <Icon className="w-5 h-5 text-gray-400 shrink-0" strokeWidth={1.8} />
                  <span className="flex-1 text-sm font-medium text-gray-700">{label}</span>
                  {value && <span className="text-xs text-gray-400">{value}</span>}
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
              ))}
            </Card>
          </div>
        ))}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 border border-red-100 rounded-2xl text-muted-danger font-semibold hover:bg-red-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

        <p className="text-center text-xs text-gray-300 pb-2">Cropoctor v1.0.0 · BRICS Agricultural Intelligence Platform</p>
      </PageLayout>
    </motion.div>
  )
}

export default ProfilePage
