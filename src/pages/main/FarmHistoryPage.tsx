import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { useTranslation } from 'react-i18next'
import { cropDoctorService } from '@/services/cropDoctorService'
import { advisorService } from '@/services/advisorService'
import { useUser } from '@/store/UserContext'
import { useFarm } from '@/store/FarmContext'
import type { DiagnosisResult, AdvisorConversation } from '@/types'
import { RefreshCw, ChevronRight, MessageSquare } from 'lucide-react'

type TimelineItem =
  | { type: 'diagnosis'; data: DiagnosisResult; date: Date }
  | { type: 'advisor'; data: AdvisorConversation; date: Date }

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
  const { activeFarm } = useFarm()

  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    Promise.all([
      cropDoctorService.getRecentDiagnoses(20, activeFarm?.id).catch(err => {
        console.warn('Failed to fetch diagnoses:', err)
        return []
      }),
      advisorService.getRecentConversations(20, activeFarm?.id, authUser?.uid).catch(err => {
        console.warn('Failed to fetch advisor conversations:', err)
        return []
      })
    ]).then(([diagnoses, conversations]) => {
      if (!isMounted) return
      
      const items: TimelineItem[] = []
      
      ;(diagnoses || []).forEach(d => {
        items.push({ type: 'diagnosis', data: d, date: new Date(d.timestamp) })
      })
      
      ;(conversations || []).forEach(c => {
        items.push({ type: 'advisor', data: c, date: new Date(c.updatedAt) })
      })
      
      // Sort newest first
      items.sort((a, b) => b.date.getTime() - a.date.getTime())
      
      setTimeline(items)
      setIsLoading(false)
    })

    return () => { isMounted = false }
  }, [authUser?.uid, activeFarm?.id])

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
            {/* Timeline Items */}
            {timeline.map((item, idx) => {
              if (item.type === 'diagnosis') {
                const d = item.data as DiagnosisResult
                return (
                  <motion.div key={d.id || `diag-${idx}`} variants={cardVariants}>
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
                )
              } else if (item.type === 'advisor') {
                const c = item.data as AdvisorConversation
                return (
                  <motion.div key={c.id || `adv-${idx}`} variants={cardVariants}>
                    <Card
                      padding="md"
                      className="flex items-center gap-3 hover:shadow-card-lg transition-all cursor-pointer bg-white border-brown-pastel/30 shadow-sm hover:border-green-pastel"
                      onClick={() => navigate('/advisor', { state: { conversationId: c.id } })}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-green-forest/10 text-green-forest border border-green-pastel/50 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-green-forest uppercase tracking-wider">🤖 AI Advisor</span>
                          <span className="text-xs text-gray-400">· {c.messages.length} messages</span>
                        </div>
                        <p className="font-bold text-text-main text-sm truncate">{c.title || 'Conversation'}</p>
                        <p className="text-xs text-text-secondary font-medium mt-0.5 line-clamp-1">Farm ID: {c.farmId}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-brown-earth/60 font-medium">{c.updatedAt?.slice(0, 10) || 'Recently'}</span>
                        <ChevronRight className="w-4 h-4 text-brown-earth/50" />
                      </div>
                    </Card>
                  </motion.div>
                )
              }
              return null
            })}

            {/* Empty state if no history */}
            {timeline.length === 0 && (
              <div className="py-12 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-brown-pastel/30 shadow-sm p-6">
                <div className="w-16 h-16 rounded-full bg-green-pastel/20 flex items-center justify-center text-3xl mb-4">
                  🌱
                </div>
                <h3 className="text-lg font-bold text-green-forest mb-2">No History Yet</h3>
                <p className="text-sm text-text-secondary max-w-sm mb-6">
                  Your farm history is empty. Run a crop diagnosis or ask the AI Advisor for help to start building your record.
                </p>
                <button
                  onClick={() => navigate('/diagnose')}
                  className="bg-green-forest hover:bg-green-dark text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-colors"
                >
                  Diagnose Crop
                </button>
              </div>
            )}
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
