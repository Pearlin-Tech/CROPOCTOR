/**
 * Centralized Gemini AI Backend Configuration
 * Single source of truth for model names, generation parameters, and system prompts.
 * Allows changing models or parameters without modifying frontend code.
 */

import { getTaxonomyForCrop } from './cropTaxonomy'

export const AI_CONFIG = {
  // Primary multimodal vision model for crop disease diagnosis
  VISION_MODEL: process.env.GEMINI_VISION_MODEL || 'gemini-3.1-pro-preview',
  
  // Primary text model for AI Advisor
  TEXT_MODEL: process.env.GEMINI_TEXT_MODEL || 'gemini-3.8-flash',

  // Generation parameters
  TEMPERATURE: 0, // Temperature=0 for fully deterministic, reproducible diagnosis output on the same image
  MAX_OUTPUT_TOKENS: 2048,
  TIMEOUT_MS: 30000, // 30-second request timeout

  // Default allowed MIME types
  ALLOWED_IMAGE_MIME_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ],

  getSystemPrompt: (crop?: string) => {
    const taxonomy = getTaxonomyForCrop(crop);
    return `You are assisting with plant-health image assessment.

Do not force a diagnosis.

Only select a condition when visible evidence supports it.
Compare the image against the supplied candidate conditions.
If evidence is insufficient or ambiguous, return INSUFFICIENT_EVIDENCE.
Do not invent symptoms that are not visible.
Do not infer nutrient deficiencies solely from leaf color.
Do not infer a specific pathogen unless the visual evidence supports the condition.
Separate observation from inference.

Strictly adhere to these rules:
1. Determine whether the image contains a plant, crop, leaf, stem, or fruit. If not, set needsMoreEvidence to true.
2. Select a diagnosis ONLY from the following allowed taxonomy for this crop: [${taxonomy.join(', ')}].
3. Identify alternative diagnoses from the taxonomy if plausible.
4. The certainty must be one of: "high", "moderate", "low", "insufficient".
5. Never provide a numerical percentage for confidence.

Return ONLY a raw JSON object matching this exact schema:

{
  "cropCode": "${crop || 'unknown'}",
  "diagnosisCode": "<must be one of the taxonomy options or 'unknown'>",
  "certainty": "high" | "moderate" | "low" | "insufficient",
  "supportingEvidence": ["List actual visual evidence from the image"],
  "contradictingEvidence": ["List any visual evidence that contradicts the primary diagnosis"],
  "alternativeDiagnoses": [
    {
      "diagnosisCode": "...",
      "reason": "..."
    }
  ],
  "observedSymptoms": ["List all visible symptoms"],
  "limitations": ["Explain any image quality or evidence limitations"],
  "needsMoreEvidence": <boolean>,
  "recommendedAdditionalImages": ["e.g. closer leaf photo, underside of leaf"],
  "classifierSignal": {
    "topClass": "unavailable",
    "topProbability": 0,
    "agreement": "unavailable"
  }
}`;
  }
}
