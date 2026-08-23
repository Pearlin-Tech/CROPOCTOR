export interface STTRequestParams {
  audio: string // base64 encoded audio
  mimeType?: string
  languageCode?: string // BCP-47 code e.g. 'en-IN' (default), 'hi-IN', 'gu-IN'
}

export interface STTResponse {
  success: boolean
  transcript?: string
  confidence?: number
  languageCode?: string
  error?: string
}

/**
 * Maps incoming browser MIME types to Google Cloud Speech-to-Text AudioEncodings
 */
function mapAudioEncoding(mimeType?: string): string {
  const mime = (mimeType || '').toLowerCase()
  if (mime.includes('webm')) return 'WEBM_OPUS'
  if (mime.includes('ogg')) return 'OGG_OPUS'
  if (mime.includes('wav')) return 'LINEAR16'
  if (mime.includes('mp3') || mime.includes('mpeg')) return 'MP3'
  if (mime.includes('flac')) return 'FLAC'
  return 'ENCODING_UNSPECIFIED'
}

/**
 * Normalizes and validates language code for Indian English, Hindi, and Gujarati
 */
function resolveLanguageCode(code?: string): string {
  const lang = (code || 'en-IN').toLowerCase().trim()
  if (lang.startsWith('hi')) return 'hi-IN'
  if (lang.startsWith('gu')) return 'gu-IN'
  if (lang.startsWith('en')) return 'en-IN'
  if (lang.startsWith('ar')) return 'ar-SA'
  if (lang.startsWith('fa')) return 'fa-IR'
  if (lang.startsWith('pt')) return 'pt-BR'
  if (lang.startsWith('ru')) return 'ru-RU'
  if (lang.startsWith('zh')) return 'zh-CN'
  return 'en-IN' // Default configuration: Indian English
}

/**
 * Server-side Google Cloud Speech-to-Text service.
 * Converts raw/base64 audio input into a clean text transcript.
 */
export async function transcribeAudio(params: STTRequestParams): Promise<STTResponse> {
  const { audio, mimeType, languageCode } = params

  if (!audio || typeof audio !== 'string' || audio.trim().length === 0) {
    return {
      success: false,
      error: 'Audio content is missing or invalid.'
    }
  }

  // Extract clean base64 data if payload includes data URL prefix
  const cleanBase64 = audio.includes(',') ? audio.split(',')[1] : audio
  const selectedLang = resolveLanguageCode(languageCode)
  const encoding = mapAudioEncoding(mimeType)

  const apiKey = process.env.GOOGLE_SPEECH_API_KEY || process.env.GOOGLE_CLOUD_API_KEY || process.env.GEMINI_API_KEY

  if (!apiKey) {
    console.warn('[STT Service] No Google Speech API Key configured in environment.')
    return {
      success: false,
      error: 'Speech recognition service is currently unconfigured.'
    }
  }

  try {
    // 1. Try Google Cloud Speech-to-Text v1 API
    const sttUrl = `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`
    const sttConfig: any = {
      languageCode: selectedLang,
      alternativeLanguageCodes: selectedLang === 'en-IN' ? ['hi-IN', 'gu-IN'] : ['en-IN'],
      model: 'latest_long',
      enableAutomaticPunctuation: true
    }

    if (encoding !== 'ENCODING_UNSPECIFIED') {
      sttConfig.encoding = encoding
    }

    const sttResponse = await fetch(sttUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: sttConfig,
        audio: { content: cleanBase64 }
      })
    })

    if (sttResponse.ok) {
      const sttData = await sttResponse.json()
      const results = sttData.results || []
      
      if (results.length > 0 && results[0].alternatives?.length > 0) {
        const topAlternative = results[0].alternatives[0]
        const transcript = topAlternative.transcript?.trim()
        
        if (transcript) {
          return {
            success: true,
            transcript,
            confidence: topAlternative.confidence || 0.95,
            languageCode: selectedLang
          }
        }
      }
    } else {
      console.warn(`[STT Service] Google Speech API HTTP ${sttResponse.status}`)
    }

    // 2. Fallback: Gemini Multimodal STT for robust audio transcription
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: cleanBase64
              }
            },
            {
              text: `Transcribe the spoken audio into accurate text in language ${selectedLang}. Return ONLY the verbatim transcript text without any markdown or formatting.`
            }
          ]
        }]
      })
    })

    if (geminiResponse.ok) {
      const geminiData = await geminiResponse.json()
      const rawTranscript = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      
      if (rawTranscript) {
        return {
          success: true,
          transcript: rawTranscript,
          confidence: 0.9,
          languageCode: selectedLang
        }
      }
    }

    return {
      success: false,
      error: 'Could not clearly recognize speech from audio. Please try speaking again.'
    }
  } catch (err: any) {
    console.error('[STT Service Exception]:', err?.message || err)
    return {
      success: false,
      error: 'Failed to process audio request. Please try again.'
    }
  }
}
