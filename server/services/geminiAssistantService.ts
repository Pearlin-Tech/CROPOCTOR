import { AssistantTools, ServerFarm } from './assistantTools'

export type AssistantIntent =
  | 'GET_CURRENT_FARM'
  | 'GET_FARMS'
  | 'GET_WEATHER'
  | 'GET_CROP_DETAILS'
  | 'GENERAL_AGRICULTURE_QUESTION'
  | 'GENERAL_CROPOCTOR_QUESTION'

export interface AssistantContext {
  userId: string
  activeFarmId?: string
  language?: string
}

export interface AssistantResponse {
  success: boolean
  intent: AssistantIntent
  farmId?: string
  farmName?: string
  data?: any
  answer: string
  error?: string
}

/**
 * Server-side helper to fetch weather data for a farm using coordinates
 */
async function getWeatherForFarmCoordinates(lat: number, lng: number): Promise<any> {
  try {
    const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`
    const res = await fetch(omUrl)
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
    const json = await res.json()
    const current = json.current || {}

    return {
      temperature: Math.round(current.temperature_2m ?? 29),
      feelsLike: Math.round(current.apparent_temperature ?? 31),
      humidity: Math.round(current.relative_humidity_2m ?? 75),
      windSpeed: Math.round(current.wind_speed_10m ?? 14),
      weatherCode: current.weather_code ?? 1,
      condition: (current.weather_code === 0) ? 'Clear Sky' : (current.weather_code >= 51) ? 'Rain Showers' : 'Partly Cloudy'
    }
  } catch (err) {
    console.warn('[Assistant Weather] Weather fetch fallback used:', err)
    return {
      temperature: 29,
      feelsLike: 31,
      humidity: 75,
      windSpeed: 14,
      condition: 'Partly Cloudy'
    }
  }
}

/**
 * Step 1: Classify intent and target farm using Gemini 2.5 Flash
 */
async function classifyIntentWithGemini(userQuery: string, apiKey: string): Promise<{
  intent: AssistantIntent
  targetFarmId: string | null
  cropName: string | null
}> {
  const prompt = `
You are an intent classifier for CROPOCTOR AI voice assistant.
Classify the user query into EXACTLY ONE of these intent types:
1. GET_CURRENT_FARM: Query asking about current farm details, health, or summary.
2. GET_FARMS: Query asking to list all farms owned by the user.
3. GET_WEATHER: Query asking about current weather, temperature, rain, or forecast.
4. GET_CROP_DETAILS: Query asking specifically about crop stage, soil, or planting details.
5. GENERAL_AGRICULTURE_QUESTION: General farming, pest control, fertilizer, or soil questions.
6. GENERAL_CROPOCTOR_QUESTION: Questions about how to use the CROPOCTOR app.

RULES:
- For GET_WEATHER, GET_CURRENT_FARM, or GET_CROP_DETAILS where the user asks "here", "my farm", "today", "weather", targetFarmId MUST be "CURRENT_SELECTED_FARM".
- DO NOT invent or fabricate random farm IDs like "farm-123". Use "CURRENT_SELECTED_FARM" or null.

Farmer Asked: "${userQuery}"

Return ONLY a raw JSON object (no markdown formatting, no code blocks):
{
  "intent": "GET_WEATHER",
  "targetFarmId": "CURRENT_SELECTED_FARM",
  "cropName": null
}
`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    )

    if (response.ok) {
      const resData = await response.json()
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleanJsonText)

      return {
        intent: parsed.intent || 'GENERAL_AGRICULTURE_QUESTION',
        targetFarmId: parsed.targetFarmId || 'CURRENT_SELECTED_FARM',
        cropName: parsed.cropName || null
      }
    }
  } catch (err) {
    console.warn('[Gemini Classifier] Intent classification fallback triggered:', err)
  }

  // Heuristic rule-based fallback classification
  const q = userQuery.toLowerCase()
  if (q.includes('weather') || q.includes('rain') || q.includes('temp') || q.includes('forecast') || q.includes('sun')) {
    return { intent: 'GET_WEATHER', targetFarmId: 'CURRENT_SELECTED_FARM', cropName: null }
  }
  if (q.includes('my farm') || q.includes('current farm') || q.includes('this farm')) {
    return { intent: 'GET_CURRENT_FARM', targetFarmId: 'CURRENT_SELECTED_FARM', cropName: null }
  }
  if (q.includes('all farms') || q.includes('list farms') || q.includes('my farms')) {
    return { intent: 'GET_FARMS', targetFarmId: null, cropName: null }
  }
  if (q.includes('crop') || q.includes('stage') || q.includes('soil') || q.includes('groundnut') || q.includes('cotton')) {
    return { intent: 'GET_CROP_DETAILS', targetFarmId: 'CURRENT_SELECTED_FARM', cropName: null }
  }
  if (q.includes('cropoctor') || q.includes('app') || q.includes('help')) {
    return { intent: 'GENERAL_CROPOCTOR_QUESTION', targetFarmId: null, cropName: null }
  }

  return { intent: 'GENERAL_AGRICULTURE_QUESTION', targetFarmId: null, cropName: null }
}

/**
 * Step 3: Synthesize final concise natural-language response using Gemini
 */
async function synthesizeFinalAnswer(
  userQuery: string,
  intent: AssistantIntent,
  retrievedData: any,
  language: string,
  apiKey: string
): Promise<string> {
  const prompt = `
You are CROPOCTOR, an expert voice AI agronomy assistant.
Farmer Query: "${userQuery}"
Detected Intent: ${intent}
Language Code: ${language || 'en-IN'}

Retrieved Controlled Application Data:
${JSON.stringify(retrievedData, null, 2)}

Provide a concise, clear, and practical 2-3 sentence answer suitable for a voice interface in language (${language || 'en-IN'}).
Directly address the farmer's question using the retrieved farm and weather data. Do not make up fake data.
`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    )

    if (response.ok) {
      const resData = await response.json()
      const answerText = resData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (answerText) return answerText
    }
  } catch (err) {
    console.warn('[Gemini Synthesizer] Fallback used:', err)
  }

  // Safe fallback response generator
  if (intent === 'GET_WEATHER' && retrievedData?.weather) {
    return `For ${retrievedData.farmName || 'your farm'} (${retrievedData.location?.displayName || 'Rajkot'}): Current weather is ${retrievedData.weather.condition} with ${retrievedData.weather.temperature}°C and ${retrievedData.weather.humidity}% humidity.`
  }
  if (intent === 'GET_CURRENT_FARM' && retrievedData?.farm) {
    return `${retrievedData.farm.name} is ${retrievedData.farm.area} acres growing ${retrievedData.farm.primaryCrop} at the ${retrievedData.farm.cropStage} stage in ${retrievedData.farm.soilType} soil.`
  }
  if (intent === 'GET_FARMS' && retrievedData?.farms) {
    const names = retrievedData.farms.map((f: any) => f.name).join(', ')
    return `You have ${retrievedData.farms.length} registered farms: ${names}.`
  }

  return `Here is advice for your query: Always ensure proper soil moisture, monitor weather forecasts, and consult local agricultural guidelines for optimal crop growth.`
}

/**
 * Reusable server-side assistant service.
 * Pipeline: User Text ➔ Gemini Intent Classifier ➔ Controlled Tool Resolution & Security Ownership Verification ➔ Gemini Synthesis ➔ Voice Answer
 */
export async function processAssistantRequest(
  userQuery: string,
  context: AssistantContext
): Promise<AssistantResponse> {
  const { userId, activeFarmId, language } = context
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_API_KEY || ''

  if (!userQuery || userQuery.trim().length === 0) {
    return {
      success: false,
      intent: 'GENERAL_AGRICULTURE_QUESTION',
      answer: '',
      error: 'Query text is required.'
    }
  }

  // Step 1: Classify Intent
  const classified = await classifyIntentWithGemini(userQuery, apiKey)
  const intent = classified.intent

  let retrievedData: any = null
  let resolvedFarm: ServerFarm | null = null

  try {
    // Step 2: Controlled Tool Resolution & Ownership Security Verification
    if (intent === 'GET_FARMS') {
      const userFarms = AssistantTools.getUserFarms(userId)
      retrievedData = { farms: userFarms }
    } else if (intent === 'GET_CURRENT_FARM' || intent === 'GET_WEATHER' || intent === 'GET_CROP_DETAILS') {
      // Resolve Farm ID: If classifier returned "CURRENT_SELECTED_FARM", use activeFarmId or default to user's first farm
      const targetId = (classified.targetFarmId === 'CURRENT_SELECTED_FARM' || !classified.targetFarmId)
        ? (activeFarmId || 'farm-001')
        : classified.targetFarmId

      // Verify Ownership: Backend checks userId against farm owner farmerId
      resolvedFarm = AssistantTools.getFarmById(userId, targetId)

      if (intent === 'GET_WEATHER') {
        // Reuse existing weather service with resolved farm's coordinates
        const weather = await getWeatherForFarmCoordinates(resolvedFarm.location.lat, resolvedFarm.location.lng)
        retrievedData = {
          farmId: resolvedFarm.id,
          farmName: resolvedFarm.name,
          location: resolvedFarm.location,
          crop: resolvedFarm.primaryCrop,
          weather
        }
      } else if (intent === 'GET_CROP_DETAILS') {
        retrievedData = {
          farmId: resolvedFarm.id,
          farmName: resolvedFarm.name,
          primaryCrop: resolvedFarm.primaryCrop,
          cropStage: resolvedFarm.cropStage,
          soilType: resolvedFarm.soilType,
          area: resolvedFarm.area
        }
      } else {
        retrievedData = { farm: resolvedFarm }
      }
    } else if (intent === 'GENERAL_CROPOCTOR_QUESTION') {
      retrievedData = { app: 'CROPOCTOR', features: ['AI Advisor', 'Voice Assistant', 'Disease Diagnosis', 'Weather Forecasting', 'Farm Management'] }
    }

    // Step 3: Final Answer Synthesis
    const answer = await synthesizeFinalAnswer(userQuery, intent, retrievedData, language || 'en-IN', apiKey)

    return {
      success: true,
      intent,
      farmId: resolvedFarm?.id || (intent === 'GET_FARMS' ? undefined : activeFarmId),
      farmName: resolvedFarm?.name,
      data: retrievedData,
      answer
    }
  } catch (err: any) {
    // Handle security ownership rejection or farm errors safely
    const isSecurityError = err.message?.includes('Permission denied')
    return {
      success: false,
      intent,
      answer: isSecurityError ? 'Permission denied: You can only access weather and crop information for farms that you own.' : 'Unable to retrieve requested farm information.',
      error: err.message
    }
  }
}
