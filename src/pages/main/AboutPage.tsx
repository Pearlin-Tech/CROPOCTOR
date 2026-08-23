import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Stethoscope, Sparkles, CloudSun, Sprout, History, AlertTriangle, ShieldCheck, Camera, Cpu, BookOpen, CheckCircle2 } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { useTranslation } from 'react-i18next'

const CAPABILITIES = [
  {
    icon: Stethoscope,
    title: 'Crop Doctor',
    desc: 'AI-assisted crop leaf image analysis. Shows possible disease, symptoms, confidence, severity, and recommendations.'
  },
  {
    icon: Sparkles,
    title: 'AI Advisor',
    desc: 'Conversational agricultural guidance. Helps with crop care, pests, irrigation, weather, and farming questions.'
  },
  {
    icon: CloudSun,
    title: 'Weather Insights',
    desc: 'Helps farmers understand weather conditions and their potential impact on farm activities.'
  },
  {
    icon: Sprout,
    title: 'Farm Management',
    desc: 'Lets farmers manage information about multiple farms and crops.'
  },
  {
    icon: History,
    title: 'Farm History',
    desc: 'Lets farmers review previous crop diagnosis results and farm-related records.'
  }
]

const WORKFLOW_STEPS = [
  {
    step: '1',
    icon: Camera,
    title: 'Capture',
    desc: 'Take or upload a clear crop leaf image.'
  },
  {
    step: '2',
    icon: Cpu,
    title: 'Analyze',
    desc: 'CROPOCTOR processes the image using its AI diagnosis system.'
  },
  {
    step: '3',
    icon: BookOpen,
    title: 'Understand',
    desc: 'Review detected crop, disease, symptoms, confidence, and severity.'
  },
  {
    step: '4',
    icon: CheckCircle2,
    title: 'Act',
    desc: 'Use the recommendations and prevention guidance to decide the next step.'
  }
]

const AboutPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title={t('settings.items.about', 'About CROPOCTOR')} onBack={() => navigate(-1)} />

      <PageLayout className="pt-4 pb-8 space-y-5 max-w-4xl mx-auto">
        {/* Desktop Title Header */}
        <div className="hidden lg:block mb-1">
          <h1 className="text-2xl font-bold text-green-forest tracking-tight">{t('settings.items.about', 'About CROPOCTOR')}</h1>
          <p className="text-sm text-brown-earth/80 font-medium">Smarter decisions for every farm</p>
        </div>

        {/* 1. HERO */}
        <Card className="bg-gradient-to-br from-green-forest to-green-soft text-white border-none shadow-md" padding="lg">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🌿</span>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">CROPOCTOR</h2>
              <p className="text-green-pastel text-xs font-semibold italic">"Smarter decisions for every farm."</p>
            </div>
          </div>
          <p className="text-xs lg:text-sm text-green-pastel/95 leading-relaxed font-medium pt-1">
            CROPOCTOR is an AI-powered agricultural assistant designed to help farmers make faster and more informed decisions about crop health, farm management, weather, and everyday farming questions.
          </p>
        </Card>

        {/* 2. WHAT CROPOCTOR HELPS WITH */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-brown-earth/80 uppercase tracking-wider px-1">What CROPOCTOR Helps With</p>
          <Card padding="none" className="overflow-hidden divide-y divide-brown-pastel/20 border-brown-pastel/30 bg-white shadow-sm">
            {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3.5 px-4 py-3.5">
                <div className="w-8 h-8 rounded-xl bg-green-pastel/20 flex items-center justify-center shrink-0 mt-0.5 border border-green-pastel/30">
                  <Icon className="w-4 h-4 text-green-forest" />
                </div>
                <div>
                  <h3 className="text-xs lg:text-sm font-bold text-text-main">{title}</h3>
                  <p className="text-xs text-text-secondary font-medium leading-relaxed mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* 3. HOW IT WORKS */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-brown-earth/80 uppercase tracking-wider px-1">How It Works</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {WORKFLOW_STEPS.map(({ step, icon: Icon, title, desc }) => (
              <Card key={title} padding="sm" className="border-brown-pastel/30 bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-6 h-6 rounded-full bg-green-forest text-white text-xs font-bold flex items-center justify-center">
                      {step}
                    </span>
                    <Icon className="w-4 h-4 text-green-forest" />
                  </div>
                  <h4 className="text-xs lg:text-sm font-bold text-text-main mb-1">{title}</h4>
                  <p className="text-[11px] lg:text-xs text-text-secondary leading-snug font-medium">{desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 4. AI DISCLAIMER */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-brown-earth/80 uppercase tracking-wider px-1">Important Notice</p>
          <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/80 shadow-sm text-left">
            <div className="flex items-center gap-2 mb-2 text-amber-800 font-bold text-xs lg:text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>AI-assisted guidance</span>
            </div>
            <p className="text-xs text-amber-900/90 leading-relaxed font-medium mb-2">
              CROPOCTOR uses artificial intelligence to provide agricultural guidance and crop-health assessments. AI results may be incorrect, especially when images are unclear, symptoms are unusual, or multiple conditions look similar.
            </p>
            <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
              For serious crop damage, uncertain diagnoses, or high-risk agricultural decisions, farmers should consult a qualified agricultural expert or local agricultural authority.
            </p>
          </div>
        </div>

        {/* 5. PRIVACY / DATA NOTE */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-brown-earth/80 uppercase tracking-wider px-1">Privacy & Data Handling</p>
          <Card padding="md" className="border-brown-pastel/30 bg-white shadow-sm flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-green-forest shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary leading-relaxed font-medium">
              Your farm data is processed to generate personalized agronomic insights. Diagnostic images are processed temporarily in memory to analyze crop health and are not retained as high-resolution files.
            </p>
          </Card>
        </div>

        {/* 6. VERSION & COPYRIGHT */}
        <div className="text-center pt-2 pb-4 space-y-1">
          <p className="text-xs font-bold text-brown-earth/80">CROPOCTOR</p>
          <p className="text-[11px] text-text-secondary font-medium">Version 1.0.0</p>
          <p className="text-[11px] text-brown-earth/60 font-medium">© 2026 CROPOCTOR. All rights reserved.</p>
        </div>
      </PageLayout>
    </motion.div>
  )
}

export default AboutPage
