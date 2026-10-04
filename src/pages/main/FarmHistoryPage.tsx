import React, { useEffect, useState, useCallback } from 'react'
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
import { RefreshCw, ChevronRight, MessageSquare, ShieldAlert, Trash2, AlertTriangle } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useApp } from '@/store/AppContext'
import { certaintyLabel, isFallbackRecord } from '@/utils/diagnosis'
import { formatDiagnosisTimestamp, groupByDiagnosisDay } from '@/utils/format'

type TimelineItem =
  | { type: 'diagnosis'; data: DiagnosisResult; timestamp: any }
  | { type: 'advisor'; data: AdvisorConversation; timestamp: any }

// ── Main Page ─────────────────────────────────────────────────────────────────

const FarmHistoryPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { authUser } = useUser()
  const { activeFarm } = useFarm()
  const { toast } = useApp()

  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<DiagnosisResult | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchHistory = useCallback(async () => {
    if (!authUser?.uid) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setHistoryError(null)
    console.log(`[DiagnosisHistory] uid=${authUser.uid} query started`)

    const [diagnoses, conversations] = await Promise.all([
      cropDoctorService.getRecentDiagnoses(50).catch(err => {
        if (err?.message === 'FIRESTORE_PERMISSION_DENIED') {
          setHistoryError('Permission denied: cannot read diagnosis history. Firestore rules may not be deployed yet.')
          console.error(`[DiagnosisHistory] permission denied uid=${authUser.uid}`)
        } else {
          console.error('[DiagnosisHistory] error:', err?.message || err)
        }
        return [] as DiagnosisResult[]
      }),
      advisorService.getRecentConversations(20, activeFarm?.id, authUser?.uid).catch(err => {
        console.warn('[DiagnosisHistory] advisor fetch error:', err?.message)
        return [] as AdvisorConversation[]
      })
    ])

    const items: TimelineItem[] = [
      ...(diagnoses || []).map(d => ({ type: 'diagnosis' as const, data: d, timestamp: d.timestamp })),
      ...(conversations || []).map(c => ({ type: 'advisor' as const, data: c, timestamp: c.updatedAt })),
    ]

    // Sort newest first
    items.sort((a, b) => {
      const getMs = (ts: any): number => {
        if (!ts) return 0
        if (typeof ts.toDate === 'function') return ts.toDate().getTime()
        if (typeof ts.seconds === 'number') return ts.seconds * 1000
        return new Date(ts).getTime()
      }
      return getMs(b.timestamp) - getMs(a.timestamp)
    })

    console.log(`[DiagnosisHistory] documents=${items.length}`)
    setTimeline(items)
    setIsLoading(false)
  }, [authUser?.uid, activeFarm?.id])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Group diagnoses by day for display
  const diagnosisItems = timeline
    .filter(i => i.type === 'diagnosis')
    .map(i => ({ ...(i.data as DiagnosisResult), timestamp: i.timestamp }))

  const grouped = groupByDiagnosisDay(diagnosisItems)

  const confirmDeleteDiagnosis = async () => {
    if (!pendingDelete) return
    const diagnosisId = pendingDelete.id
    setIsDeleting(true)
    const success = await cropDoctorService.deleteDiagnosis(diagnosisId)
    setIsDeleting(false)
    if (success) {
      setTimeline(prev => prev.filter(item => !(item.type === 'diagnosis' && item.data.id === diagnosisId)))
      setPendingDelete(null)
      toast.success(t('history.deleted', 'Diagnosis deleted.'))
    } else {
      toast.error(t('history.deleteError', 'Could not delete this diagnosis. Check your connection and try again.'))
    }
  }

  const handleClearAllHistory = async () => {
    if (window.confirm(t('history.confirmClearAll', 'Are you sure you want to completely delete your entire history? This action cannot be undone.'))) {
      setIsLoading(true)
      const [diagSuccess, advSuccess] = await Promise.all([
        cropDoctorService.deleteAllDiagnoses(),
        advisorService.deleteAllConversations(authUser?.uid)
      ])
      
      if (diagSuccess && advSuccess) {
        setTimeline([])
      } else {
        toast.error(t('history.clearAllError', 'Failed to clear all history.'))
      }
      setIsLoading(false)
    }
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader
        title={t('history.title', 'Farm History')}
        subtitle={t('history.subtitle', 'Crop diagnoses and AI advisor sessions')}
      />

      <PageLayout className="pt-4 pb-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold text-green-forest tracking-tight">{t('history.title', 'Farm History')}</h1>
            <p className="text-sm text-brown-earth/80 font-medium">{t('history.subtitle', 'Crop diagnoses and AI advisor sessions')}</p>
          </div>
          <div className="flex items-center gap-4 self-end sm:self-auto w-full lg:w-auto justify-between lg:justify-end">
            {timeline.length > 0 && (
              <button
                onClick={handleClearAllHistory}
                className="flex items-center gap-1.5 text-sm font-semibold text-red-500 hover:text-red-700 hover:underline transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t('history.clearAll', 'Clear All')}
              </button>
            )}
            <button
              onClick={fetchHistory}
              className="flex items-center gap-1.5 text-sm font-semibold text-green-forest hover:underline transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {t('history.refresh', 'Refresh')}
            </button>
          </div>
        </div>

        {/* LOADING */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin text-green-forest" />
            <span className="text-sm font-medium">{t('history.loading', 'Loading from Firestore…')}</span>
          </div>

        /* ERROR (permission denied — separate from empty) */
        ) : historyError ? (
          <div className="py-12 flex flex-col items-center justify-center bg-white rounded-2xl border border-red-200 shadow-sm p-6">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <ShieldAlert className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-base font-bold text-red-700 mb-1">{t('history.unavailable', 'History Unavailable')}</h3>
            <p className="text-sm text-red-600 max-w-sm text-center">{historyError}</p>
            <button
              onClick={fetchHistory}
              className="mt-4 text-sm font-bold text-green-forest hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> {t('history.retry', 'Retry')}
            </button>
          </div>

        /* EMPTY (query succeeded, genuinely zero results) */
        ) : timeline.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center bg-white rounded-2xl border border-brown-pastel/30 shadow-sm p-6">
            <div className="w-16 h-16 rounded-full bg-green-pastel/20 flex items-center justify-center text-3xl mb-4">🌱</div>
            <h3 className="text-lg font-bold text-green-forest mb-2">{t('history.emptyTitle', 'No History Yet')}</h3>
            <p className="text-sm text-text-secondary max-w-sm text-center mb-6">
              {t('history.emptyDesc', 'Run a crop diagnosis or ask the AI Advisor to start building your history.')}
            </p>
            <button
              onClick={() => navigate('/diagnose')}
              className="bg-green-forest hover:bg-green-dark text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-colors"
            >
              {t('dashboard.actions.diagnose', 'Diagnose Crop')}
            </button>
          </div>

        /* DATA */
        ) : (
          <motion.div variants={listVariants} animate="animate" className="space-y-6">

            {/* Diagnosis groups */}
            {grouped.map(({ label, items }) => (
              <section key={label}>
                <h2 className="text-xs font-bold text-brown-earth/60 uppercase tracking-widest mb-2 px-1">{label}</h2>
                <div className="space-y-2.5">
                  {items.map(d => {
                    const severityColor =
                      d.severity === 'severe'
                        ? 'text-red-600 bg-red-50 border-red-100'
                        : d.severity === 'moderate'
                        ? 'text-amber-600 bg-amber-50 border-amber-100'
                        : d.severity === 'unknown'
                        ? 'text-gray-600 bg-gray-50 border-gray-200'
                        : 'text-green-700 bg-green-50 border-green-100'

                    const unreliable = isFallbackRecord(d)
                    return (
                      <motion.div
                        key={d.id}
                        variants={cardVariants}
                        className={`flex items-stretch bg-white border rounded-2xl shadow-sm hover:shadow-card-lg transition-all ${unreliable ? 'border-red-200' : 'border-brown-pastel/30 hover:border-green-forest/40'}`}
                      >
                        <button
                          type="button"
                          onClick={() => navigate('/diagnosis-result', { state: { diagnosis: d } })}
                          className="flex-1 min-w-0 flex items-start gap-3 p-4 text-left group rounded-l-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-forest"
                        >
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-brown-pastel/20 flex items-center justify-center">
                            {d.imageUrl
                              ? <img src={d.imageUrl} alt="" className="w-full h-full object-cover" />
                              : <span className="text-2xl" aria-hidden>🌿</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-text-main text-sm leading-tight truncate">{d.diseaseName || d.disease}</p>
                            <p className="text-xs text-text-secondary font-medium mt-0.5">🌿 {d.cropName || d.crop}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {unreliable ? (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full border text-red-700 bg-red-50 border-red-200 inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" aria-hidden /> {t('history.unreliable', 'Unreliable older record')}
                                </span>
                              ) : (
                                <>
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${severityColor}`}>
                                    {t(`diagnosis.severity.${d.severity}`, { defaultValue: { healthy: 'Healthy', mild: 'Mild', moderate: 'Moderate', severe: 'Severe', unknown: 'Severity unknown' }[d.severity] || d.severity })}
                                  </span>
                                  <span className="text-xs text-green-forest font-bold">{certaintyLabel(d, t)}</span>
                                </>
                              )}
                            </div>
                            {d.timestamp && (
                              <p className="text-xs text-gray-500 mt-1.5">{formatDiagnosisTimestamp(d.timestamp, { time: true })}</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-green-forest shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(d)}
                          aria-label={t('history.deleteOne', { defaultValue: 'Delete diagnosis: {{name}}', name: d.diseaseName || d.disease })}
                          className="shrink-0 w-12 flex items-center justify-center border-l border-brown-pastel/20 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-r-2xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden />
                        </button>
                      </motion.div>
                    )
                  })}
                </div>
              </section>
            ))}

            {/* Advisor sessions (no grouping needed for now) */}
            {timeline.filter(i => i.type === 'advisor').length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-brown-earth/60 uppercase tracking-widest mb-2 px-1">{t('history.advisorSessions', 'AI Advisor Sessions')}</h2>
                <div className="space-y-2.5">
                  {timeline.filter(i => i.type === 'advisor').map((item, idx) => {
                    const c = item.data as AdvisorConversation
                    return (
                      <motion.div key={c.id || `adv-${idx}`} variants={cardVariants}>
                        <Card
                          padding="md"
                          className="flex items-center gap-3 cursor-pointer bg-white border-brown-pastel/30 shadow-sm hover:border-green-pastel hover:shadow-card-lg transition-all"
                          onClick={() => navigate('/advisor', { state: { conversationId: c.id } })}
                        >
                          <div className="w-12 h-12 rounded-2xl bg-green-forest/10 border border-green-pastel/50 flex items-center justify-center shrink-0">
                            <MessageSquare className="w-6 h-6 text-green-forest" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-green-forest uppercase tracking-wider">🤖 {t('nav.advisor', 'AI Advisor')}</span>
                            <p className="font-bold text-text-main text-sm truncate">{c.title || 'Conversation'}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{formatDiagnosisTimestamp(c.updatedAt)}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-brown-earth/50 shrink-0" />
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </section>
            )}
          </motion.div>
        )}

        <p className="text-xs text-center text-brown-earth/50 font-medium pt-2">
          ✨ {t('history.synced', 'Synced with Firestore')} · {timeline.length} {timeline.length !== 1 ? t('history.records', 'records') : t('history.record', 'record')} {t('history.loaded', 'loaded')}
        </p>
      </PageLayout>

      <ConfirmDialog
        open={!!pendingDelete}
        title={t('history.confirmDeleteTitle', 'Delete this diagnosis?')}
        description={
          <>
            <span className="font-semibold text-text-main">{pendingDelete?.diseaseName || pendingDelete?.disease}</span>
            {pendingDelete?.timestamp ? ` · ${formatDiagnosisTimestamp(pendingDelete.timestamp)}` : ''}
            <br />
            {t('history.confirmDeleteDesc', 'Only this record is removed. This cannot be undone.')}
          </>
        }
        confirmLabel={t('common.delete', 'Delete')}
        cancelLabel={t('common.cancel', 'Cancel')}
        destructive
        busy={isDeleting}
        onConfirm={confirmDeleteDiagnosis}
        onCancel={() => setPendingDelete(null)}
      />
    </motion.div>
  )
}

export default FarmHistoryPage
