import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Globe, Flag, Mic, Bell, HelpCircle, Info, LogOut, Sprout, UserCheck, Camera, Trash2, X, Check } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useUser } from '@/store/UserContext'
import { useApp } from '@/store/AppContext'
import { useFarm } from '@/store/FarmContext'
import { useTranslation } from 'react-i18next'
import { userService } from '@/services/userService'
import { compressAvatarPhoto } from '@/utils/imageCompressor'

const EXPERIENCE_OPTIONS = [
  { id: 'beginner', title: 'Beginner', subtitle: '0–3 years' },
  { id: 'intermediate', title: 'Intermediate', subtitle: '3–10 years' },
  { id: 'experienced', title: 'Experienced', subtitle: '10+ years' },
]

const ProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const { farmer, authUser, logout, updateFarmer } = useUser()
  const { toast, language } = useApp()
  const { farms } = useFarm()
  const { t } = useTranslation()

  // Profile Edit Modal State
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editExperience, setEditExperience] = useState('intermediate')
  const [editPhotoData, setEditPhotoData] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleOpenEdit = () => {
    setEditName(farmer?.name || authUser?.displayName || '')
    setEditExperience(farmer?.experience || 'intermediate')
    setEditPhotoData(farmer?.photoData || farmer?.avatarUrl || null)
    setIsEditing(true)
  }

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }
    try {
      const compressed = await compressAvatarPhoto(file, 160)
      setEditPhotoData(compressed)
      toast.success('Avatar photo loaded.')
    } catch (err) {
      console.error('[ProfilePage] Avatar compression error:', err)
      toast.error('Could not process photo.')
    }
  }

  const handleSaveProfileEdit = async () => {
    if (!editName.trim()) {
      toast.error('Name cannot be empty.')
      return
    }

    setSaving(true)
    const cleanName = editName.trim()

    try {
      // 1. Update local context state & localStorage instantly
      updateFarmer({
        name: cleanName,
        experience: editExperience as any,
        photoData: editPhotoData
      })

      // 2. Persist to Firestore if user is logged in
      if (authUser?.uid) {
        const { error } = await userService.saveUserProfile(authUser.uid, {
          name: cleanName,
          experience: editExperience,
          photoData: editPhotoData
        })
        if (error) {
          console.warn('[ProfilePage] Firestore sync warning:', error)
          toast.info('Profile saved locally.')
        } else {
          toast.success('Profile updated successfully!')
        }
      } else {
        toast.success('Profile updated!')
      }

      setIsEditing(false)
    } catch (err) {
      console.error('[ProfilePage] Edit save error:', err)
      toast.error('Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const farmsCountText = farms && farms.length > 0
    ? `${farms.length} ${farms.length === 1 ? 'farm registered' : 'farms registered'}`
    : 'No farms registered yet'

  const activePhoto = farmer?.photoData || farmer?.avatarUrl

  const getExperienceLabel = (exp?: string) => {
    switch (exp) {
      case 'beginner': return 'Beginner (0–3 yrs)'
      case 'experienced':
      case 'expert': return 'Experienced (10+ yrs)'
      case 'intermediate':
      default: return 'Intermediate (3–10 yrs)'
    }
  }

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
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl border-2 border-white/30 shrink-0 overflow-hidden">
              {activePhoto ? (
                <img src={activePhoto} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>👨‍🌾</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{farmer?.name || authUser?.displayName || 'Farmer'}</h2>
              <p className="text-green-pastel text-sm truncate">{farmer?.email || authUser?.email || 'No email provided'}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 text-xs text-green-pastel/90 bg-white/10 px-2.5 py-0.5 rounded-full">
                  <UserCheck className="w-3 h-3 text-green-pastel" />
                  <span className="capitalize">{getExperienceLabel(farmer?.experience)}</span>
                </span>
              </div>
            </div>
            <button
              onClick={handleOpenEdit}
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

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-brown-pastel/30 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Edit Farmer Profile</h3>
                <button onClick={() => setIsEditing(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />

              {/* Avatar Selector */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-green-light flex items-center justify-center text-3xl border-4 border-white shadow-card overflow-hidden">
                    {editPhotoData ? (
                      <img src={editPhotoData} alt="Edit Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>👨‍🌾</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-7 h-7 bg-green-forest hover:bg-green-soft rounded-full flex items-center justify-center text-white text-xs shadow border-2 border-white"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-green-forest hover:underline"
                  >
                    {editPhotoData ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {editPhotoData && (
                    <button
                      type="button"
                      onClick={() => setEditPhotoData(null)}
                      className="text-xs font-semibold text-muted-danger hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Full Name */}
              <Input
                label="Full Name"
                placeholder="e.g. Rahul Patel"
                value={editName}
                onChange={e => setEditName(e.target.value)}
              />

              {/* Farming Experience */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Farming Experience</label>
                <div className="space-y-2">
                  {EXPERIENCE_OPTIONS.map(opt => {
                    const isSel = editExperience === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setEditExperience(opt.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all ${
                          isSel
                            ? 'border-green-forest bg-green-light/40'
                            : 'border-gray-200 bg-white hover:border-green-pastel'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-gray-800">{opt.title}</p>
                          <p className="text-[11px] text-gray-500 font-medium">{opt.subtitle}</p>
                        </div>
                        {isSel && (
                          <div className="w-4 h-4 rounded-full bg-green-forest text-white flex items-center justify-center text-[10px]">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" fullWidth onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button variant="primary" fullWidth onClick={handleSaveProfileEdit} disabled={saving || !editName.trim()}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default ProfilePage
