export interface TTSRequestParams {
  text: string
  languageCode?: string // BCP-47 code: 'en-IN' (default), 'hi-IN', 'gu-IN'
  speakingRate?: number
}

export interface TTSResponse {
  success: boolean
  audioContent?: string // Base64 encoded MP3 audio data
  languageCode?: string
  format?: string
  error?: string
}

/**
 * Normalizes language codes and maps to optimal Google Cloud TTS voices
 */
function resolveTTSVoiceConfig(languageCode?: string): { languageCode: string; name?: string } {
  const code = (languageCode || 'en-IN').trim()
  const lower = code.toLowerCase()

  if (lower.startsWith('hi')) {
    return { languageCode: 'hi-IN', name: 'hi-IN-Neural2-A' }
  }
  if (lower.startsWith('gu')) {
    return { languageCode: 'gu-IN', name: 'gu-IN-Standard-A' }
  }
  if (lower.startsWith('ar')) {
    return { languageCode: 'ar-SA' }
  }
  if (lower.startsWith('fa')) {
    return { languageCode: 'fa-IR' }
  }
  if (lower.startsWith('pt')) {
    return { languageCode: 'pt-BR' }
  }
  if (lower.startsWith('ru')) {
    return { languageCode: 'ru-RU' }
  }
  if (lower.startsWith('zh')) {
    return { languageCode: 'zh-CN' }
  }

  // Default configuration: English (India)
  return { languageCode: 'en-IN', name: 'en-IN-Neural2-A' }
}

/**
 * Server-side Google Cloud Text-to-Speech synthesis service.
 * Converts input response text into browser-compatible MP3 audio base64 stream.
 */
export async function synthesizeTextToSpeech(params: TTSRequestParams): Promise<TTSResponse> {
  const { text, languageCode, speakingRate } = params

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      success: false,
      error: 'Text input is required for Text-to-Speech synthesis.'
    }
  }

  const voiceConfig = resolveTTSVoiceConfig(languageCode)
  const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_CLOUD_API_KEY || process.env.GEMINI_API_KEY

  if (!apiKey) {
    console.warn('[TTS Service] No Google Text-to-Speech API key configured in environment.')
    return {
      success: false,
      error: 'Text-to-Speech service is currently unconfigured.'
    }
  }

  try {
    const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`
    const payload = {
      input: { text: text.trim() },
      voice: {
        languageCode: voiceConfig.languageCode,
        ...(voiceConfig.name ? { name: voiceConfig.name } : {}),
        ssmlGender: 'NEUTRAL'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: speakingRate || 1.0,
        pitch: 0
      }
    }

    const response = await fetch(ttsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      console.warn(`[TTS Service] Google TTS API returned HTTP ${response.status}`)
      return {
        success: false,
        error: 'Unable to synthesize speech audio from text.'
      }
    }

    const data = await response.json()
    const audioContent = data.audioContent

    if (!audioContent) {
      return {
        success: false,
        error: 'Google TTS returned empty audio payload.'
      }
    }

    return {
      success: true,
      audioContent,
      languageCode: voiceConfig.languageCode,
      format: 'mp3'
    }
  } catch (err: any) {
    console.error('[TTS Service Exception]:', err?.message || err)
    return {
      success: false,
      error: 'An error occurred while processing Text-to-Speech synthesis.'
    }
  }
}
