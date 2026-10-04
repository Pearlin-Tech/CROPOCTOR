/**
 * Guarantees AI text is in the user's language. Models (especially lite ones) often ignore
 * a "respond in Hindi" instruction and copy the English of the prompt/schema. For languages
 * with their own script we can detect that reliably and translate the output instead.
 */
import { translateContent, type TranslatableContent } from './translationService.js'

const SCRIPT_RANGES: Record<string, RegExp> = {
  hi: /[ऀ-ॿ]/g,  // Devanagari
  mr: /[ऀ-ॿ]/g,
  gu: /[઀-૿]/g,  // Gujarati
  ar: /[؀-ۿ]/g,  // Arabic
  fa: /[؀-ۿ]/g,
  ur: /[؀-ۿ]/g,
  am: /[ሀ-፿]/g,  // Ethiopic
  ru: /[Ѐ-ӿ]/g,  // Cyrillic
  zh: /[一-鿿]/g   // CJK
}

/** true when the text is mostly written in the target language's script (or the language uses Latin script). */
export function isInLanguageScript(text: string, language: string): boolean {
  const re = SCRIPT_RANGES[language.split('-')[0]]
  if (!re) return true // Latin-script languages cannot be verified by script; trust the model
  const letters = text.match(/\p{L}/gu)?.length || 0
  if (letters === 0) return true
  const inScript = text.match(re)?.length || 0
  return inScript / letters >= 0.5
}

function allText(content: TranslatableContent): string {
  return Object.values(content).map(v => (Array.isArray(v) ? v.join(' ') : v)).join(' ')
}

/**
 * Returns `content` unchanged if it is already in `language`; otherwise translates it.
 * If translation fails, the original is returned with `translated: false` so callers can
 * still show something truthful.
 */
export async function ensureLanguage<T extends TranslatableContent>(content: T, language: string): Promise<{ content: T; translated: boolean }> {
  const lang = (language || 'en').split('-')[0]
  if (lang === 'en' || isInLanguageScript(allText(content), lang)) return { content, translated: false }
  const res = await translateContent(content, language)
  if (!res.ok) {
    console.warn(`[languageGuard] output not in ${lang} and translation failed: ${res.error}`)
    return { content, translated: false }
  }
  return { content: res.translated as T, translated: true }
}

/** Picks the string / string[] fields of an object so they can be language-checked. */
export function textFields(obj: Record<string, unknown>): TranslatableContent {
  const out: TranslatableContent = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && v.trim()) out[k] = v
    else if (Array.isArray(v) && v.length && v.every(s => typeof s === 'string')) out[k] = v as string[]
  }
  return out
}
