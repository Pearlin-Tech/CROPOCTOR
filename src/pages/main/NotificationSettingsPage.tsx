import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, BellOff, ShieldAlert } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { notificationService } from '@/services'
import { useTranslation } from 'react-i18next'
import { useUser } from '@/store/UserContext'

const NotificationSettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { authUser } = useUser()
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionState(Notification.permission)
    } else {
      setPermissionState('denied') // unsupported
    }
    setLoading(false)
  }, [])

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      alert(t('settings.notifications.unsupported', 'Your browser does not support notifications.'))
      return
    }

    // Call requestPermission synchronously to avoid browser blocking
    const permissionPromise = Notification.requestPermission()
    
    setLoading(true)
    try {
      const perm = await permissionPromise
      setPermissionState(perm)

      if (perm === 'granted' && authUser) {
        await notificationService.registerFCMToken()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title={t('settings.notifications.title', 'Notification Settings')} onBack={() => navigate(-1)} />
      
      <PageLayout className="pt-4 pb-8 space-y-4">
        <div className="hidden lg:block mb-4">
          <h1 className="text-2xl font-bold text-green-forest tracking-tight">{t('settings.notifications.title', 'Notification Settings')}</h1>
        </div>

        <Card padding="md" className="bg-white border border-brown-pastel/30">
          <div className="flex flex-col items-center text-center p-4">
            {permissionState === 'granted' ? (
              <>
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-text-main mb-2">
                  {t('settings.notifications.enabled', 'Notifications are Enabled')}
                </h2>
                <p className="text-sm text-text-secondary">
                  {t('settings.notifications.enabledDesc', 'You will receive important alerts and farm updates.')}
                </p>
              </>
            ) : permissionState === 'denied' ? (
              <>
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-text-main mb-2">
                  {t('settings.notifications.blocked', 'Notifications Blocked')}
                </h2>
                <p className="text-sm text-text-secondary">
                  {t('settings.notifications.blockedDesc', 'Please enable notifications in your browser settings to receive alerts.')}
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center mb-4">
                  <BellOff className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-text-main mb-2">
                  {t('settings.notifications.disabled', 'Enable Push Notifications')}
                </h2>
                <p className="text-sm text-text-secondary mb-6">
                  {t('settings.notifications.disabledDesc', 'Allow Cropoctor to send you alerts about crop health, weather changes, and AI recommendations.')}
                </p>
                <Button 
                  onClick={handleRequestPermission}
                  loading={loading}
                  className="w-full sm:w-auto"
                >
                  {t('settings.notifications.enableBtn', 'Allow Notifications')}
                </Button>
              </>
            )}
          </div>
        </Card>
      </PageLayout>
    </motion.div>
  )
}

export default NotificationSettingsPage
