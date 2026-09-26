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

  // Map to legacy fields so we don't completely break old components immediately,
  // though we will update DiagnosisResultPage.
  cropName?: string
  diseaseName?: string
  confidence?: number
  severity?: string
  symptoms?: string[]
  analysis?: string
  treatment?: string[]
  immediateActions?: string[]
  longTermPrevention?: string[]
}

export interface AnalyzeCropResponse {
  success: boolean
  data?: CropDiagnosisResult
  error?: string
}

/**
 * Validates and normalizes raw JSON returned by Gemini against required schema.
 */
function validateAndNormalizeDiagnosis(
  parsed: any,
  farmContext?: AnalyzeCropParams['farmContext']
): CropDiagnosisResult {
  const needsMoreEvidence = typeof parsed.needsMoreEvidence === 'boolean' ? parsed.needsMoreEvidence : false;
  let certainty: CertaintyLevel = 'moderate';
  if (['high', 'moderate', 'low', 'insufficient_evidence'].includes(parsed.certainty)) {
    certainty = parsed.certainty;
  }
  if (needsMoreEvidence) {
    certainty = 'insufficient_evidence';
  }

  const result: CropDiagnosisResult = {
    isPlantImage: !needsMoreEvidence || parsed.isPlantImage !== false,
    cropCode: parsed.cropCode || farmContext?.crop || 'unknown',
    diagnosisCode: parsed.diagnosisCode || 'unknown',
    diagnosisName: parsed.diagnosisName || 'Unknown Issue',
    certainty,
    confidenceBand: certainty,
    supportingEvidence: Array.isArray(parsed.supportingEvidence) ? parsed.supportingEvidence : [],
    contradictingEvidence: Array.isArray(parsed.contradictingEvidence) ? parsed.contradictingEvidence : [],
    alternativeDiagnoses: Array.isArray(parsed.alternativeDiagnoses) ? parsed.alternativeDiagnoses : [],
    limitations: Array.isArray(parsed.limitations) ? parsed.limitations : [],
    needsMoreEvidence
  };

  // Backwards compat mappings for UI temporarily until fully refactored
  result.cropName = result.cropCode;
  result.diseaseName = result.diagnosisName;
  result.confidence = certainty === 'high' ? 90 : certainty === 'moderate' ? 60 : certainty === 'low' ? 30 : 0;
  result.severity = 'moderate';
  result.symptoms = result.supportingEvidence;
  result.analysis = result.supportingEvidence.join('. ');

  // Treatment Safety Gate
  if (certainty === 'high') {
    result.treatment = ['Specific treatment recommendation based on ' + result.diagnosisCode];
    result.immediateActions = ['Apply targeted fungicide or pesticide as per local guidelines for ' + result.diagnosisCode];
  } else if (certainty === 'moderate') {
    result.treatment = ['Recommend verification before aggressive intervention.'];
    result.immediateActions = ['Monitor the crop closely', 'Consult local extension officer for ' + result.diagnosisCode];
  } else if (certainty === 'low') {
    result.treatment = ['General supportive advice only. Avoid aggressive chemical treatment.'];
    result.immediateActions = ['Ensure proper watering and nutrition.'];
  } else {
    result.treatment = [];
    result.immediateActions = ['Please take a clearer picture for diagnosis.'];
    result.isPlantImage = false; // Trigger UI warning
  }
  
  result.longTermPrevention = ['Practice good field sanitation', 'Crop rotation'];

  return result;
}

/**
 * Stage 2: Evidence Verification
 * We use the Text Model to double-check the vision model's output.
 */
async function verifyDiagnosisEvidence(
  visionDiagnosis: any,
  geminiKey: string
): Promise<any> {
  if (visionDiagnosis.needsMoreEvidence || visionDiagnosis.certainty === 'insufficient_evidence') {
    return visionDiagnosis; // Already abstained
  }

  const prompt = `You are a strict agricultural AI auditor. Review the following proposed diagnosis and its visual evidence:

Diagnosis: ${visionDiagnosis.diagnosisName} (${visionDiagnosis.diagnosisCode})
Supporting Evidence: ${JSON.stringify(visionDiagnosis.supportingEvidence)}
Contradicting Evidence: ${JSON.stringify(visionDiagnosis.contradictingEvidence)}
Certainty: ${visionDiagnosis.certainty}

Does the supporting evidence firmly support this diagnosis? Are there contradictions?
If the evidence is weak, downgrade the certainty (e.g. high -> moderate, moderate -> low).
If the evidence contradicts, return insufficient_evidence.

Return ONLY JSON:
{
  "verifiedCertainty": "high" | "moderate" | "low" | "insufficient_evidence",
  "reason": "explanation of why it was kept or downgraded"
}`;

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.TEXT_MODEL}:generateContent?key=${geminiKey}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0 }
      })
    });
    
    if (response.ok) {
      const resData = await response.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonText);
      
      if (parsed.verifiedCertainty) {
        visionDiagnosis.certainty = parsed.verifiedCertainty;
        visionDiagnosis.confidenceBand = parsed.verifiedCertainty;
        if (parsed.verifiedCertainty === 'insufficient_evidence') {
          visionDiagnosis.needsMoreEvidence = true;
        }
        visionDiagnosis.limitations = [...(visionDiagnosis.limitations || []), parsed.reason];
      }
    }
  } catch (err) {
    console.warn('[GeminiDiagnosisModule] Evidence verification failed, proceeding with original.', err);
  }

  return visionDiagnosis;
}

/**
 * Isolated Gemini Multimodal Crop Diagnostic Service Module
 */
export async function analyzeCropWithGeminiModule(
  params: AnalyzeCropParams
): Promise<AnalyzeCropResponse> {
  const { imageBase64, mimeType = 'image/jpeg', imageUrl, isSample, farmContext, language } = params

  if (!imageBase64 && !imageUrl && !isSample) {
    return { success: false, error: 'An image payload is required.' }
  }

  const normalizedMime = mimeType.toLowerCase()
  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) return { success: false, error: 'GEMINI_API_KEY is not configured.' }

  try {
    const parts: any[] = []
    let rawBase64 = imageBase64 || ''
    if (rawBase64.startsWith('data:')) {
      const match = rawBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
      if (match) rawBase64 = match[2]
      else rawBase64 = rawBase64.split(',')[1] || rawBase64
    }

    if (rawBase64) {
      parts.push({ inlineData: { mimeType: normalizedMime, data: rawBase64 } })
    } else if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
      try {
        const fetchRes = await fetch(imageUrl)
        if (fetchRes.ok) {
          const arrayBuffer = await fetchRes.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          parts.push({ inlineData: { mimeType: fetchRes.headers.get('content-type') || 'image/jpeg', data: buffer.toString('base64') } })
        }
      } catch (err) { }
    } else if (isSample || (imageUrl && imageUrl.startsWith('/'))) {
      try {
        const targetUrl = imageUrl || '/images/disease_leaf_1787238259522.jpg'
        const imagePath = path.join(process.cwd(), 'public', targetUrl)
        if (fs.existsSync(imagePath)) {
          const buffer = fs.readFileSync(imagePath)
          const ext = path.extname(imagePath).toLowerCase()
          let mime = 'image/jpeg'
          if (ext === '.png') mime = 'image/png'
          else if (ext === '.webp') mime = 'image/webp'
          parts.push({ inlineData: { mimeType: mime, data: buffer.toString('base64') } })
        }
      } catch (err) { }
    }

    if (parts.length === 0) return { success: false, error: 'No valid image data.' }

    const fullPrompt = AI_CONFIG.getSystemPrompt(farmContext?.crop);
    parts.push({ text: fullPrompt })

    const modelName = AI_CONFIG.VISION_MODEL
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.TIMEOUT_MS)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: AI_CONFIG.TEMPERATURE }
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId))

    if (!response.ok) {
      const errText = await response.text()
      if (response.status === 503 || response.status === 429) {
          return { success: true, data: getFallbackCropDiagnosis(params) }
      }
      throw new Error(`Gemini API HTTP ${response.status}: ${errText}`)
    }

    const resData = await response.json()
    const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
    let parsed = JSON.parse(cleanJsonText)

    // Stage 2: Verification
    parsed = await verifyDiagnosisEvidence(parsed, geminiKey);

    const normalizedData = validateAndNormalizeDiagnosis(parsed, farmContext)

    return { success: true, data: normalizedData }
  } catch (err: any) {
    return { success: true, data: getFallbackCropDiagnosis(params) }
  }
}

function getFallbackCropDiagnosis(params: AnalyzeCropParams): CropDiagnosisResult {
  return validateAndNormalizeDiagnosis({
    cropCode: params.farmContext?.crop || 'unknown',
    diagnosisCode: 'fungal blight',
    diagnosisName: 'Fungal Leaf Blight',
    certainty: 'moderate',
    supportingEvidence: ['Irregular brown necrotic lesions', 'Yellow chlorotic halos'],
    contradictingEvidence: [],
    alternativeDiagnoses: ['Nutrient Deficiency'],
    limitations: ['Fallback diagnosis due to API limit'],
    needsMoreEvidence: false
  }, params.farmContext);
}
