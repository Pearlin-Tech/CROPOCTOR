import { auth } from './firebase'

export interface GeminiAssistantOptions {
  query: string
  activeFarmId?: string
  language?: string
}

export interface GeminiAssistantResult {
  success: boolean
  intent: string
  farmId?: string
  farmName?: string
  answer: string
  data?: any
  error?: string
}

/**
 * Reusable client service function for Gemini CROPOCTOR Assistant.
 * Connects typed user queries or STT voice transcripts to secure backend endpoint /api/voice/assistant.
 * Attaches Firebase Auth token automatically.
 */
export async function processAssistantRequest(
  queryOrOptions: string | GeminiAssistantOptions,
  activeFarmIdParam?: string,
  languageParam?: string
): Promise<GeminiAssistantResult> {
  let query: string
  let activeFarmId: string | undefined = activeFarmIdParam
  let language: string = languageParam || localStorage.getItem('agri_ai_language') || 'en-IN'

  if (typeof queryOrOptions === 'object') {
    query = queryOrOptions.query
    activeFarmId = queryOrOptions.activeFarmId || activeFarmId
    language = queryOrOptions.language || language
  } else {
    query = queryOrOptions
  }

  let idToken = ''
  try {
    const currentUser = auth.currentUser
    if (currentUser) {
      idToken = await currentUser.getIdToken(false)
    }
  } catch (err) {
    console.warn('[geminiAssistantClient] Firebase ID token retrieval notice:', err)
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
    const response = await fetch('/api/voice/assistant', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        activeFarmId,
        language
      })
    })

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        intent: 'UNKNOWN',
        answer: 'Authentication required. Please log in to ask CROPOCTOR Assistant.',
        error: 'Unauthorized'
      }
    }

    if (!response.ok) {
      return {
        success: false,
        intent: 'UNKNOWN',
        answer: 'Assistant service request failed.',
        error: `HTTP ${response.status}`
      }
    }

    const data = await response.json()
    return {
      success: Boolean(data.success),
      intent: data.intent || 'GENERAL_AGRICULTURE_QUESTION',
      farmId: data.farmId,
      farmName: data.farmName,
      answer: data.answer || 'No recommendation generated.',
      data: data.data,
      error: data.error
    }
  } catch (err: any) {
    console.error('[geminiAssistantClient Exception]:', err?.message || err)
    return {
      success: false,
      intent: 'UNKNOWN',
      answer: 'Network connection issue. Unable to connect to Assistant service.',
      error: err?.message || String(err)
    }
  }
}
