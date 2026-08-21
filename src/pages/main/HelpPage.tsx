import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, ChevronDown, ChevronRight, MessageCircle, BookOpen, Phone, Mail, Bug, Star, ExternalLink } from 'lucide-react'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { useApp } from '@/store/AppContext'
import { useTranslation } from 'react-i18next'

const FAQS = [
  {
    q: 'How does the AI Crop Doctor work?',
    a: 'The Crop Doctor analyzes photos of your crops using computer vision to identify diseases, pests, and nutrient deficiencies. Simply take a clear photo of affected leaves or plants and the AI will diagnose the issue with confidence scores and treatment recommendations.',
  },
  {
    q: 'Is my farm data private and secure?',
    a: 'Yes. Your farm data is encrypted and stored securely. We never sell your data. Location, crop, and health data is used only to generate personalized AI recommendations for your farm.',
  },
  {
    q: 'How accurate is the AI weather interpretation?',
    a: 'Weather data is sourced from meteorological APIs and interpreted by AI specifically for your farm. Recommendations account for your crop type, growth stage, and soil conditions. Demo mode shows representative data.',
  },
  {
    q: 'Can I use CropDoctor offline?',
    a: 'Yes. Core features including your farm data, recent AI advice, and saved diagnoses are cached for offline use. Weather and new AI recommendations require an internet connection.',
  },
  {
    q: 'Which languages are supported?',
    a: 'CropDoctor supports English, Hindi (हिन्दी), and Gujarati (ગુજરાતી) currently. Voice input and output work in all three languages. More languages are planned.',
  },
  {
    q: 'How do I add multiple farms?',
    a: 'Tap the "My Farm" section and use the "+ Add New Farm" button. You can manage multiple farms and switch between them. Each farm has its own crop, soil, and location profile.',
  },
]

const GUIDES = [
  { icon: '📸', title: 'Getting the Best Crop Photos', desc: 'Tips for clear photos that improve diagnosis accuracy.' },
  { icon: '🌾', title: 'Setting Up Your Farm Profile', desc: 'How to configure crop stage, soil type, and location.' },
  { icon: '🤖', title: 'Getting the Most from AI Advisor', desc: 'How to ask better questions for better recommendations.' },
  { icon: '🌦️', title: 'Understanding Farm Impact Scores', desc: 'What weather impact levels mean for your farm actions.' },
]

const HelpPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useApp()
  const { t } = useTranslation()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const filteredFaqs = FAQS.filter(f =>
    f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title={t('settings.items.help', 'Help & Support')} onBack={() => navigate(-1)} />

      <PageLayout className="pt-4 pb-8 space-y-6">
        <div className="hidden lg:block mb-2">
          <h1 className="text-2xl font-bold text-gray-800">{t('settings.items.help', 'Help & Support')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('help.subtitle', 'Answers, guides, and ways to reach us.')}</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('help.searchPlaceholder', 'Search help articles…')}
            className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-forest/30 focus:border-green-forest"
          />
        </div>

        {/* Quick guides */}
        {!search && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t('help.quickGuides', 'Quick Guides')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GUIDES.map(guide => (
                <button key={guide.title} onClick={() => toast.info('Full guide coming soon!')}
                  className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-card hover:border-green-pastel/30 transition-all text-left">
                  <span className="text-2xl shrink-0">{guide.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{guide.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{guide.desc}</p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t('help.faqTitle', 'Frequently Asked Questions')}</p>
          {filteredFaqs.length === 0 ? (
            <Card padding="md" className="text-center">
              <p className="text-gray-400 text-sm">{t('help.noResults', 'No results found for')} "{search}"</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredFaqs.map((faq, i) => (
                <Card key={i} padding="none" className="overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-green-light/20 transition-colors"
                  >
                    <span className="flex-1 text-sm font-semibold text-gray-800">{faq.q}</span>
                    <motion.span animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    </motion.span>
                  </button>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4 border-t border-gray-100"
                    >
                      <p className="text-sm text-gray-600 pt-3 leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Contact options */}
        {!search && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t('help.contactSupport', 'Contact Support')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: MessageCircle, label: 'Chat', desc: 'Talk to support', color: 'bg-green-light text-green-forest', action: () => toast.info('Opening chat…') },
                { icon: Mail,          label: 'Email', desc: 'support@cropdoctor.ai', color: 'bg-blue-50 text-blue-600', action: () => toast.info('Opening email…') },
                { icon: Phone,         label: 'Call', desc: 'Toll-free helpline', color: 'bg-amber-50 text-muted-warning', action: () => toast.info('Calling support…') },
              ].map(({ icon: Icon, label, desc, color, action }) => (
                <button key={label} onClick={action}
                  className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-card transition-all">
                  <div className={`w-10 h-10 rounded-2xl ${color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-gray-800 text-sm">{label}</p>
                  <p className="text-xs text-gray-400 text-center">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rate app */}
        {!search && (
          <button onClick={() => toast.success('Thank you for your feedback! 🌱')}
            className="w-full flex items-center gap-3 px-4 py-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl border border-amber-200 hover:opacity-90 transition-opacity">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <div className="text-left">
              <p className="font-semibold text-amber-800">{t('help.rateApp', 'Rate CropDoctor')}</p>
              <p className="text-xs text-amber-600">{t('help.rateFeedback', 'Your feedback helps us improve for farmers.')}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-400 ml-auto" />
          </button>
        )}

        {/* Report a bug */}
        {!search && (
          <button onClick={() => toast.info('Bug report submitted. Thank you!')}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:bg-red-50 transition-colors">
            <Bug className="w-5 h-5 text-muted-danger" strokeWidth={1.8} />
            <span className="flex-1 text-sm font-medium text-gray-700 text-left">{t('help.reportBug', 'Report a Bug')}</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
        )}
      </PageLayout>
    </motion.div>
  )
}

export default HelpPage
