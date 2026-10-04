import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CloudOff, Leaf, RefreshCw, ImageOff, Search, WifiOff, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { DiagnosisRequestStatus, InsufficientEvidenceOutcome } from '@/types'

/** Client-side diagnosis states. A diagnosis object is never the default state. */
export type DiagnosisPhase =
  | { kind: 'IDLE' }
  | { kind: 'PREPARING' }
  | { kind: 'ANALYZING'; startedAt: number }
  | { kind: 'INSUFFICIENT_EVIDENCE'; outcome: InsufficientEvidenceOutcome }
  | { kind: 'FAILED'; status: Exclude<DiagnosisRequestStatus, 'SUCCESS' | 'INSUFFICIENT_EVIDENCE'>; message: string; reason?: string; retryAfterSeconds?: number }

/** Honest progress: only steps the client can actually observe. */
export const DiagnosisProgress: React.FC<{ phase: DiagnosisPhase }> = ({ phase }) => {
  const { t } = useTranslation()
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (phase.kind !== 'ANALYZING') { setElapsed(0); return }
    const id = setInterval(() => setElapsed(Math.round((Date.now() - phase.startedAt) / 1000)), 1000)
    return () => clearInterval(id)
  }, [phase])

  const steps = [
    { key: 'prepare', label: t('diagnose.progress.prepare', 'Preparing image'), done: phase.kind === 'ANALYZING', active: phase.kind === 'PREPARING' },
    { key: 'analyze', label: t('diagnose.progress.analyze', 'Checking image and analysing symptoms'), done: false, active: phase.kind === 'ANALYZING' }
  ]
  return (
    <div role="status" aria-live="polite" className="w-full max-w-xs space-y-2.5">
      {steps.map(s => (
        <div key={s.key} className="flex items-center gap-2.5 text-sm">
          {s.done ? <Check className="w-4 h-4 text-green-400" aria-hidden />
            : s.active ? <Loader2 className="w-4 h-4 text-green-300 animate-spin" aria-hidden />
            : <span className="w-4 h-4 rounded-full border border-white/40" aria-hidden />}
          <span className={s.active ? 'font-semibold' : 'text-white/70'}>{s.label}</span>
        </div>
      ))}
      {phase.kind === 'ANALYZING' && elapsed >= 3 && (
        <p className="text-xs text-white/70 pl-6">{t('diagnose.progress.elapsed', { defaultValue: '{{s}} s — AI analysis usually takes 5–20 s', s: elapsed })}</p>
      )}
    </div>
  )
}

const FAILURE_COPY: Record<string, { icon: React.ReactNode; titleKey: string; title: string }> = {
  NOT_A_PLANT: { icon: <Leaf className="w-5 h-5" />, titleKey: 'diagnose.outcome.notPlant', title: 'No plant found in this photo' },
  INVALID_REQUEST: { icon: <ImageOff className="w-5 h-5" />, titleKey: 'diagnose.outcome.badImage', title: 'This image can’t be used' },
  RATE_LIMITED: { icon: <CloudOff className="w-5 h-5" />, titleKey: 'diagnose.outcome.busy', title: 'AI diagnosis is busy' },
  AI_SERVICE_UNAVAILABLE: { icon: <CloudOff className="w-5 h-5" />, titleKey: 'diagnose.outcome.unavailable', title: 'AI diagnosis is temporarily unavailable' },
  AUTHENTICATION_ERROR: { icon: <CloudOff className="w-5 h-5" />, titleKey: 'diagnose.outcome.unavailable', title: 'AI diagnosis is temporarily unavailable' },
  TIMEOUT: { icon: <CloudOff className="w-5 h-5" />, titleKey: 'diagnose.outcome.timeout', title: 'The analysis took too long' },
  NETWORK_ERROR: { icon: <WifiOff className="w-5 h-5" />, titleKey: 'diagnose.outcome.network', title: 'Connection problem' },
  INVALID_AI_RESPONSE: { icon: <AlertTriangle className="w-5 h-5" />, titleKey: 'diagnose.outcome.invalid', title: 'No reliable result' },
  GENERAL_ERROR: { icon: <AlertTriangle className="w-5 h-5" />, titleKey: 'diagnose.outcome.general', title: 'Diagnosis failed' }
}

interface PanelProps {
  phase: DiagnosisPhase
  onRetry: () => void
  onChooseAnother: () => void
}

export const DiagnosisOutcomePanel: React.FC<PanelProps> = ({ phase, onRetry, onChooseAnother }) => {
  const { t } = useTranslation()

  if (phase.kind === 'INSUFFICIENT_EVIDENCE') {
    const o = phase.outcome
    const notes = [...o.imageQualityIssues, ...o.limitations]
    return (
      <section role="alert" aria-labelledby="ie-title" className="rounded-2xl border border-sky-200 bg-sky-50 p-4 space-y-3 text-sky-950">
        <div className="flex items-start gap-2.5">
          <Search className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" aria-hidden />
          <div>
            <h3 id="ie-title" className="font-bold">{t('diagnose.outcome.insufficientTitle', 'Not enough evidence for a diagnosis')}</h3>
            <p className="text-sm mt-0.5">{t('diagnose.outcome.insufficientDesc', 'The AI could not identify a condition from this photo, so no disease or treatment is suggested. Nothing was saved to your history.')}</p>
          </div>
        </div>
        {o.observations.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-sky-800">{t('diagnose.outcome.observed', 'What the AI could see')}</p>
            <ul className="mt-1 text-sm list-disc pl-5 space-y-0.5">{o.observations.map(s => <li key={s}>{s}</li>)}</ul>
          </div>
        )}
        {notes.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-sky-800">{t('diagnose.outcome.whyNot', 'Why it could not decide')}</p>
            <ul className="mt-1 text-sm list-disc pl-5 space-y-0.5">{notes.map(s => <li key={s}>{s}</li>)}</ul>
          </div>
        )}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-sky-800">{t('diagnose.outcome.nextSteps', 'How to get a reliable result')}</p>
          <ul className="mt-1 text-sm list-disc pl-5 space-y-0.5">
            {[
              t('diagnose.guidance.daylight', 'Retake the photo in daylight, without flash, holding the camera 20–30 cm from the leaf.'),
              t('diagnose.guidance.fill', 'Fill the frame with one affected leaf and keep it in sharp focus.'),
              t('diagnose.guidance.bothSides', 'Take a second photo showing both the upper and lower leaf surface.'),
              t('diagnose.guidance.expert', 'If symptoms are spreading quickly, show the plant to your local agricultural extension officer.')
            ].map(g => <li key={g}>{g}</li>)}
          </ul>
        </div>
        <Button variant="primary" size="sm" fullWidth onClick={onChooseAnother}>{t('diagnose.outcome.retake', 'Take a clearer photo')}</Button>
      </section>
    )
  }

  if (phase.kind !== 'FAILED') return null
  const copy = FAILURE_COPY[phase.status] || FAILURE_COPY.GENERAL_ERROR
  const isImageProblem = phase.status === 'NOT_A_PLANT' || phase.status === 'INVALID_REQUEST'
  const isService = !isImageProblem
  return (
    <section role="alert" aria-labelledby="fail-title" className={`rounded-2xl border p-4 space-y-3 ${isImageProblem ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-gray-300 bg-gray-50 text-gray-900'}`}>
      <div className="flex items-start gap-2.5">
        <span className={isImageProblem ? 'text-amber-700' : 'text-gray-600'} aria-hidden>{copy.icon}</span>
        <div>
          <h3 id="fail-title" className="font-bold">{t(copy.titleKey, copy.title)}</h3>
          <p className="text-sm mt-0.5">{phase.reason ? t(`diagnose.reason.${phase.reason}`, phase.message) : t(`diagnose.errorMsg.${phase.status}`, phase.message)}</p>
          {isService && (
            <p className="text-xs mt-1.5 font-medium opacity-80">{t('diagnose.outcome.noDiagnosis', 'No diagnosis was made and nothing was saved. Your photo is kept so you can retry.')}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {isService && (
          <Button variant="primary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={onRetry}>
            {phase.retryAfterSeconds ? t('diagnose.outcome.retryIn', { defaultValue: 'Retry (wait {{s}} s)', s: phase.retryAfterSeconds }) : t('common.retry', 'Retry')}
          </Button>
        )}
        <Button variant="outline" size="sm" className={isService ? '' : 'col-span-2'} onClick={onChooseAnother}>
          {t('diagnose.outcome.tryAnother', 'Try another image')}
        </Button>
      </div>
    </section>
  )
}
