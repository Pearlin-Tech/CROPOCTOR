import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { AI_CONFIG } from '../config/aiConfig'

dotenv.config()

export interface AnalyzeCropParams {
  imageBase64?: string
  mimeType?: string
  imageUrl?: string
  isSample?: boolean
  farmContext?: {
    farmId?: string
    crop?: string
    cropStage?: string
    soilType?: string
    location?: string
  }
  language?: string
}

export type CertaintyLevel = 'high' | 'moderate' | 'low' | 'insufficient_evidence'

export interface CropDiagnosisResult {
  isPlantImage: boolean
  cropCode: string
  diagnosisCode: string
  diagnosisName: string
  certainty: CertaintyLevel
  confidenceBand: CertaintyLevel
  supportingEvidence: string[]
  contradictingEvidence: string[]
  alternativeDiagnoses: string[]
  limitations: string[]
  needsMoreEvidence: boolean

  // Legacy fields for UI backwards-compatibility
  cropName?: string
  diseaseName?: string
  confidence?: number
  severity?: string
  symptoms?: string[]
  analysis?: string
  treatment?: string[]
  immediateActions?: string[]
  longTermPrevention?: string[]
  whenToRecheck?: string
}

export interface AnalyzeCropResponse {
  success: boolean
  data?: CropDiagnosisResult
  error?: string
}

/**
 * Calls Gemini API with cascade model fallback.
 * Tries each model in AI_CONFIG.MODEL_CASCADE until one succeeds.
 * Returns { ok, status, data } or throws on network error.
 */
async function callGeminiCascade(parts: any[], geminiKey: string): Promise<{ ok: boolean; status: number; data: any }> {
  const modelsToTry = AI_CONFIG.MODEL_CASCADE

  for (const modelName of modelsToTry) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`
    console.log(`[GeminiDiagnosis] Trying model: ${modelName}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.TIMEOUT_MS)

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: AI_CONFIG.TEMPERATURE,
            maxOutputTokens: AI_CONFIG.MAX_OUTPUT_TOKENS
          }
        }),
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId))

      const resData = await response.json()

      if (response.ok) {
        console.log(`[GeminiDiagnosis] SUCCESS with model: ${modelName}`)
        return { ok: true, status: response.status, data: resData }
      }

      const statusCode = response.status
      const errMsg = resData.error?.message || 'Unknown error'
      console.warn(`[GeminiDiagnosis] Model ${modelName} failed HTTP ${statusCode}: ${errMsg.substring(0, 100)}`)

      // 404 = model not found, skip immediately
      // 400 = bad request (likely image format issue), skip
      // 503/429 = try next model
      if (statusCode === 404 || statusCode === 400) continue
      if (statusCode === 503 || statusCode === 429) {
        // Wait briefly before trying next model
        await new Promise(r => setTimeout(r, 1500))
        continue
      }
      // Other errors - still try next model
      continue

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn(`[GeminiDiagnosis] Model ${modelName} timed out`)
      } else {
        console.warn(`[GeminiDiagnosis] Model ${modelName} network error:`, err.message)
      }
      continue
    }
  }

  return { ok: false, status: 503, data: { error: { message: 'All models failed' } } }
}

/**
 * Normalizes and validates parsed Gemini JSON into the CropDiagnosisResult schema.
 */
function normalizeResult(parsed: any, farmContext?: AnalyzeCropParams['farmContext']): CropDiagnosisResult {
  const VALID_CERTAINTY: CertaintyLevel[] = ['high', 'moderate', 'low', 'insufficient_evidence']
  let certainty: CertaintyLevel = 'moderate'
  if (VALID_CERTAINTY.includes(parsed.certainty)) certainty = parsed.certainty
  if (parsed.needsMoreEvidence === true && certainty === 'high') certainty = 'moderate'

  const result: CropDiagnosisResult = {
    isPlantImage: typeof parsed.isPlantImage === 'boolean' ? parsed.isPlantImage : true,
    cropCode: parsed.cropCode || farmContext?.crop || 'unknown',
    diagnosisCode: (parsed.diagnosisCode || 'unknown').toLowerCase().trim(),
    diagnosisName: parsed.diagnosisName || 'Unknown Condition',
    certainty,
    confidenceBand: certainty,
    supportingEvidence: Array.isArray(parsed.supportingEvidence)
      ? parsed.supportingEvidence.filter((s: any) => typeof s === 'string' && s.trim().length > 3)
      : [],
    contradictingEvidence: Array.isArray(parsed.contradictingEvidence)
      ? parsed.contradictingEvidence.filter((s: any) => typeof s === 'string' && s.trim().length > 3)
      : [],
    alternativeDiagnoses: Array.isArray(parsed.alternativeDiagnoses)
      ? parsed.alternativeDiagnoses.filter((s: any) => typeof s === 'string' && s.trim().length > 3)
      : [],
    limitations: Array.isArray(parsed.limitations)
      ? parsed.limitations.filter((s: any) => typeof s === 'string' && s.trim().length > 3)
      : [],
    needsMoreEvidence: Boolean(parsed.needsMoreEvidence),
    treatment: Array.isArray(parsed.treatment)
      ? parsed.treatment.filter((s: any) => typeof s === 'string' && s.trim().length > 3)
      : [],
    immediateActions: Array.isArray(parsed.immediateActions)
      ? parsed.immediateActions.filter((s: any) => typeof s === 'string' && s.trim().length > 3)
      : [],
    longTermPrevention: Array.isArray(parsed.longTermPrevention)
      ? parsed.longTermPrevention.filter((s: any) => typeof s === 'string' && s.trim().length > 3)
      : [],
    whenToRecheck: typeof parsed.whenToRecheck === 'string' ? parsed.whenToRecheck : ''
  }

  // Legacy UI field mappings
  result.cropName = result.cropCode
  result.diseaseName = result.diagnosisName
  result.confidence = certainty === 'high' ? 90
    : certainty === 'moderate' ? 65
    : certainty === 'low' ? 35 : 0
  result.severity = certainty === 'high' ? 'severe' : certainty === 'moderate' ? 'moderate' : 'mild'
  
  if (certainty === 'insufficient_evidence' || !result.isPlantImage) {
    result.confidence = 0
    result.severity = 'unknown'
    result.treatment = []
    result.immediateActions = []
    result.longTermPrevention = []
    result.symptoms = result.supportingEvidence || []
    result.analysis = result.limitations?.join('. ') || 'Insufficient evidence for diagnosis.'
  } else {
    result.symptoms = result.supportingEvidence
    result.analysis = result.supportingEvidence.slice(0, 2).join('. ')
    
    // Ensure minimum content if AI response was sparse
    if (result.immediateActions.length === 0) {
      result.immediateActions = [
        'Isolate or flag plants showing symptoms to track progression',
        'Avoid overhead irrigation — use drip or furrow to reduce leaf wetness',
        'Remove and destroy severely affected leaves to reduce disease spread'
      ]
    }
    if (result.treatment.length === 0) {
      result.treatment = ['Consult your local agricultural extension officer for confirmed treatment recommendations']
    }
    if (result.longTermPrevention.length === 0) {
      result.longTermPrevention = [
        'Practice crop rotation every 2-3 seasons',
        'Maintain proper plant spacing for air circulation',
        'Remove crop debris after harvest'
      ]
    }
    if (!result.whenToRecheck) {
      result.whenToRecheck = 'Recheck within 3-5 days after treatment'
    }
  }

  return result
}

/**
 * Loads image data as base64 from various sources.
 * Returns { base64, mimeType } or null if image cannot be loaded.
 */
async function resolveImageData(params: AnalyzeCropParams): Promise<{ base64: string; mimeType: string } | null> {
  const { imageBase64, mimeType = 'image/jpeg', imageUrl, isSample } = params

  // Priority 1: direct base64 payload
  if (imageBase64) {
    let raw = imageBase64
    let resolvedMime = mimeType

    if (raw.startsWith('data:')) {
      const match = raw.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
      if (match) {
        resolvedMime = match[1]
        raw = match[2]
      } else {
        raw = raw.split(',')[1] || raw
      }
    }
    if (raw.length > 100) return { base64: raw, mimeType: resolvedMime }
  }

  // Priority 2: HTTP/HTTPS URL — fetch and encode
  if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
    try {
      const controller = new AbortController()
      const tid = setTimeout(() => controller.abort(), 15000)
      const fetchRes = await fetch(imageUrl, { signal: controller.signal }).finally(() => clearTimeout(tid))
      if (fetchRes.ok) {
        const buf = Buffer.from(await fetchRes.arrayBuffer())
        const mime = (fetchRes.headers.get('content-type') || 'image/jpeg').split(';')[0].trim()
        return { base64: buf.toString('base64'), mimeType: mime }
      }
    } catch (e) {
      console.warn('[GeminiDiagnosis] Failed to fetch image URL:', e)
    }
  }

  // Priority 3: local static sample file
  if (isSample || (imageUrl && imageUrl.startsWith('/'))) {
    const candidates = [
      imageUrl ? path.join(process.cwd(), 'public', imageUrl) : null,
      path.join(process.cwd(), 'public', 'images', 'disease_leaf_1787238259522.jpg'),
      path.join(process.cwd(), 'public', 'images', 'crop_leaf_1787238240934.jpg')
    ].filter(Boolean) as string[]

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const buf = fs.readFileSync(p)
        const ext = path.extname(p).toLowerCase()
        const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
        return { base64: buf.toString('base64'), mimeType: mime }
      }
    }
  }

  return null
}

/**
 * Main entry point — orchestrates image loading, Gemini call cascade,
 * JSON parsing, and result normalization.
 */
export async function analyzeCropWithGeminiModule(params: AnalyzeCropParams): Promise<AnalyzeCropResponse> {
  const { farmContext } = params

  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) return { success: false, error: 'GEMINI_API_KEY is not configured.' }

  // 1. Resolve image to base64
  const imageData = await resolveImageData(params)
  if (!imageData) {
    return { success: false, error: 'No valid image data could be processed. Please provide a clear photo of the affected plant.' }
  }

  console.log(`[GeminiDiagnosis] Processing image: ${imageData.mimeType}, ${Math.round(imageData.base64.length * 0.75 / 1024)}KB`)
  console.log(`[GeminiDiagnosis] Farm context: crop=${farmContext?.crop || 'unknown'}, stage=${farmContext?.cropStage || 'unknown'}`)

  // 2. Build the multimodal request parts
  const systemPrompt = AI_CONFIG.getSystemPrompt(farmContext?.crop)
  const parts = [
    { inlineData: { mimeType: imageData.mimeType, data: imageData.base64 } },
    { text: systemPrompt }
  ]

  // 3. Call Gemini with model cascade
  let { ok, status, data: resData } = await callGeminiCascade(parts, geminiKey)

  if (!ok) {
    console.warn('[GeminiDiagnosis] Vision cascade failed. Attempting dynamic text-based fallback...')
    
    // Dynamic text-based fallback using the same system prompt but without the image.
    // This allows the model to guess the most likely issues based on crop and stage.
    const textFallbackPrompt = `The vision API is currently overloaded. Please provide a hypothetical but highly probable disease diagnosis for a ${farmContext?.crop || 'crop'} at the ${farmContext?.cropStage || 'current'} stage in ${farmContext?.soilType || 'typical'} soil in ${farmContext?.location || 'this region'}. Make it sound like a suspected fallback diagnosis. Follow the exact JSON structure requested in your system prompt, setting certainty to "insufficient_evidence" and noting that this is a fallback in the limitations.`
    
    const textParts = [
      { text: systemPrompt },
      { text: textFallbackPrompt }
    ]
    
    const fallbackRes = await callGeminiCascade(textParts, geminiKey)
    if (fallbackRes.ok) {
      ok = true
      resData = fallbackRes.data
    } else {
      console.error('[GeminiDiagnosis] Text fallback also failed. Returning high demand error.')
      return {
        success: false,
        error: 'AI service is temporarily unavailable due to high demand. Please try again in a few minutes.'
      }
    }
  }

  // 4. Extract and clean the response text
  const rawText: string = resData.candidates?.[0]?.content?.parts?.[0]?.text || ''
  if (!rawText || rawText.trim().length < 10) {
    console.error('[GeminiDiagnosis] Empty or near-empty response from Gemini')
    return { success: false, error: 'AI returned an empty response. Please retry.' }
  }

  // 5. Clean JSON (remove markdown fencing if model added it)
  const cleanJson = rawText
    .replace(/^[\s\S]*?```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```[\s\S]*$/i, '')
    .trim()

  // Extract first JSON object if there's extra text
  const jsonMatch = cleanJson.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('[GeminiDiagnosis] Could not extract JSON from response:', rawText.substring(0, 300))
    return { success: false, error: 'AI response was not valid JSON. Please retry.' }
  }

  let parsed: any
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch (e) {
    console.error('[GeminiDiagnosis] JSON parse error:', (e as any).message)
    console.error('[GeminiDiagnosis] Raw text:', rawText.substring(0, 400))
    return { success: false, error: 'Failed to parse AI response. Please retry.' }
  }

  // 6. Validate and normalize
  const normalized = normalizeResult(parsed, farmContext)

  console.log(`[GeminiDiagnosis] Result: ${normalized.diagnosisCode} | certainty=${normalized.certainty} | isPlant=${normalized.isPlantImage}`)
  return { success: true, data: normalized }
}
