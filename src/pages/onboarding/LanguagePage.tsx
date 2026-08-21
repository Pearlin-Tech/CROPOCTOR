import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Check } from 'lucide-react'
import { pageVariants, cardVariants, listVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { useApp } from '@/store/AppContext'
import i18n from '@/locales/i18n'

const LANGUAGES = [
  { code: 'en', name: 'English',    native: 'English',   flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi',      native: 'हिन्दी',    flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati',   native: 'ગુજરાતી',   flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi',    native: 'मराठी',     flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali',    native: 'বাংলা',     flag: '🇧🇩' },
  { code: 'ta', name: 'Tamil',      native: 'தமிழ்',    flag: '🇮🇳' },
  { code: 'te', name: 'Telugu',     native: 'తెలుగు',    flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada',    native: 'ಕನ್ನಡ',    flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam',  native: 'മലയാളം',    flag: '🇮🇳' },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  { code: 'ru', name: 'Russian',    native: 'Русский',   flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese',    native: '中文',       flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic',     native: 'العربية',   flag: '🇸🇦' },
  { code: 'fa', name: 'Persian',    native: 'فارسی',     flag: '🇮🇷' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'am', name: 'Amharic',    native: 'አማርኛ',      flag: '🇪🇹' },
]

const LanguagePage: React.FC = () => {
  const navigate = useNavigate()
  const { language, setLanguage } = useApp()
  const [selected, setSelected] = useState(language)
  const [query, setQuery]       = useState('')

  const filtered = query.trim()
    ? LANGUAGES.filter(l => l.name.toLowerCase().includes(query.toLowerCase()) || l.native.includes(query))
    : LANGUAGES

  const handleContinue = () => {
    setLanguage(selected)
    i18n.changeLanguage(selected)
    navigate('/country')
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">🌿</span>
          <span className="text-xl font-bold text-green-forest">Cropoctor</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Choose Language</h1>
        <p className="text-gray-500 text-sm">Select your preferred language.</p>
      </div>

      {/* Search */}
      <div className="px-6 mb-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search language..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-brown-soft/30 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-green-forest/30 focus:border-green-forest"
          />
        </div>
      </div>

      {/* Language list */}
      <motion.div
        variants={listVariants}
        animate="animate"
        className="flex-1 overflow-y-auto px-6 space-y-2 pb-32"
      >
        {filtered.map(lang => (
          <motion.button
            key={lang.code}
            variants={cardVariants}
            onClick={() => setSelected(lang.code)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-150 text-left ${
              selected === lang.code
                ? 'border-green-forest bg-green-light'
                : 'border-transparent bg-white hover:border-green-pastel'
            }`}
          >
            <span className="text-2xl">{lang.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800">{lang.native}</p>
              <p className="text-xs text-gray-400">{lang.name}</p>
            </div>
            {selected === lang.code && (
              <div className="w-6 h-6 rounded-full bg-green-forest flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </motion.button>
        ))}
      </motion.div>

      {/* Continue button */}
      <div className="fixed bottom-0 left-0 right-0 px-6 py-6 bg-cream/95 backdrop-blur-sm border-t border-gray-100">
        <Button variant="primary" size="xl" fullWidth onClick={handleContinue}>
          Continue
        </Button>
      </div>
    </motion.div>
  )
}

export default LanguagePage
