import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useApp } from '@/store/AppContext'
import i18n from '@/locales/i18n'

const LanguageSettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const { language, setLanguage } = useApp()

  const handleLang = (code: string) => {
    setLanguage(code)
    i18n.changeLanguage(code)
    navigate(-1)
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title="Language" onBack={() => navigate(-1)} />
      <PageLayout className="pt-4 pb-8 space-y-4">
        <h1 className="hidden lg:block text-2xl font-bold text-gray-800 mb-6">Language</h1>
        <Card padding="md">
           <div className="space-y-2">
             {['en', 'hi', 'gu'].map(l => (
               <Button key={l} variant={language === l ? 'primary' : 'outline'} fullWidth onClick={() => handleLang(l)}>
                 {l === 'en' ? 'English' : l === 'hi' ? 'हिन्दी (Hindi)' : 'ગુજરાતી (Gujarati)'}
               </Button>
             ))}
           </div>
        </Card>
      </PageLayout>
    </motion.div>
  )
}

export default LanguageSettingsPage
