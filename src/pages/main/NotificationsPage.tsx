import React, { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/services/firebase'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { notificationService } from '@/services'
import type { AppNotification } from '@/types'
import { useTranslation } from 'react-i18next'

const typeIcon: Record<string, string> = {
  weather: '🌧️', 'ai-advice': '🤖', disease: '🔬', irrigation: '💧', 'crop-health': '🌱',
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let unsubscribeNotif: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoading(true);
        unsubscribeNotif = notificationService.subscribeToUserNotifications(
          (n) => {
            setNotifications(n);
            setLoading(false);
            setError(null);
          },
          (err) => {
            console.error("Firebase Notifications Error:", err);
            setError(err.message);
            setLoading(false);
          }
        );
      } else {
        setNotifications([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeNotif) unsubscribeNotif();
    };
  }, [])

  const unread = notifications.filter(n => !n.read).length

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader
        title={t('notifications.title', 'Notifications')}
        subtitle={unread > 0 ? t('notifications.unreadAlerts', { count: unread, defaultValue: '{{count}} unread alerts' }) : t('notifications.caughtUp', 'All caught up!')}
      />

      <PageLayout className="pt-4 pb-8 space-y-4">
        <div className="hidden lg:flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t('notifications.title', 'Notifications')}</h1>
            <p className="text-sm text-gray-500">{unread > 0 ? t('notifications.unreadAlerts', { count: unread, defaultValue: '{{count}} unread alerts' }) : t('notifications.caughtUp', 'All caught up!')}</p>
          </div>
          {unread > 0 && (
            <button
              onClick={() => notificationService.markAllRead()}
              className="text-sm text-green-forest font-semibold hover:underline"
            >
              {t('notifications.markAllRead', 'Mark all read')}
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="shimmer-bg h-20 rounded-2xl" />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 text-4xl shadow-sm border border-red-100">
              ⚠️
            </div>
            <h3 className="text-xl font-bold text-gray-800">{t('notifications.errorTitle', 'Something went wrong')}</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-xs">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-4xl shadow-sm border border-gray-100">
              📭
            </div>
            <h3 className="text-xl font-bold text-gray-800">{t('notifications.emptyTitle', 'No notifications yet')}</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-xs">{t('notifications.emptyDesc', 'When you get alerts about your farm or weather, they will show up here.')}</p>
          </div>
        ) : (
          <motion.div variants={listVariants} animate="animate" className="space-y-2">
            {notifications.map(notif => (
              <motion.button
                key={notif.id}
                variants={cardVariants}
                onClick={() => {
                  if (!notif.read) {
                    notificationService.markRead(notif.id)
                  }
                  if (notif.actionRoute) navigate(notif.actionRoute)
                }}
                className="w-full text-left"
              >
                <Card padding="md" className={`flex items-start gap-3 transition-all hover:shadow-card-lg ${!notif.read ? 'border-l-4 border-l-green-forest bg-green-light/20' : ''}`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${!notif.read ? 'bg-green-light' : 'bg-gray-50'}`}>
                    {typeIcon[notif.type] || '📢'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!notif.read ? 'font-bold text-gray-800' : 'font-medium text-gray-700'}`}>{t(`notifications.items.${notif.id}.title`, notif.title)}</p>
                      <span className="text-xs text-gray-400 shrink-0">{t(`time.${notif.id}`, '32m ago')}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t(`notifications.items.${notif.id}.body`, notif.body)}</p>
                    {notif.actionLabel && (
                      <span className="text-xs text-green-forest font-semibold mt-1 block">{t(`notifications.actions.${notif.id}`, notif.actionLabel)} →</span>
                    )}
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-green-forest shrink-0 mt-2" />
                  )}
                </Card>
              </motion.button>
            ))}
          </motion.div>
        )}
      </PageLayout>
    </motion.div>
  )
}

export default NotificationsPage
