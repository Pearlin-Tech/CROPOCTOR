import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { MOCK_HISTORY } from '@/mock/insights'
import { useTranslation } from 'react-i18next'

const typeIcon: Record<string, string> = {
  'ai-advice':    '🤖',
  'diagnosis':    '🔬',
  'weather-alert':'⛈️',
  'crop-update':  '🌱',
  'farm-action':  '🚜',
}

const FarmHistoryPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title={t('history.title', 'Farm History')} subtitle={t('history.subtitle', 'A log of all AI advice, diagnoses, and farm actions.')} />

      <PageLayout className="pt-4 pb-8 space-y-4">
        <div className="hidden lg:block mb-4">
          <h1 className="text-2xl font-bold text-green-forest tracking-tight">{t('history.title', 'Farm History')}</h1>
          <p className="text-sm text-brown-earth/80 font-medium">{t('history.subtitle', 'A log of all AI advice, diagnoses, and farm actions.')}</p>
        </div>

        <motion.div variants={listVariants} animate="animate" className="space-y-2">
          {MOCK_HISTORY.map(item => (
            <motion.div key={item.id} variants={cardVariants}>
              <Card padding="md" className="flex items-start gap-3 hover:shadow-card-lg transition-shadow cursor-pointer bg-white border-brown-pastel/30 shadow-sm hover:border-green-pastel/50" onClick={() => {}}>
                <div className="w-10 h-10 rounded-2xl bg-green-pastel/20 flex items-center justify-center text-xl shrink-0 border border-green-pastel/30">
                  {typeIcon[item.type] || '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-text-main text-sm">{t(`history.items.${item.id}.title`, item.title)}</p>
                  <p className="text-xs text-text-secondary font-medium mt-0.5 line-clamp-2">{t(`history.items.${item.id}.summary`, item.summary)}</p>
                </div>
                <span className="text-xs text-brown-earth/60 font-medium shrink-0 mt-0.5">{t(`time.${item.id}`, '1h ago')}</span>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <p className="text-xs text-center text-brown-earth/60 font-medium py-4">
          {t('history.notice', 'Full history persistence connects to Firestore in Stage 4.')}
        </p>
      </PageLayout>
    </motion.div>
  )
}

export default FarmHistoryPage
