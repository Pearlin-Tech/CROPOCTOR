import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Mail, Bug, Stethoscope, Sprout, Sparkles, HelpCircle } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { useApp } from '@/store/AppContext'
import { useTranslation } from 'react-i18next'

interface GuideStep {
  icon: React.ElementType
  title: string
  steps: string[]
}

const GETTING_STARTED_GUIDES: GuideStep[] = [
  {
    icon: Stethoscope,
    title: 'Diagnose a Crop',
    steps: [
      'Open Diagnose from the bottom navigation or home screen.',
      'Take a clear crop-leaf photo in bright natural light or select one from your gallery.',
      'Tap "Diagnose Crop" to analyze.',
      'Review identified crop, possible condition, confidence %, severity, symptoms, and remedies.',
      'For uncertain or serious conditions, consult a local agricultural extension officer for expert review.'
    ]
  },
  {
    icon: Sprout,
    title: 'Set Up Your Farm',
    steps: [
      'Open My Farms from the menu or profile.',
      'Tap "+ Add New Farm" to register a field.',
      'Enter available farm details: primary crop, soil type, location, acreage, and crop growth stage.',
      'Save your farm to receive tailored AI recommendations and weather alerts.'
    ]
  },
  {
    icon: Sparkles,
    title: 'Use AI Advisor',
    steps: [
      'Open AI Advisor from the home screen or navigation menu.',
      'Ask questions about crop care, pest management, irrigation timing, and weather impact.',
      'Provide specific crop and field details to receive customized agronomic advice.'
    ]
  }
]

const FAQS = [
  {
    q: 'How does Crop Doctor work?',
    a: 'Crop Doctor analyzes foliage photographs using serverless Gemini Multimodal AI to detect visual plant pathology, severity levels, symptoms, and safe treatment practices.'
  },
  {
    q: 'How accurate is the AI diagnosis?',
    a: 'Diagnostic accuracy depends on photo clarity and natural daylight. High visual confidence indicates strong visual pattern matches, while uncertain cases recommend local expert confirmation.'
  },
  {
    q: 'Can I use CROPOCTOR offline?',
    a: 'Yes. Saved farm history, recent advice, and cached profile data remain accessible offline. Capturing new AI diagnoses or live weather updates requires an active internet connection.'
  },
  {
    q: 'Which languages are supported?',
    a: 'CROPOCTOR supports 10 languages including English, Arabic, Hindi, Gujarati, Portuguese, Russian, Chinese, Amharic, Persian, and Indonesian with text and speech audio readouts.'
  },
  {
    q: 'How do I manage multiple farms?',
    a: 'Open My Farms from the menu or profile and tap "+ Add New Farm" to register separate crops, soil types, acreage, and location boundaries for each field.'
  }
]

const HelpPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useApp()
  const { t } = useTranslation()

  const [openGuide, setOpenGuide] = useState<number | null>(0)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleEmailSupport = () => {
    const mailtoUrl = 'mailto:support@cropdoctor.ai?subject=CROPOCTOR%20Support%20Request'
    try {
      window.location.href = mailtoUrl
    } catch {
      toast.info('Support email: support@cropdoctor.ai')
    }
  }

  const handleReportBug = () => {
    const mailtoUrl = 'mailto:support@cropdoctor.ai?subject=CROPOCTOR%20Bug%20Report&body=Please%20describe%20the%20issue%20you%20encountered:'
    try {
      window.location.href = mailtoUrl
    } catch {
      toast.info('Report bugs to: support@cropdoctor.ai')
    }
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title={t('settings.items.help', 'Help & Support')} onBack={() => navigate(-1)} />

      <PageLayout className="pt-4 pb-8 space-y-5 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-green-forest tracking-tight">Help & Support</h1>
          <p className="text-xs lg:text-sm text-brown-earth/80 font-medium mt-0.5">
            Find quick answers and learn how to use CROPOCTOR.
          </p>
        </div>

        {/* SECTION 1 — Getting Started */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-brown-earth/80 uppercase tracking-wider px-1">Getting Started</p>
          <div className="space-y-2">
            {GETTING_STARTED_GUIDES.map((guide, idx) => {
              const Icon = guide.icon
              const isOpen = openGuide === idx

              return (
                <Card key={guide.title} padding="none" className="overflow-hidden border-brown-pastel/30 bg-white shadow-sm">
                  <button
                    onClick={() => setOpenGuide(isOpen ? null : idx)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-green-pastel/10 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-green-pastel/20 flex items-center justify-center shrink-0 border border-green-pastel/30">
                      <Icon className="w-4 h-4 text-green-forest" />
                    </div>
                    <span className="flex-1 text-sm font-bold text-text-main">{guide.title}</span>
                    <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-4 h-4 text-brown-earth/40 shrink-0" />
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="px-4 pb-4 border-t border-brown-pastel/20 bg-cream/30"
                      >
                        <ol className="space-y-2 pt-3 text-xs text-text-secondary font-medium">
                          {guide.steps.map((step, stepIdx) => (
                            <li key={stepIdx} className="flex gap-2.5 leading-relaxed">
                              <span className="w-5 h-5 rounded-full bg-green-forest/10 text-green-forest text-[11px] font-bold flex items-center justify-center shrink-0">
                                {stepIdx + 1}
                              </span>
                              <span className="mt-0.5">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )
            })}
          </div>
        </div>

        {/* SECTION 2 — Frequently Asked Questions */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-brown-earth/80 uppercase tracking-wider px-1">Frequently Asked Questions</p>
          <div className="space-y-2">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i

              return (
                <Card key={faq.q} padding="none" className="overflow-hidden border-brown-pastel/30 bg-white shadow-sm">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-green-pastel/10 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-brown-earth/60 shrink-0" />
                    <span className="flex-1 text-xs lg:text-sm font-bold text-text-main">{faq.q}</span>
                    <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-4 h-4 text-brown-earth/40 shrink-0" />
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-4 pb-3.5 border-t border-brown-pastel/20 bg-off-white"
                      >
                        <p className="text-xs text-text-secondary pt-3 leading-relaxed font-medium">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )
            })}
          </div>
        </div>

        {/* SECTION 3 — Contact Support */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-brown-earth/80 uppercase tracking-wider px-1">Contact Support</p>
          <Card padding="md" className="border-brown-pastel/30 bg-white shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-text-main text-xs lg:text-sm">Email Support</p>
                <p className="text-xs text-text-secondary font-medium">support@cropdoctor.ai</p>
              </div>
            </div>
            <button
              onClick={handleEmailSupport}
              className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors shrink-0"
            >
              Send Email
            </button>
          </Card>
        </div>

        {/* SECTION 4 — Report a Bug */}
        <div className="space-y-2 pt-1">
          <p className="text-xs font-bold text-brown-earth/80 uppercase tracking-wider px-1">App Feedback</p>
          <button
            onClick={handleReportBug}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-red-50/60 border border-brown-pastel/30 rounded-2xl transition-colors shadow-sm text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
              <Bug className="w-4 h-4 text-muted-danger" />
            </div>
            <div className="flex-1">
              <p className="text-xs lg:text-sm font-bold text-text-main group-hover:text-muted-danger transition-colors">Report a Bug</p>
              <p className="text-[11px] text-text-secondary font-medium">Submit issues or error reports to support@cropdoctor.ai</p>
            </div>
          </button>
        </div>
      </PageLayout>
    </motion.div>
  )
}

export default HelpPage
