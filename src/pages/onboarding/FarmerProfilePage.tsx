import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Camera, Trash2, Check, UserCheck } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useTranslation } from 'react-i18next'
import { useUser } from '@/store/UserContext'
import { useApp } from '@/store/AppContext'
import { userService } from '@/services/userService'
import { compressAvatarPhoto } from '@/utils/imageCompressor'

const EXPERIENCE_OPTIONS = [
  { id: 'beginner', title: 'Beginner', subtitle: '0–3 years' },
  { id: 'intermediate', title: 'Intermediate', subtitle: '3–10 years' },
  { id: 'experienced', title: 'Experienced', subtitle: '10+ years' },
]

const FarmerProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { farmer, authUser, updateFarmer, setOnboarded } = useUser()
  const { toast } = useApp()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(() => farmer?.name || authUser?.displayName || '')
  const [experience, setExperience] = useState<string>(() => farmer?.experience || 'intermediate')
  const [photoData, setPhotoData] = useState<string | null>(() => farmer?.photoData || farmer?.avatarUrl || null)
  const [saving, setSaving] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.')
      return
    }

    try {
      const compressed = await compressAvatarPhoto(file, 160)
      setPhotoData(compressed)
      toast.success('Profile picture updated.')
    } catch (err) {
      console.error('[FarmerProfilePage] Avatar compression error:', err)
      toast.error('Could not process selected photo.')
    }
  }

  const handleRemovePhoto = () => {
    setPhotoData(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    toast.info('Profile picture removed.')
  }

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error('Please enter your full name.')
      return
    }

    setSaving(true)

    try {
      const cleanName = name.trim()
      
      // 1. Update local farmer context & localStorage ('cropoctor-farmer')
      updateFarmer({
        name: cleanName,
        experience: experience as any,
        photoData: photoData
      })

      // 2. Persist to Firestore if user is authenticated
      if (authUser?.uid) {
        const { error } = await userService.saveUserProfile(authUser.uid, {
          name: cleanName,
          experience,
          photoData
        })
        if (error) {
          console.warn('[FarmerProfilePage] Firestore sync notice:', error)
          toast.info('Profile saved locally.')
        } else {
          toast.success('Profile saved successfully!')
        }
      } else {
        toast.success('Profile saved!')
      }

      // 3. Complete onboarding & route directly to main app /home
      setOnboarded(true)
      navigate('/home', { replace: true })
    } catch (err: any) {
      console.error('[FarmerProfilePage] Save error:', err)
      toast.error('Unable to save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-cream flex flex-col max-w-md mx-auto w-full px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">🌿</span>
        <span className="text-xl font-bold text-green-forest">Cropoctor</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-1">{t('profile.title', 'Profile Setup')}</h1>
      <p className="text-gray-500 text-sm mb-6">{t('profile.subtitle', 'Personalize your farming assistant account.')}</p>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Avatar Selector */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-green-light flex items-center justify-center text-4xl border-4 border-white shadow-card overflow-hidden">
            {photoData ? (
              <img src={photoData} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>👨‍🌾</span>
            )}
          </div>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 bg-green-forest hover:bg-green-soft rounded-full flex items-center justify-center text-white text-xs shadow-md transition-transform active:scale-95 border-2 border-white"
            title="Upload profile picture"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* Replace / Remove Controls */}
        <div className="flex gap-3 mt-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold text-green-forest hover:underline"
          >
            {photoData ? 'Change Photo' : 'Upload Photo'}
          </button>
          {photoData && (
            <>
              <span className="text-xs text-gray-300">•</span>
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-xs font-semibold text-muted-danger hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Remove
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6 flex-1">
        {/* Full Name */}
        <Input
          label={t('profile.name', 'Full Name')}
          placeholder="e.g. Rahul Patel"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />

        {/* Experience Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2.5">
            {t('profile.experience', 'Farming Experience')}
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {EXPERIENCE_OPTIONS.map(opt => {
              const isSelected = experience === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setExperience(opt.id)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-green-forest bg-green-light/40 shadow-sm'
                      : 'border-brown-pastel/30 bg-white hover:border-green-pastel'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-green-forest text-white' : 'bg-brown-pastel/20 text-brown-earth'}`}>
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{opt.title}</p>
                      <p className="text-xs text-gray-500 font-medium">{opt.subtitle}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-green-forest text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Button
          variant="primary" size="xl" fullWidth
          onClick={handleSaveProfile}
          disabled={!name.trim() || saving}
        >
          {saving ? 'Saving...' : 'Save Profile & Continue →'}
        </Button>
      </div>
    </motion.div>
  )
}

export default FarmerProfilePage
