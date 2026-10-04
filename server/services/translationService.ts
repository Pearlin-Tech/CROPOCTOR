/**
 * Presentation-time translation of AI-generated content (diagnosis text, etc.).
 *
 * Input is a flat object whose values are strings or string arrays; the output has exactly
 * the same keys and shape. Stored records are never modified — callers translate for display.
 */
import crypto from 'node:crypto'
import { AI_CONFIG, getLanguageName } from '../config/aiConfig.js'

export type TranslatableContent = Record<string, string | string[]>

const MAX_INPUT_CHARS = 20000
const cache = new Map<string, TranslatableContent>()
const CACHE_MAX = 500

export function isTranslatable(input: unknown): input is TranslatableContent {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false
  return Object.values(input).every(v => typeof v === 'string' || (Array.isArray(v) && v.every(s => typeof s === 'string')))
}

function sameShape(src: TranslatableContent, out: any): out is TranslatableContent {
  if (!out || typeof out !== 'object') return false
  return Object.entries(src).every(([k, v]) =>
    Array.isArray(v) ? Array.isArray(out[k]) && out[k].length === v.length && out[k].every((s: unknown) => typeof s === 'string')
      : typeof out[k] === 'string')
}

export type TranslateResult =
  | { ok: true; translated: TranslatableContent; cached: boolean }
  | { ok: false; status: number; error: string }

export async function translateContent(content: TranslatableContent, targetLanguage: string): Promise<TranslateResult> {
  const lang = targetLanguage.split('-')[0]
  if (lang === 'en') return { ok: true, translated: content, cached: true }
  const langName = getLanguageName(targetLanguage) !== 'English' ? getLanguageName(targetLanguage) : getLanguageName(lang)
  if (langName === 'English') return { ok: false, status: 400, error: `Unsupported language: ${targetLanguage}` }

  const json = JSON.stringify(content)
  if (json.length > MAX_INPUT_CHARS) return { ok: false, status: 413, error: 'Content too large to translate' }

  const key = crypto.createHash('sha256').update(`${lang}\n${json}`).digest('hex')
  const hit = cache.get(key)
  if (hit) return { ok: true, translated: hit, cached: true }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { ok: false, status: 503, error: 'Translation service is not configured' }

  const prompt = `Translate every string value in this JSON from English into ${langName}, for farmers reading an agricultural app. Use simple, natural ${langName}. Keep JSON keys and array lengths exactly the same. Keep numbers, units, {{placeholders}} and scientific (Latin) names unchanged. Do not add, remove or explain anything. Return only the JSON.\n\n${json}`
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.TEXT_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 8192 }
      }),
      signal: AbortSignal.timeout(30000)
    })
    if (!res.ok) {
      console.warn(`[translate] Gemini HTTP ${res.status} (lang=${lang})`)
      return { ok: false, status: res.status === 429 ? 429 : 503, error: 'Translation is temporarily unavailable' }
    }
    const body: any = await res.json()
    const text = body?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') || ''
    let parsed: unknown
    try { parsed = JSON.parse(text) } catch { parsed = null }
    if (!sameShape(content, parsed)) {
      console.warn(`[translate] response did not match input shape (lang=${lang})`)
      return { ok: false, status: 502, error: 'Translation returned an invalid response' }
    }
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string)
    cache.set(key, parsed)
    return { ok: true, translated: parsed, cached: false }
  } catch (err: any) {
    console.warn(`[translate] ${err?.name === 'TimeoutError' ? 'timeout' : 'network error'} (lang=${lang})`)
    return { ok: false, status: 504, error: 'Translation timed out' }
  }
}
