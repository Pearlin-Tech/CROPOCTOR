import { useEffect, useState } from 'react'
import { auth } from './firebase'
import type { DiagnosisResult } from '@/types'

export type TranslatableContent = Record<string, string | string[]>

const CACHE_PREFIX = 'tr1:'

async function sha(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('')
}

const isEnglish = (lang: string) => !lang || lang.split('-')[0] === 'en'

/**
 * Translates AI-generated content for display via POST /api/translate.
 * Results are cached in localStorage per (language, content). Returns null on failure
 * so callers can fall back to the original text.
 */
export async function translateForDisplay(content: TranslatableContent, language: string): Promise<TranslatableContent | null> {
  if (isEnglish(language)) return content
  const json = JSON.stringify(content)
  const key = CACHE_PREFIX + language + ':' + (await sha(json))
  try {
    const cached = localStorage.getItem(key)
    if (cached) return JSON.parse(cached)
  } catch { /* storage unavailable */ }

  const user = auth.currentUser
  if (!user) return null
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify({ content, targetLanguage: language })
    })
    const body = await res.json().catch(() => null)
    if (!res.ok || !body?.success) return null
    try { localStorage.setItem(key, JSON.stringify(body.translated)) } catch { /* quota */ }
    return body.translated
  } catch {
    return null
  }
}

const DIAGNOSIS_TEXT_FIELDS = [
  'disease', 'diseaseName', 'crop', 'cropName', 'analysis', 'explanation', 'whenToRecheck',
  'symptoms', 'supportingEvidence', 'contradictingEvidence', 'alternativeDiagnoses', 'limitations',
  'immediateActions', 'treatment', 'prevention', 'longTermPrevention', 'recommendations', 'actions'
] as const

function pickText(d: DiagnosisResult): TranslatableContent {
  const out: TranslatableContent = {}
  for (const f of DIAGNOSIS_TEXT_FIELDS) {
    const v = (d as any)[f]
    if (typeof v === 'string' && v.trim()) out[f] = v
    else if (Array.isArray(v) && v.length && v.every(s => typeof s === 'string')) out[f] = v
  }
  return out
}

/**
 * Returns a display copy of a diagnosis in `language`. The stored record (English original)
 * is never modified; while translating, or if translation fails, the original is shown.
 */
export function useLocalizedDiagnosis(d: DiagnosisResult | null, language: string) {
  const [display, setDisplay] = useState<DiagnosisResult | null>(d)
  const [isTranslating, setIsTranslating] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setDisplay(d)
    setFailed(false)
    if (!d || isEnglish(language) || (d.language && d.language === language)) return
    let cancelled = false
    setIsTranslating(true)
    translateForDisplay(pickText(d), language).then(tr => {
      if (cancelled) return
      if (tr) setDisplay({ ...d, ...(tr as any) })
      else setFailed(true)
    }).finally(() => { if (!cancelled) setIsTranslating(false) })
    return () => { cancelled = true }
  }, [d, language])

  return { display, isTranslating, failed }
}

/** Translates short labels (e.g. disease names in a list) in one request. */
export function useLocalizedLabels(labels: Record<string, string>, language: string) {
  const [out, setOut] = useState(labels)
  const sig = JSON.stringify(labels)
  useEffect(() => {
    setOut(labels)
    if (isEnglish(language) || Object.keys(labels).length === 0) return
    let cancelled = false
    translateForDisplay(labels, language).then(tr => { if (!cancelled && tr) setOut(tr as Record<string, string>) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, language])
  return out
}
