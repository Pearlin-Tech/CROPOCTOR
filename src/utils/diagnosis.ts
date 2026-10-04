import type { TFunction } from 'i18next'
import type { DiagnosisResult, SeverityLevel } from '@/types'

/** Version tag written on every record produced by the validated pipeline. */
export const DIAGNOSIS_PIPELINE_VERSION = 3

const SEVERITIES: SeverityLevel[] = ['healthy', 'mild', 'moderate', 'severe', 'unknown']
const CERTAINTIES = ['high', 'moderate', 'low', 'insufficient_evidence'] as const

const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : [])

function toIso(data: any): string {
  const c = data?.createdAt
  if (c && typeof c.toDate === 'function') return c.toDate().toISOString()
  if (c && typeof c.seconds === 'number') return new Date(c.seconds * 1000).toISOString()
  if (typeof data?.timestamp === 'string') return data.timestamp
  if (typeof data?.provenance?.analyzedAt === 'string') return data.provenance.analyzedAt
  return '' // unknown — the UI shows no date rather than inventing "now"
}

/**
 * Maps a stored Firestore diagnosis document to the UI model WITHOUT inventing values:
 * missing confidence stays undefined, missing severity is 'unknown', missing crop is
 * 'Unknown crop'. Records written before the validated pipeline are flagged `isLegacy`.
 */
export function mapDiagnosisDoc(id: string, data: any, uid?: string): DiagnosisResult {
  const crop = data?.cropName || data?.crop || 'Unknown crop'
  const disease = data?.diseaseName || data?.disease || 'Unnamed condition'
  const isLegacy = data?.pipelineVersion !== DIAGNOSIS_PIPELINE_VERSION
  const certainty = CERTAINTIES.includes(data?.certainty) ? data.certainty : undefined
  return {
    id,
    userId: data?.userId || uid,
    farmId: data?.farmId || undefined,
    imageUrl: typeof data?.imageUrl === 'string' ? data.imageUrl : '',
    crop,
    cropName: crop,
    disease,
    diseaseName: disease,
    diagnosisCode: data?.diagnosisCode,
    confidence: typeof data?.confidence === 'number' && Number.isFinite(data.confidence) ? data.confidence : undefined,
    certainty,
    confidenceBand: certainty,
    severity: SEVERITIES.includes(data?.severity) ? data.severity : 'unknown',
    symptoms: strArr(data?.symptoms),
    observedSymptoms: strArr(data?.observedSymptoms ?? data?.symptoms),
    supportingEvidence: strArr(data?.supportingEvidence),
    contradictingEvidence: strArr(data?.contradictingEvidence),
    alternativeDiagnoses: strArr(data?.alternativeDiagnoses),
    limitations: strArr(data?.limitations),
    analysis: data?.analysis || data?.explanation || '',
    explanation: data?.explanation || data?.analysis || '',
    actions: strArr(data?.recommendations ?? data?.actions),
    recommendations: strArr(data?.recommendations),
    immediateActions: strArr(data?.immediateActions),
    treatment: strArr(data?.treatment),
    prevention: strArr(data?.prevention),
    longTermPrevention: strArr(data?.longTermPrevention ?? data?.prevention),
    whenToRecheck: typeof data?.whenToRecheck === 'string' ? data.whenToRecheck : undefined,
    isPlantImage: typeof data?.isPlantImage === 'boolean' ? data.isPlantImage : undefined,
    needsExpertReview: Boolean(data?.needsExpertReview),
    cropMatchesReported: data?.cropMatchesReported,
    imageQuality: data?.imageQuality,
    provenance: data?.provenance,
    language: data?.language,
    isLegacy,
    isDemo: Boolean(data?.isSample),
    isSample: Boolean(data?.isSample),
    timestamp: toIso(data)
  }
}

/** Legacy records from the old pipeline that were fabricated fallbacks rather than image diagnoses. */
export function isFallbackRecord(d: DiagnosisResult): boolean {
  return Boolean(d.isLegacy) && /fallback|insufficient evidence/i.test(d.disease || '')
}

/** User-facing certainty label. Never fabricates a percentage. */
export function certaintyLabel(d: Pick<DiagnosisResult, 'certainty' | 'confidence' | 'isLegacy'>, t: TFunction): string {
  if (d.certainty) {
    return t(`diagnosis.certainty.${d.certainty}`, {
      defaultValue: { high: 'High certainty', moderate: 'Moderate certainty', low: 'Low certainty', insufficient_evidence: 'Insufficient evidence' }[d.certainty]
    })
  }
  if (typeof d.confidence === 'number') {
    return t('diagnosis.certainty.legacyPercent', { defaultValue: '{{value}}% (older record)', value: d.confidence })
  }
  return t('diagnosis.certainty.unknown', 'Certainty not recorded')
}

/** Short text for passing a diagnosis to the AI Advisor as context. */
export function diagnosisContextString(d: DiagnosisResult): string {
  const parts = [`Condition: ${d.disease} on ${d.crop}`]
  if (d.certainty) parts.push(`model certainty (uncalibrated): ${d.certainty}`)
  if (d.severity && d.severity !== 'unknown') parts.push(`visible severity: ${d.severity}`)
  if (d.symptoms?.length) parts.push(`symptoms: ${d.symptoms.join(', ')}`)
  if (d.timestamp) parts.push(`date: ${d.timestamp.slice(0, 10)}`)
  if (d.isLegacy) parts.push('note: older record from a previous, unvalidated diagnosis pipeline')
  return parts.join('. ') + '.'
}
