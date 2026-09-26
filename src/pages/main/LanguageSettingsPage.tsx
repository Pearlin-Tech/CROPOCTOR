import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useApp } from '@/store/AppContext'
import { useUser } from '@/store/UserContext'
import { userService } from '@/services/userService'
import i18n from '@/locales/i18n'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'pt-BR', name: 'Portuguese', native: 'Português' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'zh-CN', name: 'Chinese', native: '简体中文' },
  { code: 'am', name: 'Amharic', native: 'አማርኛ' },
  { code: 'fa', name: 'Persian', native: 'فارسی' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
]

const LanguageSettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const { language, setLanguage } = useApp()
  const { authUser, updateFarmer } = useUser()
  const { t } = useTranslation()

  const handleLang = async (code: string) => {
    setLanguage(code)
    i18n.changeLanguage(code)
    updateFarmer({ preferredLanguage: code, language: code })
    if (authUser?.uid) {
      await userService.saveUserLanguage(authUser.uid, code)
    }
    navigate(-1)
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title={t('profile.language')} onBack={() => navigate(-1)} />
      <PageLayout className="pt-4 pb-8 space-y-4">
        <h1 className="hidden lg:block text-2xl font-bold text-gray-800 mb-6">{t('profile.language')}</h1>
        <Card padding="md">
           <div className="space-y-2">
             {LANGUAGES.map(l => (
               <Button key={l.code} variant={language === l.code ? 'primary' : 'outline'} fullWidth onClick={() => handleLang(l.code)}>
                 {l.native}
               </Button>
             ))}
           </div>
        </Card>
      </PageLayout>
    </motion.div>
  )
}

export default LanguageSettingsPage
