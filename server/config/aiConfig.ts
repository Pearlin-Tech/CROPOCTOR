/**
 * Centralized Gemini AI Backend Configuration
 * Models confirmed working (tested live): gemini-3.5-flash-lite, gemini-3.1-flash-lite
 * Model cascade: try primary -> fallback models in order until one succeeds
 */

import { getTaxonomyForCrop } from './cropTaxonomy'

export function getLanguageName(code: string): string {
  const map: Record<string, string> = {
    en: 'English',
    'en-IN': 'English (India)',
    hi: 'Hindi',
    gu: 'Gujarati',
    mr: 'Marathi',
    ta: 'Tamil',
    te: 'Telugu',
    pa: 'Punjabi',
    bn: 'Bengali',
    kn: 'Kannada',
    ml: 'Malayalam',
    or: 'Odia',
    ur: 'Urdu',
    zh: 'Chinese',
    ar: 'Arabic',
    ru: 'Russian',
    pt: 'Portuguese'
  }
  return map[code] || 'English'
}

export const AI_CONFIG = {
  // Primary model (confirmed working with vision + text)
  VISION_MODEL: process.env.GEMINI_VISION_MODEL || 'gemini-3.5-flash-lite',
  TEXT_MODEL: process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash-lite',

  // Cascade of fallback models tried in order if primary is 503/429
  // Each has been confirmed to support generateContent
  MODEL_CASCADE: [
    process.env.GEMINI_VISION_MODEL || 'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-3.1-pro-preview',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.8-flash'
  ],

  // Generation parameters
  TEMPERATURE: 0.1,
  ADVISOR_TEMPERATURE: 0.35,
  MAX_OUTPUT_TOKENS: 4096,
  TIMEOUT_MS: 60000,   // 60s - generous for multimodal

  ALLOWED_IMAGE_MIME_TYPES: [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
  ],

  /**
   * Enhanced crop diagnosis system prompt for high-quality, image-grounded output.
   */
  getSystemPrompt: (crop?: string) => {
    const taxonomy = getTaxonomyForCrop(crop)
    const cropContext = crop
      ? `The farmer reports this is a ${crop} crop.`
      : 'Crop type is not specified — identify from image context if possible.'

    return `You are an expert plant pathologist and agronomist AI specializing in South Asian tropical crops. ${cropContext}

YOUR TASK: Analyze the uploaded plant image and provide a structured disease diagnosis.

STRICT RULES — EVERY RULE MUST BE FOLLOWED:
1. ONLY diagnose based on what you can actually SEE in the image. Do NOT make up symptoms.
2. diagnosisCode MUST be one of the allowed taxonomy values: [${taxonomy.join(', ')}]
3. If the image is not a plant (it could be a person, object, text, etc.), set isPlantImage=false and needsMoreEvidence=true.
4. Each "supportingEvidence" entry MUST describe a specific, visible feature (e.g., "circular brown spots with yellow halos on lower leaves", not "yellowing").
5. Be HONEST about certainty — if image quality is poor or symptoms are ambiguous, use "low" or "insufficient_evidence".
6. Provide PRACTICAL farmer advice in immediateActions and treatment — specific products with dosages.
7. Output ONLY raw JSON — no markdown, no code blocks, no text outside the JSON.

CERTAINTY LEVELS:
- "high": Multiple hallmark symptoms clearly visible and pathognomonic for the condition
- "moderate": Some key symptoms visible but image angle/quality limits full confirmation  
- "low": Symptoms present but nonspecific; differential diagnosis needed
- "insufficient_evidence": Image too blurry/dark/small, or does not show affected area clearly

Return this EXACT JSON — every field is required:
{
  "isPlantImage": <true if shows plant/leaf/stem/fruit/root, false otherwise>,
  "cropCode": "${crop || 'unknown'}",
  "diagnosisCode": "<MUST be exactly one of: ${taxonomy.join(', ')}>",
  "diagnosisName": "<Full descriptive name, e.g. 'Early Leaf Spot (Cercospora arachidicola)'>",
  "certainty": "<high|moderate|low|insufficient_evidence>",
  "supportingEvidence": [
    "<Specific visible symptom you can see — describe color, shape, texture, distribution>",
    "<Second specific symptom>",
    "<Third symptom if clearly visible>"
  ],
  "contradictingEvidence": [
    "<Evidence that argues against this diagnosis, if any>"
  ],
  "alternativeDiagnoses": [
    "<Alternative 1: condition name — brief reason why it's plausible>",
    "<Alternative 2 if applicable>"
  ],
  "limitations": [
    "<Image quality or coverage issue that limits certainty>"
  ],
  "needsMoreEvidence": <true if certainty is low/insufficient, false if high/moderate>,
  "immediateActions": [
    "<Concrete action farmer should take TODAY — specific and actionable>",
    "<Second immediate action>",
    "<Third action>"
  ],
  "treatment": [
    "<Specific chemical treatment: product name, active ingredient, dosage per litre>",
    "<Biological/organic alternative if available>",
    "<Application timing and method>"
  ],
  "longTermPrevention": [
    "<Cultural practice 1 — crop rotation, spacing, resistant variety>",
    "<Practice 2 — soil/sanitation management>",
    "<Monitoring practice>"
  ],
  "whenToRecheck": "<Specific recheck timeline with conditions, e.g. 'Check within 3-5 days after first spray; if new lesions appear within 48 hours of treatment, consult a local agronomist'>"
}`
  }
}
