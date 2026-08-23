import { auth } from './firebase'

export interface SpeechToTextOptions {
  audio: Blob | string // Blob or base64 data string
  mimeType?: string
  language?: string // Default 'en-IN', supports 'hi-IN', 'gu-IN', etc.
}

export interface SpeechToTextResult {
  success: boolean
  transcript?: string
  confidence?: number
  languageCode?: string
  error?: string
}

/**
 * Converts a Blob to a Base64 encoded string
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      const base64Data = result.includes(',') ? result.split(',')[1] : result
      resolve(base64Data)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Modular client service function for Google Cloud Speech-to-Text.
 * Converts recorded audio into text transcript via secure backend endpoint /api/voice/stt.
 * Automatically attaches Firebase Auth Bearer token for authentication.
 *
 * Usage:
 * const result = await speechToText(audioBlob, 'en-IN')
 * // or
 * const result = await speechToText({ audio: audioBlob, language: 'en-IN' })
 */
export async function speechToText(
  audioOrOptions: Blob | string | SpeechToTextOptions,
  languageParam?: string
): Promise<SpeechToTextResult> {
  let audio: Blob | string
  let mimeType: string | undefined
  let language: string = languageParam || 'en-IN'

  if (audioOrOptions && typeof audioOrOptions === 'object' && !(audioOrOptions instanceof Blob)) {
    audio = audioOrOptions.audio
    mimeType = audioOrOptions.mimeType
    language = audioOrOptions.language || language
  } else {
    audio = audioOrOptions as Blob | string
  }

  // Convert Blob to Base64 if needed
  let base64Audio: string
  if (audio instanceof Blob) {
    mimeType = mimeType || audio.type || 'audio/webm'
    base64Audio = await blobToBase64(audio)
  } else {
    base64Audio = audio
  }

  // Obtain current user's Firebase Auth ID token
  let idToken = ''
  try {
    const currentUser = auth.currentUser
    if (currentUser) {
      idToken = await currentUser.getIdToken(false)
    }
  } catch (err) {
    console.warn('[speechToText] Firebase ID Token retrieval notice:', err)
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`
  } else {
    // Development fallback token if auth user is mocked
    headers['Authorization'] = 'Bearer dev-session-token'
  }

  try {
    const response = await fetch('/api/voice/stt', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        audio: base64Audio,
        mimeType: mimeType || 'audio/webm',
        languageCode: language
      })
    })

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: 'Authentication required. Please sign in to use Speech-to-Text.'
      }
    }

    if (!response.ok) {
      return {
        success: false,
        error: 'Speech-to-Text service request failed.'
      }
    }

    const data = await response.json()
    return {
      success: Boolean(data.success),
      transcript: data.transcript,
      confidence: data.confidence,
      languageCode: data.languageCode || language,
      error: data.error
    }
  } catch (err: any) {
    console.error('[speechToText Service Exception]:', err?.message || err)
    return {
      success: false,
      error: 'Network connection issue. Unable to connect to Speech-to-Text service.'
    }
  }
}
