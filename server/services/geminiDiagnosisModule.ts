/**
 * Crop diagnosis pipeline.
 *
 *   image → validate (signature, size, dimensions) → Gemini vision (structured JSON, temp 0,
 *   one pinned model) → schema validation → outcome classification → controlled knowledge
 *   lookup → result
 *
 * Invariants (see docs/DIAGNOSIS_PIPELINE.md):
 *  - An AI/API failure is NEVER turned into a diagnosis. There is no text-only "fallback".
 *  - The model reports observations only; treatment/prevention come from server/knowledge.
 *  - No numeric confidence is manufactured. The model's certainty band is reported as an
 *    uncalibrated estimate; `confidence` is left undefined.
 *  - INSUFFICIENT_EVIDENCE and NOT_A_PLANT carry no disease, severity or treatment.
 */
import { z } from 'zod'
import { AI_CONFIG } from '../config/aiConfig.js'
import { getTaxonomyForCrop } from '../config/cropTaxonomy.js'
import { validateImageBase64 } from '../diagnosis/imageValidation.js'
import { getKnowledge, KNOWLEDGE_VERSION, VERIFICATION_GUIDANCE } from '../knowledge/cropKnowledge.js'

export const PROMPT_VERSION = 'diag-2026-10-04.2'

export type DiagnosisStatus =
  | 'SUCCESS'
  | 'NOT_A_PLANT'
  | 'INSUFFICIENT_EVIDENCE'
  | 'AI_SERVICE_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'AUTHENTICATION_ERROR'
  | 'INVALID_REQUEST'
  | 'INVALID_AI_RESPONSE'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'GENERAL_ERROR'

type FailureStatus = Exclude<DiagnosisStatus, 'SUCCESS' | 'INSUFFICIENT_EVIDENCE'>
type CallFailureStatus = Exclude<FailureStatus, 'NOT_A_PLANT'>

/** HTTP status the API route should use for each outcome. */
export const STATUS_HTTP: Record<DiagnosisStatus, number> = {
  SUCCESS: 200,
  INSUFFICIENT_EVIDENCE: 200,
  NOT_A_PLANT: 422,
  INVALID_REQUEST: 400,
  RATE_LIMITED: 429,
  AI_SERVICE_UNAVAILABLE: 503,
  AUTHENTICATION_ERROR: 503, // server credential problem — the user can only retry later
  TIMEOUT: 504,
  INVALID_AI_RESPONSE: 502,
  NETWORK_ERROR: 503,
  GENERAL_ERROR: 500
}

export type CertaintyLevel = 'high' | 'moderate' | 'low' | 'insufficient_evidence'
export type Severity = 'healthy' | 'mild' | 'moderate' | 'severe' | 'unknown'

export interface AnalyzeCropParams {
  imageBase64?: string
  mimeType?: string
  farmContext?: {
    farmId?: string
    crop?: string
    cropStage?: string
    soilType?: string
    location?: string
  }
  language?: string
}

export interface DiagnosisProvenance {
  source: 'gemini-vision'
  model: string
  promptVersion: string
  knowledgeVersion: string
  knowledgeReviewed: boolean
  analyzedAt: string
  attempts: number
  image: { mimeType: string; bytes: number; width: number | null; height: number | null }
}

export interface CropDiagnosisResult {
  status: 'SUCCESS'
  isPlantImage: true
  cropName: string
  cropCode: string
  reportedCrop: string | null
  cropMatchesReported: 'yes' | 'no' | 'unsure'
  diagnosisCode: string
  diseaseName: string
  diagnosisName: string
  certainty: CertaintyLevel
  confidenceBand: CertaintyLevel
  severity: Severity
  imageQuality: 'good' | 'acceptable' | 'poor'
  symptoms: string[]
  supportingEvidence: string[]
  contradictingEvidence: string[]
  alternativeDiagnoses: string[]
  limitations: string[]
  explanation: string
  analysis: string
  immediateActions: string[]
  treatment: string[]
  recommendations: string[]
  prevention: string[]
  longTermPrevention: string[]
  whenToRecheck: string
  needsExpertReview: boolean
  needsMoreEvidence: boolean
  provenance: DiagnosisProvenance
}

export interface InsufficientEvidenceResult {
  status: 'INSUFFICIENT_EVIDENCE'
  isPlantImage: true
  cropName: string | null
  observations: string[]
  limitations: string[]
  imageQualityIssues: string[]
  guidance: string[]
  needsExpertReview: true
  provenance: DiagnosisProvenance
}

export type AnalyzeCropResponse =
  | { success: true; status: 'SUCCESS'; data: CropDiagnosisResult }
  | { success: true; status: 'INSUFFICIENT_EVIDENCE'; data: InsufficientEvidenceResult }
  | { success: false; status: FailureStatus; message: string; retryAfterSeconds?: number; reason?: string }

// ── Model output schema ──────────────────────────────────────────────────────

const stringList = z.array(z.string()).transform(a => a.map(s => s.trim()).filter(s => s.length > 3))

export const ModelOutputSchema = z.object({
  isPlantImage: z.boolean(),
  observedCrop: z.string(),
  cropMatchesReported: z.enum(['yes', 'no', 'unsure']),
  imageQuality: z.enum(['good', 'acceptable', 'poor', 'unusable']),
  imageQualityIssues: stringList,
  diagnosisCode: z.string(),
  diagnosisName: z.string(),
  certainty: z.enum(['high', 'moderate', 'low', 'insufficient_evidence']),
  severity: z.enum(['healthy', 'mild', 'moderate', 'severe', 'unknown']),
  visibleSymptoms: stringList,
  supportingEvidence: stringList,
  contradictingEvidence: stringList,
  alternativeDiagnoses: stringList,
  limitations: stringList,
  summary: z.string()
})
export type ModelOutput = z.infer<typeof ModelOutputSchema>

function buildResponseSchema(taxonomy: string[]) {
  const str = { type: 'STRING' }
  const list = { type: 'ARRAY', items: str }
  return {
    type: 'OBJECT',
    properties: {
      isPlantImage: { type: 'BOOLEAN' },
      observedCrop: str,
      cropMatchesReported: { type: 'STRING', enum: ['yes', 'no', 'unsure'] },
      imageQuality: { type: 'STRING', enum: ['good', 'acceptable', 'poor', 'unusable'] },
      imageQualityIssues: list,
      diagnosisCode: { type: 'STRING', enum: taxonomy },
      diagnosisName: str,
      certainty: { type: 'STRING', enum: ['high', 'moderate', 'low', 'insufficient_evidence'] },
      severity: { type: 'STRING', enum: ['healthy', 'mild', 'moderate', 'severe', 'unknown'] },
      visibleSymptoms: list,
      supportingEvidence: list,
      contradictingEvidence: list,
      alternativeDiagnoses: list,
      limitations: list,
      summary: str
    },
    required: [
      'isPlantImage', 'observedCrop', 'cropMatchesReported', 'imageQuality', 'imageQualityIssues',
      'diagnosisCode', 'diagnosisName', 'certainty', 'severity', 'visibleSymptoms',
      'supportingEvidence', 'contradictingEvidence', 'alternativeDiagnoses', 'limitations', 'summary'
    ]
  }
}

export function buildDiagnosisPrompt(crop: string | undefined, taxonomy: string[], stage?: string): string {
  const cropLine = crop
    ? `The farmer reports this is a ${crop} crop${stage ? ` at the ${stage} stage` : ''}. Verify this from the image; do not assume it.`
    : 'The crop is not specified. Identify it from the image if you can.'
  return `You are a plant pathologist examining a single field photo. ${cropLine}

Report ONLY what is visible in this image. First judge whether the image can be examined at all:
- imageQuality "unusable": the plant tissue is out of focus or motion-blurred so that leaf veins and lesion edges cannot be made out, OR the image is too dark or overexposed to see colour and texture. Do not guess through blur or darkness.
- If the main subject is a person, animal, object or a distant landscape and no leaf, stem or fruit is shown close enough to inspect, use diagnosisCode "insufficient evidence" (a plant in the background is not enough).

Rules:
1. If the image does not show a plant (leaf, stem, fruit, root or whole plant), set isPlantImage=false.
2. diagnosisCode must be one of: ${taxonomy.join(', ')}. Use "insufficient evidence" when the image is too blurry, dark, distant or partial to judge, or when the visible symptoms do not clearly match one condition.
3. supportingEvidence: concrete visible features (colour, shape, size, distribution of lesions or damage). Never list symptoms you cannot see.
4. certainty: "high" only when several hallmark signs are clearly visible; "moderate" when key signs are visible but not conclusive; "low" when signs are nonspecific; "insufficient_evidence" when the image cannot support a judgement.
5. severity describes the visible extent of damage in this image (healthy, mild, moderate, severe), or "unknown".
6. imageQuality: "unusable" if the subject cannot be assessed at all.
7. cropMatchesReported: compare the crop you see with the reported crop ("unsure" if none was reported).
8. summary: one or two plain sentences explaining what you see and why it points to the condition. Do NOT include treatments, product names or doses.
9. Write all text in English.`
}

// ── Gemini call with error classification ────────────────────────────────────

export interface GeminiCallDeps {
  fetchImpl?: typeof fetch
  sleep?: (ms: number) => Promise<void>
}

type CallOutcome =
  | { ok: true; text: string; model: string; attempts: number }
  | { ok: false; status: CallFailureStatus; detail: string; retryAfterSeconds?: number; attempts: number }

function classifyHttpError(httpStatus: number, body: any): CallFailureStatus {
  const msg = String(body?.error?.message || '').toLowerCase()
  const reason = JSON.stringify(body?.error?.details || '')
  if (httpStatus === 401 || httpStatus === 403 || reason.includes('API_KEY_INVALID') || msg.includes('api key')) return 'AUTHENTICATION_ERROR'
  if (httpStatus === 429) return 'RATE_LIMITED'
  if (httpStatus === 504) return 'TIMEOUT'
  if (httpStatus === 400) return 'INVALID_REQUEST'
  if (httpStatus === 404) return 'AI_SERVICE_UNAVAILABLE' // model not found — configuration problem
  if (httpStatus >= 500) return 'AI_SERVICE_UNAVAILABLE'
  return 'GENERAL_ERROR'
}

const RETRYABLE = new Set<CallFailureStatus>(['RATE_LIMITED', 'AI_SERVICE_UNAVAILABLE', 'NETWORK_ERROR'])

export async function callGeminiVision(
  model: string,
  apiKey: string,
  requestBody: unknown,
  deps: GeminiCallDeps = {}
): Promise<CallOutcome> {
  const fetchImpl = deps.fetchImpl || fetch
  const sleep = deps.sleep || ((ms: number) => new Promise<void>(r => setTimeout(r, ms)))
  const deadline = Date.now() + AI_CONFIG.DIAGNOSIS_BUDGET_MS
  let last: CallOutcome | null = null

  for (let attempt = 1; attempt <= AI_CONFIG.DIAGNOSIS_MAX_ATTEMPTS; attempt++) {
    const remaining = deadline - Date.now()
    if (remaining < 3000) break
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), remaining)
    try {
      const res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })
      const body: any = await res.json().catch(() => null)
      if (res.ok) {
        const candidate = body?.candidates?.[0]
        const text = candidate?.content?.parts?.map((p: any) => p?.text || '').join('') || ''
        if (!text.trim()) {
          return { ok: false, status: 'INVALID_AI_RESPONSE', detail: `empty response (finishReason=${candidate?.finishReason || body?.promptFeedback?.blockReason || 'none'})`, attempts: attempt }
        }
        return { ok: true, text, model, attempts: attempt }
      }
      const status = classifyHttpError(res.status, body)
      const retryAfter = Number(res.headers.get('retry-after')) || undefined
      last = { ok: false, status, detail: `HTTP ${res.status}: ${String(body?.error?.message || '').slice(0, 160)}`, retryAfterSeconds: retryAfter, attempts: attempt }
      console.warn(`[GeminiDiagnosis] model=${model} attempt=${attempt} → ${status} (${last.detail})`)
      if (!RETRYABLE.has(status)) return last
    } catch (err: any) {
      const status: CallFailureStatus = err?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR'
      last = { ok: false, status, detail: err?.message || String(err), attempts: attempt }
      console.warn(`[GeminiDiagnosis] model=${model} attempt=${attempt} → ${status}`)
      if (status === 'TIMEOUT') return last // the whole time budget is spent
    } finally {
      clearTimeout(timer)
    }
    if (attempt < AI_CONFIG.DIAGNOSIS_MAX_ATTEMPTS) await sleep(1000 * 2 ** (attempt - 1))
  }
  return last || { ok: false, status: 'TIMEOUT', detail: 'time budget exhausted', attempts: 0 }
}

/** Extracts and validates the model JSON. Returns null when it does not satisfy the schema. */
export function parseModelOutput(text: string, taxonomy: string[]): ModelOutput | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  let raw: unknown
  try { raw = JSON.parse(match[0]) } catch { return null }
  const parsed = ModelOutputSchema.safeParse(raw)
  if (!parsed.success) return null
  const code = parsed.data.diagnosisCode.trim().toLowerCase()
  // A non-plant verdict is valid whatever code accompanies it; otherwise the code must be in the taxonomy.
  if (parsed.data.isPlantImage && !taxonomy.includes(code)) return null
  return { ...parsed.data, diagnosisCode: code }
}

// ── Outcome classification ───────────────────────────────────────────────────

export function classifyModelOutput(
  out: ModelOutput,
  ctx: { reportedCrop?: string; provenance: DiagnosisProvenance }
): AnalyzeCropResponse {
  if (!out.isPlantImage) {
    return { success: false, status: 'NOT_A_PLANT', message: 'This photo does not appear to show a plant. Please photograph a leaf or the affected part of the crop.' }
  }

  const isHealthy = out.diagnosisCode === 'healthy'
  const insufficient =
    out.diagnosisCode === 'insufficient evidence' ||
    out.certainty === 'insufficient_evidence' ||
    out.imageQuality === 'unusable' ||
    // a disease claim with no visible supporting evidence is not a diagnosis
    (!isHealthy && out.supportingEvidence.length === 0)

  if (insufficient) {
    return {
      success: true,
      status: 'INSUFFICIENT_EVIDENCE',
      data: {
        status: 'INSUFFICIENT_EVIDENCE',
        isPlantImage: true,
        cropName: out.observedCrop.trim() || ctx.reportedCrop || null,
        observations: out.visibleSymptoms,
        limitations: out.limitations,
        imageQualityIssues: out.imageQualityIssues,
        guidance: VERIFICATION_GUIDANCE,
        needsExpertReview: true,
        provenance: ctx.provenance
      }
    }
  }

  const certainty = out.certainty
  const { entry, matched } = getKnowledge(out.diagnosisCode)
  // Low certainty or no knowledge entry → no condition-specific guidance, only conservative generic advice.
  const conservative = !isHealthy && (certainty === 'low' || !matched)
  const generic = getKnowledge('').entry
  const immediateActions = conservative ? generic.immediateActions : entry.immediateActions
  const treatment = isHealthy ? [] : conservative ? generic.treatment : entry.treatment
  const prevention = entry.prevention
  const severity: Severity = isHealthy ? 'healthy' : out.severity === 'healthy' ? 'unknown' : out.severity

  const limitations = [...out.limitations]
  if (out.cropMatchesReported === 'no' && ctx.reportedCrop) {
    limitations.unshift(`The photo appears to show ${out.observedCrop}, not the reported crop (${ctx.reportedCrop}).`)
  }

  const cropName = out.cropMatchesReported === 'yes' && ctx.reportedCrop
    ? ctx.reportedCrop
    : (out.observedCrop.trim() || ctx.reportedCrop || 'Unknown crop')
  const name = out.diagnosisName.trim() || out.diagnosisCode
  const summary = out.summary.trim()

  return {
    success: true,
    status: 'SUCCESS',
    data: {
      status: 'SUCCESS',
      isPlantImage: true,
      cropName,
      cropCode: cropName.toLowerCase(),
      reportedCrop: ctx.reportedCrop || null,
      cropMatchesReported: out.cropMatchesReported,
      diagnosisCode: out.diagnosisCode,
      diseaseName: name,
      diagnosisName: name,
      certainty,
      confidenceBand: certainty,
      severity,
      imageQuality: out.imageQuality as 'good' | 'acceptable' | 'poor',
      symptoms: out.visibleSymptoms,
      supportingEvidence: out.supportingEvidence,
      contradictingEvidence: out.contradictingEvidence,
      alternativeDiagnoses: out.alternativeDiagnoses,
      limitations,
      explanation: summary,
      analysis: summary,
      immediateActions,
      treatment,
      recommendations: [...immediateActions, ...treatment],
      prevention,
      longTermPrevention: prevention,
      whenToRecheck: entry.whenToRecheck,
      needsExpertReview: !isHealthy && (certainty !== 'high' || conservative || out.cropMatchesReported === 'no' || entry.reviewStatus !== 'reviewed'),
      needsMoreEvidence: certainty === 'low',
      provenance: { ...ctx.provenance, knowledgeReviewed: !conservative && entry.reviewStatus === 'reviewed' }
    }
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────

export const USER_MESSAGES: Record<CallFailureStatus, string> = {
  RATE_LIMITED: 'The AI diagnosis service is busy right now. Please try again in a minute.',
  AI_SERVICE_UNAVAILABLE: 'AI diagnosis is temporarily unavailable. Please try again shortly.',
  AUTHENTICATION_ERROR: 'AI diagnosis is temporarily unavailable. Please try again later.',
  TIMEOUT: 'The AI diagnosis took too long to respond. Please try again.',
  NETWORK_ERROR: 'The diagnosis server could not reach the AI service. Please try again.',
  INVALID_AI_RESPONSE: 'The AI returned an unusable response, so no diagnosis was made. Please try again.',
  INVALID_REQUEST: 'The diagnosis request was rejected. Please try a different photo.',
  GENERAL_ERROR: 'Something went wrong during diagnosis. Please try again.'
}

export async function analyzeCropWithGeminiModule(params: AnalyzeCropParams, deps: GeminiCallDeps = {}): Promise<AnalyzeCropResponse> {
  const validation = validateImageBase64(params.imageBase64)
  if (!validation.ok) {
    return { success: false, status: 'INVALID_REQUEST', message: validation.message, reason: validation.reason }
  }
  const image = validation.image

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('[GeminiDiagnosis] GEMINI_API_KEY is not configured')
    return { success: false, status: 'AUTHENTICATION_ERROR', message: USER_MESSAGES.AUTHENTICATION_ERROR }
  }

  const reportedCrop = params.farmContext?.crop?.trim() || undefined
  const taxonomy = getTaxonomyForCrop(reportedCrop)
  const model = AI_CONFIG.VISION_MODEL

  const requestBody = {
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: image.mimeType, data: image.base64 } },
        { text: buildDiagnosisPrompt(reportedCrop, taxonomy, params.farmContext?.cropStage?.trim() || undefined) }
      ]
    }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: AI_CONFIG.MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
      responseSchema: buildResponseSchema(taxonomy)
    }
  }

  const started = Date.now()
  console.log(`[GeminiDiagnosis] model=${model} image=${image.mimeType} ${Math.round(image.bytes / 1024)}KB ${image.width ?? '?'}x${image.height ?? '?'} crop=${reportedCrop || 'unspecified'}`)
  const call = await callGeminiVision(model, apiKey, requestBody, deps)
  if (!call.ok) {
    console.warn(`[GeminiDiagnosis] FAILED status=${call.status} after ${call.attempts} attempt(s) in ${Date.now() - started}ms: ${call.detail}`)
    return { success: false, status: call.status, message: USER_MESSAGES[call.status], retryAfterSeconds: call.retryAfterSeconds }
  }

  const out = parseModelOutput(call.text, taxonomy)
  if (!out) {
    console.warn(`[GeminiDiagnosis] INVALID_AI_RESPONSE — output failed schema validation (${call.text.length} chars)`)
    return { success: false, status: 'INVALID_AI_RESPONSE', message: USER_MESSAGES.INVALID_AI_RESPONSE }
  }

  const provenance: DiagnosisProvenance = {
    source: 'gemini-vision',
    model: call.model,
    promptVersion: PROMPT_VERSION,
    knowledgeVersion: KNOWLEDGE_VERSION,
    knowledgeReviewed: false,
    analyzedAt: new Date().toISOString(),
    attempts: call.attempts,
    image: { mimeType: image.mimeType, bytes: image.bytes, width: image.width, height: image.height }
  }
  const result = classifyModelOutput(out, { reportedCrop, provenance })
  console.log(`[GeminiDiagnosis] → ${result.status}${result.status === 'SUCCESS' ? ` code=${result.data.diagnosisCode} certainty=${result.data.certainty} severity=${result.data.severity}` : ''} in ${Date.now() - started}ms`)
  return result
}
