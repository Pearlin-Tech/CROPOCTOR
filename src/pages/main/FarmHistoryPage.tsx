import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { useTranslation } from 'react-i18next'
import { cropDoctorService } from '@/services/cropDoctorService'
import { advisorService } from '@/services/advisorService'
import { useUser } from '@/store/UserContext'
import { useFarm } from '@/store/FarmContext'
import type { DiagnosisResult, AdvisorConversation } from '@/types'
import { RefreshCw, ChevronRight, MessageSquare, ShieldAlert, X, AlertCircle } from 'lucide-react'
import { formatDiagnosisTimestamp, groupByDiagnosisDay } from '@/utils/format'

type TimelineItem =
  | { type: 'diagnosis'; data: DiagnosisResult; timestamp: any }
  | { type: 'advisor'; data: AdvisorConversation; timestamp: any }

// ── Diagnosis Detail Modal ────────────────────────────────────────────────────

const DiagnosisDetailModal: React.FC<{ diagnosis: DiagnosisResult; onClose: () => void }> = ({ diagnosis: d, onClose }) => {
  const severityColor =
    d.severity === 'severe'
      ? 'text-red-700 bg-red-100'
      : d.severity === 'moderate'
      ? 'text-amber-700 bg-amber-100'
      : 'text-green-700 bg-green-100'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-green-forest to-green-dark p-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <p className="text-xs font-bold text-green-pastel/80 uppercase tracking-widest mb-1">Diagnosis Details</p>
          <h2 className="text-xl font-bold text-white leading-tight">{d.diseaseName || d.disease || 'Diagnosed Issue'}</h2>
          <p className="text-green-pastel/90 text-sm mt-1">🌿 {d.cropName || d.crop}</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className={`text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white`}>
              {d.severity ? d.severity.charAt(0).toUpperCase() + d.severity.slice(1) : 'Unknown'} severity
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white">
              {d.confidence}% confidence
            </span>
          </div>
        </div>

        {/* Thumbnail */}
        {d.imageUrl && (
          <div className="mx-6 -mt-4 rounded-2xl overflow-hidden border-2 border-green-pastel/30 shadow-md h-40">
            <img
              src={d.imageUrl}
              alt={d.diseaseName || d.disease}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Timestamp */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>🗓</span>
            <span>{formatDiagnosisTimestamp(d.timestamp)}</span>
          </div>

          {/* Analysis */}
          {d.analysis && (
            <section>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Analysis</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{d.analysis}</p>
            </section>
          )}

          {/* Symptoms */}
          {d.symptoms && d.symptoms.length > 0 && (
            <section>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Symptoms</h4>
              <ul className="space-y-1.5">
                {d.symptoms.map((s: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-amber-500 shrink-0">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Treatment */}
          {d.treatment && d.treatment.length > 0 && (
            <section className="bg-green-50 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-green-800 uppercase tracking-wider mb-2">Recommended Treatment</h4>
              <ul className="space-y-1.5">
                {(Array.isArray(d.treatment) ? d.treatment : [d.treatment]).map((t: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-green-900">
                    <span className="text-green-600 shrink-0 font-bold">✓</span>
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Prevention */}
          {d.prevention && d.prevention.length > 0 && (
            <section>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Prevention</h4>
              <ul className="space-y-1.5">
                {d.prevention.map((p: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-blue-500 shrink-0">→</span>
                    {p}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* When to recheck */}
          {d.whenToRecheck && (
            <section className="flex items-start gap-3 bg-amber-50 rounded-2xl p-4">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-0.5">Recheck</h4>
                <p className="text-sm text-amber-900">{d.whenToRecheck}</p>
              </div>
            </section>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-green-forest text-white font-bold text-sm hover:bg-green-dark transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const FarmHistoryPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { authUser } = useUser()
  const { activeFarm } = useFarm()

  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<DiagnosisResult | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!authUser?.uid) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setHistoryError(null)
    console.log(`[DiagnosisHistory] uid=${authUser.uid} query started`)

    const [diagnoses, conversations] = await Promise.all([
      cropDoctorService.getRecentDiagnoses(30, activeFarm?.id).catch(err => {
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

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader
        title={t('history.title', 'Farm History')}
        subtitle={t('history.subtitle', 'Crop diagnoses and AI advisor sessions')}
      />

      <PageLayout className="pt-4 pb-8 space-y-4">
        <div className="hidden lg:flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-green-forest tracking-tight">{t('history.title', 'Farm History')}</h1>
            <p className="text-sm text-brown-earth/80 font-medium">{t('history.subtitle', 'Crop diagnoses and AI advisor sessions')}</p>
          </div>
          <button
            onClick={fetchHistory}
            className="flex items-center gap-1.5 text-sm font-semibold text-green-forest hover:underline"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* LOADING */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin text-green-forest" />
            <span className="text-sm font-medium">Loading from Firestore…</span>
          </div>

        /* ERROR (permission denied — separate from empty) */
        ) : historyError ? (
          <div className="py-12 flex flex-col items-center justify-center bg-white rounded-2xl border border-red-200 shadow-sm p-6">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <ShieldAlert className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-base font-bold text-red-700 mb-1">History Unavailable</h3>
            <p className="text-sm text-red-600 max-w-sm text-center">{historyError}</p>
            <button
              onClick={fetchHistory}
              className="mt-4 text-sm font-bold text-green-forest hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>

        /* EMPTY (query succeeded, genuinely zero results) */
        ) : timeline.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center bg-white rounded-2xl border border-brown-pastel/30 shadow-sm p-6">
            <div className="w-16 h-16 rounded-full bg-green-pastel/20 flex items-center justify-center text-3xl mb-4">🌱</div>
            <h3 className="text-lg font-bold text-green-forest mb-2">No History Yet</h3>
            <p className="text-sm text-text-secondary max-w-sm text-center mb-6">
              Run a crop diagnosis or ask the AI Advisor to start building your history.
            </p>
            <button
              onClick={() => navigate('/diagnose')}
              className="bg-green-forest hover:bg-green-dark text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-colors"
            >
              Diagnose Crop
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
                        : 'text-green-700 bg-green-50 border-green-100'

                    return (
                      <motion.button
                        key={d.id}
                        variants={cardVariants}
                        onClick={() => setSelectedDiagnosis(d)}
                        className="w-full flex items-start gap-3 p-4 bg-white border border-brown-pastel/30 rounded-2xl shadow-sm hover:border-green-forest/40 hover:shadow-card-lg transition-all text-left group"
                      >
                        {/* Thumbnail */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-brown-pastel/20">
                          <img
                            src={d.imageUrl || '/images/disease_leaf_1787238259522.jpg'}
                            alt={d.diseaseName || d.disease}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/images/disease_leaf_1787238259522.jpg' }}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-bold text-green-forest uppercase tracking-wider">🔬 Diagnosis</span>
                          </div>
                          <p className="font-bold text-text-main text-sm leading-tight truncate">
                            {d.diseaseName || d.disease || 'Issue Detected'}
                          </p>
                          <p className="text-xs text-text-secondary font-medium mt-0.5">
                            🌿 {d.cropName || d.crop}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${severityColor}`}>
                              {d.severity ? d.severity.charAt(0).toUpperCase() + d.severity.slice(1) : 'Unknown'}
                            </span>
                            <span className="text-xs text-green-forest font-bold">{d.confidence}% confidence</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1.5">
                            {formatDiagnosisTimestamp(d.timestamp, { time: true })}
                          </p>
                        </div>

                        {/* Arrow */}
                        <div className="flex flex-col items-end gap-1 shrink-0 pt-1">
                          <span className="text-xs font-semibold text-green-forest group-hover:underline">View →</span>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </section>
            ))}

            {/* Advisor sessions (no grouping needed for now) */}
            {timeline.filter(i => i.type === 'advisor').length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-brown-earth/60 uppercase tracking-widest mb-2 px-1">AI Advisor Sessions</h2>
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
                            <span className="text-xs font-bold text-green-forest uppercase tracking-wider">🤖 AI Advisor</span>
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
          ✨ Synced with Firestore · {timeline.length} record{timeline.length !== 1 ? 's' : ''} loaded
        </p>
      </PageLayout>

      {/* Diagnosis Detail Modal */}
      <AnimatePresence>
        {selectedDiagnosis && (
          <DiagnosisDetailModal
            diagnosis={selectedDiagnosis}
            onClose={() => setSelectedDiagnosis(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default FarmHistoryPage
