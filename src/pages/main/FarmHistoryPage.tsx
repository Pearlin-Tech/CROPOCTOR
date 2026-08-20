import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { MOCK_HISTORY } from '@/mock/insights'
import { timeAgo } from '@/utils/format'

const typeIcon: Record<string, string> = {
  'ai-advice':    '🤖',
  'diagnosis':    '🔬',
  'weather-alert':'⛈️',
  'crop-update':  '🌱',
  'farm-action':  '🚜',
}

const FarmHistoryPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title="Farm History" subtitle="Your activity log." />

      <PageLayout className="pt-4 pb-8 space-y-4">
        <div className="hidden lg:block mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Farm History</h1>
          <p className="text-sm text-gray-500">A log of all AI advice, diagnoses, and farm actions.</p>
        </div>

        <motion.div variants={listVariants} animate="animate" className="space-y-2">
          {MOCK_HISTORY.map(item => (
            <motion.div key={item.id} variants={cardVariants}>
              <Card padding="md" className="flex items-start gap-3 hover:shadow-card-lg transition-shadow cursor-pointer" onClick={() => {}}>
                <div className="w-10 h-10 rounded-2xl bg-green-light flex items-center justify-center text-xl shrink-0">
                  {typeIcon[item.type] || '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.summary}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0 mt-0.5">{timeAgo(item.timestamp)}</span>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <p className="text-xs text-center text-gray-400 py-4">
          Full history persistence connects to Firestore in Stage 4.
        </p>
      </PageLayout>
    </motion.div>
  )
}

export default FarmHistoryPage
