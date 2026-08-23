import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, ArrowLeft } from 'lucide-react'
import { listVariants, cardVariants, pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { COUNTRIES } from '@/config/countries'
import { useTranslation } from 'react-i18next'
import { useUser } from '@/store/UserContext'
import { useApp } from '@/store/AppContext'
import { userService } from '@/services/userService'

const CountryPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { farmer, authUser, isAuthenticated, updateFarmer } = useUser()
  const { toast } = useApp()

  const findCountryCode = (countryNameOrCode?: string): string => {
    if (!countryNameOrCode) return 'IN'
    const matched = COUNTRIES.find(
      c => c.code === countryNameOrCode || c.name.toLowerCase() === countryNameOrCode.toLowerCase()
    )
    return matched ? matched.code : 'IN'
  }

  const [selected, setSelected] = useState(() => findCountryCode(farmer?.country))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (farmer?.country) {
      setSelected(findCountryCode(farmer.country))
    }
  }, [farmer?.country])

  const handleSaveCountry = async () => {
    const countryObj = COUNTRIES.find(c => c.code === selected) || COUNTRIES[0]
    setSaving(true)

    try {
      // 1. Update local farmer context & localStorage ('cropoctor-farmer')
      updateFarmer({ country: countryObj.name })

      // 2. Persist to Firestore if user is authenticated
      if (authUser?.uid) {
        const { error } = await userService.saveUserCountry(authUser.uid, countryObj.name)
        if (error) {
          console.warn('[CountryPage] Error saving country to Firestore:', error)
          toast.error('Failed to sync country online. Saved locally.')
        } else {
          toast.success(`Country updated to ${countryObj.name} ${countryObj.flag}`)
        }
      } else {
        toast.success(`Country set to ${countryObj.name} ${countryObj.flag}`)
      }

      // 3. Navigate appropriately: return to Profile/previous page if authenticated, else go to login
      if (isAuthenticated) {
        navigate('/profile')
      } else {
        navigate('/login')
      }
    } catch (err: any) {
      console.error('[CountryPage] Exception saving country selection:', err)
      toast.error('Unable to save country selection.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-cream flex flex-col">
      <div className="px-6 pt-6 pb-4">
        {isAuthenticated && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-brown-earth/80 font-semibold mb-4 hover:text-green-forest transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        )}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🌿</span>
          <span className="text-xl font-bold text-green-forest">Cropoctor</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{t('country.title', 'Select Country')}</h1>
        <p className="text-gray-500 text-sm">{t('country.subtitle', 'Choose your primary farming region')}</p>
      </div>

      <motion.div
        variants={listVariants} animate="animate"
        className="flex-1 px-6 pb-32"
      >
        {/* BRICS Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {COUNTRIES.map(country => (
            <motion.button
              key={country.code}
              variants={cardVariants}
              onClick={() => setSelected(country.code)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-150 ${
                selected === country.code
                  ? 'border-green-forest bg-green-light shadow-card'
                  : 'border-transparent bg-white hover:border-green-pastel shadow-sm'
              }`}
            >
              {selected === country.code && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-green-forest flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <span className="text-4xl">{country.flag}</span>
              <p className="text-xs font-semibold text-gray-700 text-center leading-tight">{country.name}</p>
            </motion.button>
          ))}
        </div>

        <p className="mt-6 text-xs text-center text-gray-400 px-4">
          🌍 Cropoctor supports all 11 BRICS countries with localized crop, soil, and weather insights.
        </p>
      </motion.div>

      <div className="fixed bottom-0 left-0 right-0 px-6 py-6 bg-cream/95 backdrop-blur-sm border-t border-gray-100">
        <Button variant="primary" size="xl" fullWidth onClick={handleSaveCountry} disabled={saving}>
          {saving ? 'Saving...' : t('country.continue', 'Save & Continue')}
        </Button>
      </div>
    </motion.div>
  )
}

export default CountryPage
