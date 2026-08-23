import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { MOCK_HISTORY } from '@/mock/insights'
import { useTranslation } from 'react-i18next'
import { cropDoctorService } from '@/services/cropDoctorService'
import { useUser } from '@/store/UserContext'
import type { DiagnosisResult } from '@/types'
import { RefreshCw, ChevronRight } from 'lucide-react'

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
  const { authUser } = useUser()

  const [realDiagnoses, setRealDiagnoses] = useState<DiagnosisResult[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    cropDoctorService.getRecentDiagnoses(20).then(list => {
      if (!isMounted) return
      setRealDiagnoses(list || [])
      setIsLoading(false)
    }).catch(err => {
      console.warn('[FarmHistoryPage] Failed to fetch Firestore diagnoses:', err)
      if (isMounted) setIsLoading(false)
    })

    return () => { isMounted = false }
  }, [authUser?.uid])

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title={t('history.title', 'Farm History')} subtitle={t('history.subtitle', 'A log of all AI advice, diagnoses, and farm actions.')} />

      <PageLayout className="pt-4 pb-8 space-y-4">
        <div className="hidden lg:block mb-4">
          <h1 className="text-2xl font-bold text-green-forest tracking-tight">{t('history.title', 'Farm History')}</h1>
          <p className="text-sm text-brown-earth/80 font-medium">{t('history.subtitle', 'A log of all AI advice, diagnoses, and farm actions.')}</p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-green-forest" />
            Loading farm history from Firestore...
          </div>
        ) : (
          <motion.div variants={listVariants} animate="animate" className="space-y-3">
            {/* Real Firestore Diagnoses */}
            {realDiagnoses.map(d => (
              <motion.div key={d.id} variants={cardVariants}>
                <Card
                  padding="md"
                  className="flex items-center gap-3 hover:shadow-card-lg transition-all cursor-pointer bg-white border-brown-pastel/30 shadow-sm hover:border-green-pastel"
                  onClick={() => navigate('/diagnosis-result', { state: { diagnosis: d } })}
                >
                  <img
                    src={d.imageUrl || '/images/disease_leaf_1787238259522.jpg'}
                    alt={d.disease}
                    className="w-12 h-12 rounded-2xl object-cover border border-brown-pastel/20 shrink-0 bg-gray-100"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-green-forest uppercase tracking-wider">🔬 Diagnosis</span>
                      <span className="text-xs text-gray-400">· {d.confidence}% match</span>
                    </div>
                    <p className="font-bold text-text-main text-sm truncate">{d.disease}</p>
                    <p className="text-xs text-text-secondary font-medium mt-0.5 line-clamp-1">{d.crop} · {d.actions?.[0] || 'View treatment'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-brown-earth/60 font-medium">{d.timestamp?.slice(0, 10) || 'Recently'}</span>
                    <ChevronRight className="w-4 h-4 text-brown-earth/50" />
                  </div>
                </Card>
              </motion.div>
            ))}

            {/* Static Mock History Events */}
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
        )}

        <p className="text-xs text-center text-brown-earth/60 font-medium py-4">
          ✨ Synchronized with Firestore Cloud Database (Spark Free Tier)
        </p>
      </PageLayout>
    </motion.div>
  )
}

export default FarmHistoryPage
