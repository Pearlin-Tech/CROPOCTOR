import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, Globe, Flag, Mic, Bell, HelpCircle, Info, LogOut, Sprout, UserCheck } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { useUser } from '@/store/UserContext'
import { useApp } from '@/store/AppContext'
import { useFarm } from '@/store/FarmContext'
import { useTranslation } from 'react-i18next'

const ProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const { farmer, authUser, logout } = useUser()
  const { toast, language } = useApp()
  const { farms } = useFarm()
  const { t } = useTranslation()

  const sections = [
    {
      title: t('profile.preferences', 'Preferences'),
      items: [
        { icon: Globe, label: t('profile.language', 'Language'), value: language.toUpperCase(), route: '/settings/language' },
        { icon: Flag,  label: t('profile.country', 'Country'), value: farmer?.country || 'India 🇮🇳', route: '/country' },
        { icon: Mic,   label: t('profile.voiceSettings', 'Voice Settings'), value: null, route: '/settings/voice' },
      ],
    },
    {
      title: t('profile.notificationsSection', 'Notifications'),
      items: [
        { icon: Bell,  label: t('profile.notifications', 'Notifications'), value: null, route: '/notifications' },
      ],
    },
    {
      title: t('profile.support', 'Support'),
      items: [
        { icon: HelpCircle, label: t('profile.help', 'Help & Support'), value: null, route: '/help' },
        { icon: Info,       label: t('profile.about', 'About Cropoctor'), value: 'v1.0.0', route: '/about' },
      ],
    },
  ]

  const handleLogout = () => {
    logout()
    navigate('/welcome')
    toast.info(t('auth.signedOut', 'You have been signed out.'))
  }

  const farmsCountText = farms && farms.length > 0
    ? `${farms.length} ${farms.length === 1 ? 'farm registered' : 'farms registered'}`
    : 'No farms registered yet'

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title={t('profile.title', 'Profile')} />

      <PageLayout className="pt-4 pb-8 space-y-4">
        {/* Desktop Header */}
        <div className="hidden lg:block mb-2">
          <h1 className="text-2xl font-bold text-green-forest tracking-tight">{t('profile.title', 'Profile')}</h1>
          <p className="text-sm text-brown-earth/80 font-medium">Manage your farmer profile, preferences, and account</p>
        </div>

        {/* Profile Header Card */}
        <Card className="bg-gradient-to-br from-green-forest to-green-soft text-white border-none shadow-md" padding="lg">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl border-2 border-white/30 shrink-0">
              👨‍🌾
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{farmer?.name || authUser?.displayName || 'Farmer'}</h2>
              <p className="text-green-pastel text-sm truncate">{farmer?.email || authUser?.email || 'No email provided'}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 text-xs text-green-pastel/90 bg-white/10 px-2.5 py-0.5 rounded-full">
                  <UserCheck className="w-3 h-3 text-green-pastel" />
                  <span className="capitalize">{farmer?.experience || 'Intermediate'} Farmer</span>
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/onboarding/profile')}
              className="px-3.5 py-1.5 bg-white/20 rounded-xl text-white text-xs font-semibold hover:bg-white/30 transition-colors shrink-0 border border-white/20"
            >
              {t('profile.edit', 'Edit')}
            </button>
          </div>
        </Card>

        {/* My Farms Card */}
        <Card padding="md" className="flex items-center justify-between cursor-pointer hover:shadow-card-lg transition-all border-brown-pastel/30 bg-white shadow-sm hover:border-green-pastel" onClick={() => navigate('/farms')}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-green-pastel/20 flex items-center justify-center text-xl shrink-0 border border-green-pastel/30">
              <Sprout className="w-5 h-5 text-green-forest" />
            </div>
            <div>
              <p className="font-bold text-text-main text-sm">{t('profile.myFarms', 'My Farms')}</p>
              <p className="text-xs text-text-secondary font-medium">{farmsCountText}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-brown-earth/40 shrink-0" />
        </Card>

        {/* Categorized Settings Sections */}
        {sections.map(section => (
          <div key={section.title} className="space-y-2">
            <p className="text-xs font-bold text-brown-earth/80 uppercase tracking-wider px-1">{section.title}</p>
            <Card padding="none" className="overflow-hidden divide-y divide-brown-pastel/20 border-brown-pastel/30 bg-white shadow-sm">
              {section.items.map(({ icon: Icon, label, value, route }) => (
                <button
                  key={label}
                  onClick={() => navigate(route)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-green-pastel/10 transition-colors text-left"
                >
                  <Icon className="w-5 h-5 text-brown-earth/70 shrink-0" strokeWidth={1.8} />
                  <span className="flex-1 text-sm font-bold text-text-main">{label}</span>
                  {value && <span className="text-xs font-semibold text-green-forest bg-green-pastel/20 px-2.5 py-1 rounded-full">{value}</span>}
                  <ChevronRight className="w-4 h-4 text-brown-earth/40 shrink-0" />
                </button>
              ))}
            </Card>
          </div>
        ))}

        {/* Sign Out Button */}
        <div className="pt-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 border border-red-200 rounded-2xl text-muted-danger font-bold hover:bg-red-100 transition-colors shadow-sm"
          >
            <LogOut className="w-4.5 h-4.5 text-muted-danger" />
            <span>{t('profile.logout', 'Sign Out')}</span>
          </button>
        </div>

        <p className="text-center text-xs text-brown-earth/60 font-medium pb-2">
          Cropoctor v1.0.0 · {t('app.brics', 'BRICS Agricultural Intelligence Platform')}
        </p>
      </PageLayout>
    </motion.div>
  )
}

export default ProfilePage
