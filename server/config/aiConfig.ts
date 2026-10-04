/**
 * Centralized Gemini AI backend configuration. Models are set with GEMINI_VISION_MODEL /
 * GEMINI_TEXT_MODEL (server-only env vars); the defaults below apply only when unset.
 */

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
    pt: 'Portuguese',
    'pt-BR': 'Brazilian Portuguese',
    'zh-CN': 'Simplified Chinese',
    am: 'Amharic',
    fa: 'Persian',
    id: 'Indonesian'
  }
  return map[code] || map[code.split('-')[0]] || 'English'
}

export const AI_CONFIG = {
  // Primary model (confirmed working with vision + text)
  VISION_MODEL: process.env.GEMINI_VISION_MODEL || 'gemini-3.5-flash-lite',
  TEXT_MODEL: process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash-lite',

  // AI Advisor only: fallback models tried in order if the primary is 503/429.
  // Crop diagnosis deliberately does NOT cascade — a different model can give a different
  // diagnosis for the same photo, so it uses VISION_MODEL alone.
  MODEL_CASCADE: [
    process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash-lite',
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

  // Crop diagnosis: one pinned vision model, retried on transient errors only.
  // The budget must stay below the Vercel function maxDuration (vercel.json).
  DIAGNOSIS_MAX_ATTEMPTS: 3,
  DIAGNOSIS_BUDGET_MS: Number(process.env.GEMINI_DIAGNOSIS_BUDGET_MS) || 50000,
}
