import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mic, Volume2, Gauge, Globe2, ChevronRight } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/index'
import { useApp } from '@/store/AppContext'
import i18n from '@/locales/i18n'

const VoiceSettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const { language, setLanguage, toast } = useApp()
  const [speechRate, setSpeechRate]   = useState<'slow' | 'normal' | 'fast'>('normal')
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female')
  const [outputLang, setOutputLang]   = useState(language)

  const handleLangChange = (code: string) => {
    setOutputLang(code)
    setLanguage(code)
    i18n.changeLanguage(code)
    toast.success('Voice language updated.')
  }

  const testVoice = () => {
    const texts: Record<string, string> = {
      en: 'Hello! Your groundnut farm looks healthy today.',
      hi: 'नमस्ते! आपकी फसल आज स्वस्थ दिख रही है।',
      gu: 'નમસ્તે! આજે તમારો પાક તંદુરસ્ત દેખાય છે।',
    }
    const text = texts[outputLang] || texts['en']
    const rates: Record<string, number> = { slow: 0.7, normal: 1.0, fast: 1.4 }
    if (!window.speechSynthesis) { toast.error('Voice not supported on this device.'); return }
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = outputLang === 'hi' ? 'hi-IN' : outputLang === 'gu' ? 'gu-IN' : 'en-IN'
    utter.rate = rates[speechRate]
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => voiceGender === 'female' ? v.name.toLowerCase().includes('female') || v.name.includes('Raveena') : v.name.toLowerCase().includes('male'))
    if (preferred) utter.voice = preferred
    window.speechSynthesis.speak(utter)
    toast.info('Playing voice sample…')
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title="Voice Settings" onBack={() => navigate(-1)} />

      <PageLayout className="pt-4 pb-8 space-y-6">
        <h1 className="hidden lg:block text-2xl font-bold text-gray-800 mb-2">Voice Settings</h1>

        {/* Voice Language */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Globe2 className="w-4 h-4 text-green-forest" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Output Language</p>
          </div>
          <Card padding="md">
            <div className="grid grid-cols-1 gap-2">
              {[
                { code: 'en', label: 'English', sublabel: 'English (India)' },
                { code: 'hi', label: 'हिन्दी', sublabel: 'Hindi' },
                { code: 'gu', label: 'ગુજરાતી', sublabel: 'Gujarati' },
              ].map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLangChange(lang.code)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                    outputLang === lang.code
                      ? 'border-green-forest bg-green-light'
                      : 'border-transparent bg-off-white hover:border-green-pastel'
                  }`}
                >
                  <Globe2 className={`w-4 h-4 ${outputLang === lang.code ? 'text-green-forest' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <p className={`font-semibold ${outputLang === lang.code ? 'text-green-forest' : 'text-gray-700'}`}>{lang.label}</p>
                    <p className="text-xs text-gray-400">{lang.sublabel}</p>
                  </div>
                  {outputLang === lang.code && (
                    <span className="ml-auto w-5 h-5 rounded-full bg-green-forest text-white flex items-center justify-center text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Speech Rate */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="w-4 h-4 text-green-forest" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Speech Rate</p>
          </div>
          <Card padding="md">
            <div className="flex gap-2">
              {(['slow', 'normal', 'fast'] as const).map(rate => (
                <Chip
                  key={rate}
                  selected={speechRate === rate}
                  onClick={() => { setSpeechRate(rate); toast.info(`Speech rate: ${rate}`) }}
                  className="flex-1 justify-center"
                >
                  {rate === 'slow' ? '🐢 Slow' : rate === 'normal' ? '▶️ Normal' : '⚡ Fast'}
                </Chip>
              ))}
            </div>
          </Card>
        </div>

        {/* Voice Gender */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Mic className="w-4 h-4 text-green-forest" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI Voice Type</p>
          </div>
          <Card padding="md">
            <div className="flex gap-2">
              {(['female', 'male'] as const).map(g => (
                <Chip
                  key={g}
                  selected={voiceGender === g}
                  onClick={() => { setVoiceGender(g); toast.info(`Voice: ${g}`) }}
                  className="flex-1 justify-center"
                >
                  {g === 'female' ? '👩 Female' : '👨 Male'}
                </Chip>
              ))}
            </div>
          </Card>
        </div>

        {/* Test voice */}
        <button
          onClick={testVoice}
          className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-green-forest to-green-soft text-white rounded-2xl font-semibold hover:opacity-90 transition-opacity shadow-button"
        >
          <Volume2 className="w-5 h-5" />
          Test Voice Sample
        </button>

        <p className="text-xs text-center text-gray-400 px-4">
          Voice output uses your device's built-in speech engine. Quality depends on installed language packs.
        </p>
      </PageLayout>
    </motion.div>
  )
}

export default VoiceSettingsPage
