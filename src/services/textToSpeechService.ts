import { auth } from './firebase'

export interface TextToSpeechOptions {
  text: string
  languageCode?: string // Default 'en-IN', supports 'hi-IN', 'gu-IN', etc.
  speakingRate?: number
}

export interface TextToSpeechResult {
  success: boolean
  audioContent?: string // Base64 encoded MP3 audio data
  languageCode?: string
  format?: string
  error?: string
}

let activeAudioElement: HTMLAudioElement | null = null

/**
 * Helper to play base64 MP3 audio content in browser HTML5 Audio player
 */
export async function playAudioContent(audioContent: string): Promise<void> {
  stopAudioPlayback()

  if (!audioContent) return

  try {
    const audioSrc = `data:audio/mp3;base64,${audioContent}`
    activeAudioElement = new Audio(audioSrc)
    await activeAudioElement.play()
  } catch (err) {
    console.warn('[textToSpeechService] Audio playback failed:', err)
  }
}

/**
 * Stops any currently playing speech audio
 */
export function stopAudioPlayback(): void {
  if (activeAudioElement) {
    activeAudioElement.pause()
    activeAudioElement.currentTime = 0
    activeAudioElement = null
  }
}

/**
 * Client service function for Google Cloud Text-to-Speech synthesis.
 * Sends text to backend endpoint /api/voice/tts and returns browser-playable MP3 base64 audio.
 * Attaches Firebase Auth token automatically.
 *
 * Usage:
 * const result = await textToSpeech("Hello CROPOCTOR", "en-IN")
 * if (result.success && result.audioContent) {
 *   await playAudioContent(result.audioContent)
 * }
 */
export async function textToSpeech(
  textOrOptions: string | TextToSpeechOptions,
  languageCodeParam?: string
): Promise<TextToSpeechResult> {
  let text: string
  let languageCode: string = languageCodeParam || 'en-IN'
  let speakingRate: number | undefined

  if (typeof textOrOptions === 'object') {
    text = textOrOptions.text
    languageCode = textOrOptions.languageCode || languageCode
    speakingRate = textOrOptions.speakingRate
  } else {
    text = textOrOptions
  }

  let idToken = ''
  try {
    const currentUser = auth.currentUser
    if (currentUser) {
      idToken = await currentUser.getIdToken(false)
    }
  } catch (err) {
    console.warn('[textToSpeechService] Firebase ID Token retrieval notice:', err)
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`
  } else {
    headers['Authorization'] = 'Bearer dev-test-token'
  }

  try {
    const response = await fetch('/api/voice/tts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text,
        languageCode,
        speakingRate
      })
    })

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: 'Authentication required. Please sign in to use Text-to-Speech.'
      }
    }

    if (!response.ok) {
      return {
        success: false,
        error: 'Text-to-Speech service request failed.'
      }
    }

    const data = await response.json()
    return {
      success: Boolean(data.success),
      audioContent: data.audioContent,
      languageCode: data.languageCode || languageCode,
      format: data.format || 'mp3',
      error: data.error
    }
  } catch (err: any) {
    console.error('[textToSpeechService Exception]:', err?.message || err)
    return {
      success: false,
      error: 'Network connection issue. Unable to connect to Text-to-Speech service.'
    }
  }
}
