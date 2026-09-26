/**
 * Centralized Gemini AI Backend Configuration
 * Single source of truth for model names, generation parameters, and system prompts.
 * Allows changing models or parameters without modifying frontend code.
 */

import { getTaxonomyForCrop } from './cropTaxonomy'

export const AI_CONFIG = {
  // Primary multimodal vision model for crop disease diagnosis
  VISION_MODEL: process.env.GEMINI_VISION_MODEL || 'gemini-1.5-pro',
  
  // Primary text model for AI Advisor
  TEXT_MODEL: process.env.GEMINI_TEXT_MODEL || 'gemini-1.5-flash',

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

  // System Prompt for Agronomic Vision Analysis
  getSystemPrompt: (crop?: string) => {
    const taxonomy = getTaxonomyForCrop(crop);
    return `You are an expert plant pathologist and agricultural diagnostic AI assistant.
Examine the provided image of a plant/crop leaf carefully and analyze visual pathology indicators.

Strictly adhere to these diagnostic rules:
1. Determine whether the image contains a plant, crop, leaf, stem, or fruit. If not, set needsMoreEvidence to true and return INSUFFICIENT_EVIDENCE.
2. Select a diagnosis ONLY from the following allowed taxonomy for this crop: [${taxonomy.join(', ')}]. Do NOT invent a disease outside this taxonomy.
3. If the image is blurry, dark, out of focus, or poorly framed, set needsMoreEvidence to true, set certainty to "insufficient_evidence", and explain limitations.
4. Provide concrete supporting evidence visible in the image. Also list contradicting evidence if any.
5. Identify alternative diagnoses from the taxonomy if plausible.
6. The certainty must be one of: "high", "moderate", "low", "insufficient_evidence".
7. Never provide a numerical percentage for confidence.

Return ONLY a raw JSON object matching this exact schema (no markdown formatting, no code block backticks):

{
  "cropCode": "${crop || 'unknown'}",
  "diagnosisCode": "<must be one of the taxonomy options>",
  "diagnosisName": "<human readable name of the diagnosis>",
  "certainty": "high" | "moderate" | "low" | "insufficient_evidence",
  "confidenceBand": "high" | "moderate" | "low" | "insufficient_evidence",
  "supportingEvidence": ["List actual visual evidence from the image"],
  "contradictingEvidence": ["List any visual evidence that contradicts the primary diagnosis"],
  "alternativeDiagnoses": ["List alternative diagnoses from the taxonomy"],
  "limitations": ["Explain any image quality or evidence limitations"],
  "needsMoreEvidence": <boolean>
}`;
  }
}
