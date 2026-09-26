import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/index'
import { MOCK_NEXT_BEST_ACTIONS } from '@/mock/insights'
import { useApp } from '@/store/AppContext'
import { useTranslation } from 'react-i18next'
import { formatNumbersInText } from '@/utils/formatters'

const priorityColor = { high: 'danger', medium: 'warning', low: 'green' } as const

const NextBestActionPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast, language } = useApp()
  const { t } = useTranslation()

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title={t('dashboard.actions.nba', 'Next Best Action')} subtitle={t('nba.subtitle', 'What should you do next?')} onBack={() => navigate(-1)} />

      <PageLayout className="pt-4 pb-8 space-y-4">
        <div className="hidden lg:block mb-4">
          <h1 className="text-2xl font-bold text-gray-800">{t('dashboard.actions.nba', 'Next Best Action')}</h1>
          <p className="text-sm text-gray-500">{t('nba.description', 'Personalized recommendations for your farm today.')}</p>
        </div>

        <motion.div variants={listVariants} animate="animate" className="space-y-4">
          {MOCK_NEXT_BEST_ACTIONS.map(action => (
            <motion.div key={action.id} variants={cardVariants}>
              <Card padding="md" className={action.timeframe === 'today' ? 'border-l-4 border-l-green-forest' : action.timeframe === 'watch' ? 'border-l-4 border-l-muted-warning' : ''}>
                <div className="flex items-start gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="gray" size="sm">{t(`nba.timeframe.${action.timeframe}`, action.label)}</Badge>
                      <Badge variant={priorityColor[action.priority as keyof typeof priorityColor]} size="sm" dot>
                        {t(`nba.priorityLevel.${action.priority}`, action.priority)} {t('nba.priority', 'Priority')}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-gray-800">{formatNumbersInText(t(`nba.items.${action.id}.title`, action.title), language)}</h3>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex gap-2">
                    <span className="text-xs font-bold text-gray-400 w-16 shrink-0">{t('nba.why', 'Why?')}</span>
                    <span className="text-xs text-gray-600">{formatNumbersInText(t(`nba.items.${action.id}.reason`, action.reason), language)}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs font-bold text-gray-400 w-16 shrink-0">{t('nba.benefit', 'Benefit')}</span>
                    <span className="text-xs text-gray-600">{formatNumbersInText(t(`nba.items.${action.id}.benefit`, action.benefit), language)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toast.success('Action saved to farm log.')} className="text-xs font-semibold text-green-forest bg-green-light px-3 py-1.5 rounded-xl hover:bg-green-pastel/50 transition-colors">
                    💾 {t('nba.save', 'Save')}
                  </button>
                  <button onClick={() => toast.info('Reminder set.')} className="text-xs font-semibold text-brown-earth bg-beige-warm px-3 py-1.5 rounded-xl hover:bg-brown-soft/20 transition-colors">
                    🔔 {t('nba.remind', 'Remind me')}
                  </button>
                  <button onClick={() => navigate('/advisor')} className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-xl hover:bg-gray-200 transition-colors">
                    💬 {t('nba.askAi', 'Ask AI')}
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </PageLayout>
    </motion.div>
  )
}

export default NextBestActionPage
