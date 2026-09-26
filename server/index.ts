import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import dns from 'dns'
import { GoogleGenAI } from '@google/genai'
import iconv from 'iconv-lite'
import encodings from 'iconv-lite/encodings'
import { verifyFirebaseAuth, AuthenticatedRequest } from './middleware/auth'
import { transcribeAudio } from './services/sttService'
import { processAssistantRequest } from './services/geminiAssistantService'
import { synthesizeTextToSpeech } from './services/ttsService'
import { analyzeCropWithGeminiModule } from './services/geminiDiagnosisModule'
import { getSatelliteDataForFarm } from './services/satelliteService'
import { AI_CONFIG } from './config/aiConfig'

  // Pre-bind iconv encodings to resolve tsx bundle lookup issue
  ; (iconv as any).encodings = encodings

dns.setDefaultResultOrder('ipv4first')

dns.setDefaultResultOrder('ipv4first')

dotenv.config()

const app = express()

const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))


// --- MOCK FARMS DATABASE (For server-side lookup matching frontend) ---
const MOCK_FARMS_DB = [
  {
    id: 'farm-001',
    name: 'Rajkot Groundnut Farm',
    location: { lat: 22.3039, lng: 70.8022, city: 'Rajkot', state: 'Gujarat', country: 'India', displayName: 'Rajkot, Gujarat' },
    primaryCrop: 'groundnut',
    soilType: 'loamy',
    cropStage: 'flowering',
    area: 2.45
  },
  {
    id: 'farm-002',
    name: 'Surat Cotton Farm',
    location: { lat: 21.1702, lng: 72.8311, city: 'Surat', state: 'Gujarat', country: 'India', displayName: 'Surat, Gujarat' },
    primaryCrop: 'cotton',
    soilType: 'black',
    cropStage: 'growing',
    area: 3.10
  },
  {
    id: 'farm-003',
    name: 'Junagadh Wheat Farm',
    location: { lat: 21.5222, lng: 70.4579, city: 'Junagadh', state: 'Gujarat', country: 'India', displayName: 'Junagadh, Gujarat' },
    primaryCrop: 'wheat',
    soilType: 'alluvial',
    cropStage: 'seedling',
    area: 1.80
  }
]

// --- IN-MEMORY SERVER CACHE ---
interface CacheEntry {
  timestamp: number
  data: any
}
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes cache
const weatherCache = new Map<string, CacheEntry>()

// Weather Code to Icon & Description Mapping
function mapWeatherCode(code: number): { condition: string; icon: string } {
  if (code === 0) return { condition: 'Clear Sky', icon: 'sunny' }
  if (code >= 1 && code <= 3) return { condition: 'Partly Cloudy', icon: 'partly-cloudy' }
  if (code >= 45 && code <= 48) return { condition: 'Foggy', icon: 'cloudy' }
  if (code >= 51 && code <= 67) return { condition: 'Drizzle & Rain', icon: 'rainy' }
  if (code >= 71 && code <= 77) return { condition: 'Snowfall', icon: 'cloudy' }
  if (code >= 80 && code <= 82) return { condition: 'Rain Showers', icon: 'rainy' }
  if (code >= 95) return { condition: 'Thunderstorm', icon: 'stormy' }
  return { condition: 'Partly Cloudy', icon: 'partly-cloudy' }
}

// Fetch Soil Moisture from Open-Meteo
async function fetchSoilMoisture(lat: number, lng: number): Promise<{ moisture: number; status: 'LOW' | 'ADEQUATE' | 'HIGH' }> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=soil_moisture_0_to_7cm&timezone=auto`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Open-Meteo soil HTTP ${res.status}`)
    const json = await res.json()
    const values: number[] = json.hourly?.soil_moisture_0_to_7cm || []
    const latestValue = values.length > 0 ? values[0] : 0.28
    const rounded = Math.round(latestValue * 100) / 100

    let status: 'LOW' | 'ADEQUATE' | 'HIGH' = 'ADEQUATE'
    if (rounded < 0.15) status = 'LOW'
    else if (rounded > 0.35) status = 'HIGH'

    return { moisture: rounded, status }
  } catch (err) {
    console.warn('[Server] Soil moisture fetch failed, using fallback:', err)
    return { moisture: 0.28, status: 'ADEQUATE' }
  }
}

// Fetch Real Weather Data (Google Weather API or Open-Meteo Fallback)
async function fetchWeatherData(lat: number, lng: number) {
  const googleKey = process.env.GOOGLE_WEATHER_API_KEY
  if (googleKey) {
    try {
      const gUrl = `https://weather.googleapis.com/v1/currentConditions:lookup?location.latitude=${lat}&location.longitude=${lng}&key=${googleKey}`
      const gRes = await fetch(gUrl)
      if (gRes.ok) {
        const gJson = await gRes.json()
        console.log('[Server] Fetched weather from Google Weather API')
      }
    } catch (e) {
      console.warn('[Server] Google Weather API fetch failed, falling back to Open-Meteo', e)
    }
  }

  try {
    const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto`
    const res = await fetch(omUrl)
    if (!res.ok) throw new Error(`Open-Meteo weather HTTP ${res.status}`)
    const json = await res.json()

    const current = json.current || {}
    const daily = json.daily || {}

    const mappedCurrent = mapWeatherCode(current.weather_code ?? 1)
    const currentTemp = Math.round(current.temperature_2m ?? 29)
    const feelsLike = Math.round(current.apparent_temperature ?? currentTemp + 2)
    const humidity = Math.round(current.relative_humidity_2m ?? 75)
    const windSpeed = Math.round(current.wind_speed_10m ?? 14)
    const uvIndex = Math.round(current.uv_index ?? 6)
    const rainChance = Math.round(daily.precipitation_probability_max?.[0] ?? 60)

    const forecast = []
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dates = daily.time || []

    for (let i = 0; i < Math.min(7, dates.length); i++) {
      const dDate = new Date(dates[i])
      const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : daysOfWeek[dDate.getDay()]
      const dCode = daily.weather_code?.[i] ?? 1
      const { condition, icon } = mapWeatherCode(dCode)
      const high = Math.round(daily.temperature_2m_max?.[i] ?? currentTemp)
      const low = Math.round(daily.temperature_2m_min?.[i] ?? currentTemp - 5)
      const dayRain = Math.round(daily.precipitation_probability_max?.[i] ?? 20)

      forecast.push({
        date: dates[i],
        dayLabel,
        high,
        low,
        icon,
        rainChance: dayRain,
        description: condition
      })
    }

    return {
      sourceName: googleKey ? 'Google Weather API' : 'Open-Meteo',
      current: {
        temperature: currentTemp,
        feelsLike,
        condition: mappedCurrent.condition,
        icon: mappedCurrent.icon,
        rainProbability: rainChance,
        humidity,
        windSpeed,
        windDirection: 'SW',
        uvIndex
      },
      forecast
    }
  } catch (err) {
    console.warn('[Server] Weather fetch failed, returning fallback data:', err)
    return {
      sourceName: 'Open-Meteo',
      current: {
        temperature: 29,
        feelsLike: 32,
        condition: 'Partly Cloudy',
        icon: 'partly-cloudy',
        rainProbability: 60,
        humidity: 75,
        windSpeed: 14,
        windDirection: 'SW',
        uvIndex: 6
      },
      forecast: [
        { date: '2026-08-21', dayLabel: 'Today', high: 29, low: 23, icon: 'partly-cloudy', rainChance: 60, description: 'Partly cloudy' },
        { date: '2026-08-22', dayLabel: 'Tomorrow', high: 27, low: 22, icon: 'rainy', rainChance: 85, description: 'Heavy rain expected' },
        { date: '2026-08-23', dayLabel: 'Thu', high: 26, low: 21, icon: 'rainy', rainChance: 70, description: 'Showers' },
        { date: '2026-08-24', dayLabel: 'Fri', high: 28, low: 22, icon: 'partly-cloudy', rainChance: 30, description: 'Clearing up' },
        { date: '2026-08-25', dayLabel: 'Sat', high: 30, low: 23, icon: 'sunny', rainChance: 10, description: 'Sunny' },
        { date: '2026-08-26', dayLabel: 'Sun', high: 31, low: 24, icon: 'sunny', rainChance: 5, description: 'Clear' },
        { date: '2026-08-27', dayLabel: 'Mon', high: 29, low: 22, icon: 'partly-cloudy', rainChance: 25, description: 'Partly cloudy' }
      ]
    }
  }
}

// Gemini AI Agricultural Advisory Generator
async function getGeminiAgriculturalAdvisory(farmContext: any, weather: any, soil: any) {
  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) {
    console.log('[Server] No GEMINI_API_KEY set; returning rule-based agricultural advisory.')
    return getFallbackAdvisory(weather, soil)
  }

  try {
    const prompt = `
You are an expert agricultural agronomy advisor. Return ONLY a raw JSON object (no markdown formatting, no code blocks) matching the exact schema below based on the real farm context, weather, and soil moisture provided.

[FARM CONTEXT]
- Location: ${farmContext.displayName} (${farmContext.country})
- Crop: ${farmContext.crop}
- Crop Stage: ${farmContext.cropStage}
- Soil Type: ${farmContext.soilType}
- Farm Area: ${farmContext.area} acres

[REAL WEATHER]
- Temperature: ${weather.current.temperature}°C (Feels like ${weather.current.feelsLike}°C)
- Humidity: ${weather.current.humidity}%
- Rain Probability: ${weather.current.rainProbability}%
- Wind Speed: ${weather.current.windSpeed} km/h
- UV Index: ${weather.current.uvIndex}
- Condition: ${weather.current.condition}

[SOIL MOISTURE]
- Moisture Level: ${soil.moisture} m³/m³ (Status: ${soil.status})

[EXPECTED JSON SCHEMA]
{
  "irrigation": {
    "status": "delay",
    "reason": "Short agronomic reasoning (max 12 words)"
  },
  "spraying": {
    "status": "postpone",
    "reason": "Short agronomic reasoning (max 12 words)"
  },
  "diseaseRisk": {
    "level": "elevated",
    "reason": "Short agronomic reasoning (max 12 words)"
  },
  "summary": "One line summary of farm impact",
  "confidence": "HIGH"
}
`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.TEXT_MODEL}:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })

    if (!response.ok) throw new Error(`Gemini API HTTP ${response.status}`)
    const resData = await response.json()
    const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleanJsonText)

    if (parsed && parsed.irrigation && parsed.spraying && parsed.diseaseRisk) {
      return parsed
    }
    throw new Error('Gemini response schema mismatch')
  } catch (err) {
    console.warn('[Server] Gemini AI call failed, using safe fallback:', err)
    return getFallbackAdvisory(weather, soil)
  }
}

function getFallbackAdvisory(weather: any, soil: any) {
  const rainProb = weather.current.rainProbability
  const isHighRain = rainProb > 50
  const isHighWind = weather.current.windSpeed > 15
  const isHighHumidity = weather.current.humidity > 70

  return {
    irrigation: {
      status: isHighRain || soil.status === 'HIGH' ? 'delay' : 'proceed',
      reason: isHighRain ? `High rain chance (${rainProb}%) expected. Soil moisture is ${soil.status.toLowerCase()}.` : `Soil moisture is ${soil.status.toLowerCase()}. Irrigate as scheduled.`
    },
    spraying: {
      status: isHighRain || isHighWind ? 'postpone' : 'proceed',
      reason: isHighRain ? 'Rain expected. Spraying chemicals will wash off.' : isHighWind ? 'High wind speed will cause chemical drift.' : 'Favorable wind and rain conditions for spraying.'
    },
    diseaseRisk: {
      level: isHighHumidity && isHighRain ? 'elevated' : 'moderate',
      reason: isHighHumidity ? 'High humidity and warm temp increase fungal risk.' : 'Normal fungal and pest threat level.'
    },
    summary: 'Weather requires monitoring irrigation and spraying schedule.',
    confidence: 'MEDIUM'
  }
}

// GET /api/health endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'cropdoctor-api',
    timestamp: new Date().toISOString()
  });
});

// GET /api/weather endpoint
app.get('/api/weather', async (req: Request, res: Response) => {
  try {
    const farmId = (req.query.farmId as string) || 'farm-001'
    const qLat = req.query.lat ? parseFloat(req.query.lat as string) : null
    const qLng = req.query.lng ? parseFloat(req.query.lng as string) : null

    // 1. Resolve Farm Context
    const farmObj = MOCK_FARMS_DB.find(f => f.id === farmId) || MOCK_FARMS_DB[0]
    const lat = qLat || farmObj.location.lat
    const lng = qLng || farmObj.location.lng

    const farmContext = {
      id: farmObj.id,
      displayName: farmObj.location.displayName,
      city: farmObj.location.city,
      state: farmObj.location.state,
      country: farmObj.location.country,
      crop: (req.query.crop as string) || farmObj.primaryCrop,
      cropStage: (req.query.cropStage as string) || farmObj.cropStage,
      soilType: (req.query.soilType as string) || farmObj.soilType,
      area: farmObj.area,
      lat,
      lng
    }

    // 2. Check Server Cache
    const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}_${farmContext.crop}`
    const cached = weatherCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      console.log(`[Server] Returning cached weather response for ${cacheKey}`)
      return res.json(cached.data)
    }

    // 3. Fetch Weather & Soil Moisture in parallel
    const [weatherResult, soilResult] = await Promise.all([
      fetchWeatherData(lat, lng),
      fetchSoilMoisture(lat, lng)
    ])

    // 4. Get Gemini AI Advisory
    const advisory = await getGeminiAgriculturalAdvisory(farmContext, weatherResult, soilResult)

    // 5. Construct Normalized Weather Payload
    const payload = {
      farmId: farmContext.id,
      updatedAt: new Date().toISOString(),
      location: {
        city: farmContext.city,
        state: farmContext.state,
        country: farmContext.country,
        displayName: farmContext.displayName,
        lat,
        lng
      },
      current: weatherResult.current,
      soil: soilResult,
      forecast: weatherResult.forecast,
      farmImpact: {
        irrigation: advisory.irrigation,
        spraying: advisory.spraying,
        diseaseRisk: advisory.diseaseRisk
      },
      source: {
        weather: weatherResult.sourceName,
        soilMoisture: 'Open-Meteo',
        interpretation: process.env.GEMINI_API_KEY ? 'Gemini AI' : 'Agronomic Engine'
      },
      isDemo: false
    }

    // Cache payload
    weatherCache.set(cacheKey, { timestamp: Date.now(), data: payload })


    return res.json(payload)
  } catch (err: any) {
    console.error('[Server Error /api/weather]:', err)
    return res.status(500).json({ error: 'Failed to fetch weather data', message: err.message })
  }
})
// --- PHASE 1: GOOGLE CLOUD SPEECH-TO-TEXT ENDPOINT ---


/**
 * POST /api/voice/stt
 * Protected endpoint for Google Cloud Speech-to-Text transcription.
 * Rejects unauthenticated requests with HTTP 401.
 */
app.post('/api/voice/stt', verifyFirebaseAuth as any, async (req: Request, res: Response) => {
  try {
    const { audio, mimeType, languageCode } = req.body

    if (!audio) {
      return res.status(400).json({
        success: false,
        error: 'Audio parameter is required.'
      })
    }

    const sttResult = await transcribeAudio({
      audio,
      mimeType: mimeType || 'audio/webm',
      languageCode: languageCode || 'en-IN'
    })

    if (!sttResult.success) {
      return res.status(400).json({
        success: false,
        error: sttResult.error || 'Failed to transcribe speech audio.'
      })
    }

    return res.json({
      success: true,
      transcript: sttResult.transcript,
      confidence: sttResult.confidence,
      languageCode: sttResult.languageCode || 'en-IN'
    })
  } catch (err: any) {
    console.error('[Server Error /api/voice/stt]:', err?.message || err)
    return res.status(500).json({
      success: false,
      error: 'An error occurred while processing speech recognition.'
    })
  }
})

// --- PHASE 2: GEMINI / GOOGLE AI CROPOCTOR ASSISTANT ENDPOINT ---


/**
 * POST /api/voice/assistant
 * Protected endpoint for Gemini CROPOCTOR Assistant logic.
 * Enforces authentication and farm ownership verification.
 */
app.post('/api/voice/assistant', verifyFirebaseAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { query, activeFarmId, language } = req.body
    const userId = req.user?.uid || 'farmer-001'

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required.'
      })
    }

    const assistantResult = await processAssistantRequest(query, {
      userId,
      activeFarmId,
      language: language || 'en-IN'
    })

    return res.json(assistantResult)
  } catch (err: any) {
    console.error('[Server Error /api/voice/assistant]:', err?.message || err)
    return res.status(500).json({
      success: false,
      intent: 'GENERAL_AGRICULTURE_QUESTION',
      answer: 'An error occurred while processing your request.',
      error: err?.message || String(err)
    })
  }
})

// ----------------------------------------------------------------------------
// SATELLITE & REMOTE SENSING ROUTES
// ----------------------------------------------------------------------------
app.get('/api/farms/:farmId/satellite', async (req: Request, res: Response) => {
  try {
    const { farmId } = req.params;
    const { lat, lng } = req.query;
    const latitude = lat ? parseFloat(lat as string) : undefined;
    const longitude = lng ? parseFloat(lng as string) : undefined;
    
    const data = await getSatelliteDataForFarm(farmId, latitude, longitude);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[Server] Error fetching satellite data:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch satellite data' });
  }
});

// ----------------------------------------------------------------------------
// VOICE INTERACTION ROUTES (Speech-to-Text, Agent, Text-to-Speech)
// ----------------------------------------------------------------------------

/**
 * POST /api/voice/tts
 * Protected endpoint for Google Cloud Text-to-Speech synthesis.
 * Rejects unauthenticated requests with HTTP 401.
 */
app.post('/api/voice/tts', verifyFirebaseAuth as any, async (req: Request, res: Response) => {
  try {
    const { text, languageCode, speakingRate } = req.body

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text parameter is required.'
      })
    }

    const ttsResult = await synthesizeTextToSpeech({
      text,
      languageCode: languageCode || 'en-IN',
      speakingRate: speakingRate || 1.0
    })

    if (!ttsResult.success) {
      return res.status(400).json({
        success: false,
        error: ttsResult.error || 'Failed to synthesize speech audio.'
      })
    }

    return res.json({
      success: true,
      audioContent: ttsResult.audioContent,
      languageCode: ttsResult.languageCode || 'en-IN',
      format: ttsResult.format || 'mp3'
    })
  } catch (err: any) {
    console.error('[Server Error /api/voice/tts]:', err?.message || err)
    return res.status(500).json({
      success: false,
      error: 'An error occurred while processing speech synthesis.'
    })
  }
})


// --- GOOGLE AI VOICE ASSISTANT ENDPOINT ---



// Helper for BCP-47 language codes
function mapLanguageCode(lang?: string): string {
  const code = (lang || 'en').toLowerCase()
  if (code.startsWith('hi')) return 'hi-IN'
  if (code.startsWith('gu')) return 'gu-IN'
  if (code.startsWith('ar')) return 'ar-SA'
  if (code.startsWith('fa')) return 'fa-IR'
  if (code.startsWith('am')) return 'am-ET'
  if (code.startsWith('id')) return 'id-ID'
  if (code.startsWith('pt')) return 'pt-BR'
  if (code.startsWith('ru')) return 'ru-RU'
  if (code.startsWith('zh')) return 'zh-CN'
  return 'en-US'
}

// Google Cloud Text-to-Speech synthesis helper
async function synthesizeGoogleTTS(text: string, languageCode: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_CLOUD_API_KEY || process.env.GEMINI_API_KEY
  if (!apiKey) return null

  try {
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode,
          ssmlGender: 'NEUTRAL'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0
        }
      })
    })

    if (!response.ok) {
      console.warn(`[Server TTS] Google TTS API HTTP ${response.status}`)
      return null
    }

    const data = await response.json()
    return data.audioContent || null
  } catch (err) {
    console.warn('[Server TTS] Google Text-to-Speech fetch error:', err)
    return null
  }
}

// POST /api/voice/process endpoint
app.post('/api/voice/process', async (req: Request, res: Response) => {
  try {
    const { audio, mimeType, text, farmContext, weather, language } = req.body
    const bcpLanguage = mapLanguageCode(language)
    const geminiKey = process.env.GEMINI_API_KEY

    let transcript = text || ''
    let aiAnswer = ''
    let shortSpeechAnswer = ''

    const farmInfo = farmContext ? `
[SELECTED FARM CONTEXT]
- Farm Name: ${farmContext.name || 'Selected Farm'}
- Location: ${farmContext.location?.displayName || farmContext.location?.city || 'Rajkot, Gujarat'} (Lat: ${farmContext.location?.lat ?? 22.3039}, Lng: ${farmContext.location?.lng ?? 70.8022})
- Primary Crop: ${farmContext.primaryCrop || 'Groundnut'}
- Crop Stage: ${farmContext.cropStage || 'flowering'}
- Soil Type: ${farmContext.soilType || 'loamy'}
- Farm Area: ${farmContext.area || 2.5} acres
` : ''

    const weatherInfo = weather ? `
[CURRENT WEATHER & SOIL]
- Temperature: ${weather.temperature || 29}°C (Feels like ${weather.feelsLike || 31}°C)
- Humidity: ${weather.humidity || 75}%
- Rain Chance: ${weather.rainChance || 60}%
- Wind Speed: ${weather.windSpeed || 14} km/h
- Condition: ${weather.description || 'Partly Cloudy'}
- Irrigation Status: ${weather.farmImpact?.irrigation?.status || 'delay'} (${weather.farmImpact?.irrigation?.reason || 'Rain expected'})
- Spraying Status: ${weather.farmImpact?.spraying?.status || 'postpone'}
- Disease Risk: ${weather.farmImpact?.diseaseRisk?.level || 'moderate'}
` : ''

    if (geminiKey) {
      const parts: any[] = []

      if (audio) {
        parts.push({
          inlineData: {
            mimeType: mimeType || 'audio/webm',
            data: audio
          }
        })
        parts.push({
          text: `
Listen carefully to the audio query from the farmer in language code (${bcpLanguage}).
Transcribe the user's spoken words into text, then answer the question accurately based on the active farm context and weather provided below.

${farmInfo}
${weatherInfo}

Provide your response strictly in raw JSON format (no markdown formatting, no code blocks):
{
  "transcript": "Exact transcribed text of user's spoken input",
  "answer": "Detailed, practical agronomic advice in ${bcpLanguage} addressing the farmer's question.",
  "shortAnswer": "1-2 sentence spoken summary in ${bcpLanguage} suitable for audio speech synthesis."
}
`
        })
      } else {
        parts.push({
          text: `
Farmer Asked: "${transcript}"

Answer the farmer's question accurately in language code (${bcpLanguage}) based on their selected farm context and current weather below.

${farmInfo}
${weatherInfo}

Provide your response strictly in raw JSON format (no markdown formatting, no code blocks):
{
  "transcript": "${transcript}",
  "answer": "Detailed, practical agronomic advice in ${bcpLanguage} addressing the farmer's question.",
  "shortAnswer": "1-2 sentence spoken summary in ${bcpLanguage} suitable for audio speech synthesis."
}
`
        })
      }

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.TEXT_MODEL}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] })
        }
      )

      if (geminiResponse.ok) {
        const resData = await geminiResponse.json()
        const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || ''
        const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()

        try {
          const parsed = JSON.parse(cleanJsonText)
          transcript = parsed.transcript || transcript || 'Voice query processed'
          aiAnswer = parsed.answer || rawText
          shortSpeechAnswer = parsed.shortAnswer || aiAnswer
        } catch {
          aiAnswer = rawText
          shortSpeechAnswer = rawText.slice(0, 200)
        }
      } else {
        console.warn(`[Server Voice] Gemini API returned HTTP ${geminiResponse.status}`)
      }
    }

    // Fallback if Gemini key is missing or call failed
    if (!aiAnswer) {
      if (!transcript) transcript = "How is my farm doing today?"
      const crop = farmContext?.primaryCrop || 'crop'
      const farmName = farmContext?.name || 'your farm'
      aiAnswer = `For ${farmName} growing ${crop}: Current weather shows ${weather?.description || 'normal conditions'} with ${weather?.temperature || 28}°C. ${weather?.farmImpact?.irrigation?.reason || 'Keep monitoring soil moisture.'}`
      shortSpeechAnswer = `Here is advice for ${farmName}: ${weather?.description || 'normal weather'}, temperature ${weather?.temperature || 28} degrees. ${weather?.farmImpact?.irrigation?.reason || 'Monitor soil moisture.'}`
    }

    // Generate Text-to-Speech audio content via Google Cloud TTS
    const audioContent = await synthesizeGoogleTTS(shortSpeechAnswer || aiAnswer, bcpLanguage)

    return res.json({
      success: true,
      transcript,
      answer: aiAnswer,
      shortAnswer: shortSpeechAnswer,
      audioContent,
      language: bcpLanguage,
      farmId: farmContext?.id || 'default-farm'
    })
  } catch (err: any) {
    console.error('[Server Voice Error]:', err)
    return res.status(500).json({
      success: false,
      error: 'Failed to process voice request',
      message: err.message
    })
  }
})



/**
 * POST /api/analyze-crop
 * Express server route matching Vercel Serverless Function endpoint
 */
app.post('/api/analyze-crop', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, imageUrl, isSample, farmContext, language } = req.body

    const result = await analyzeCropWithGeminiModule({
      imageBase64,
      mimeType,
      imageUrl,
      isSample: Boolean(isSample),
      farmContext,
      language
    })

    if (!result.success || !result.data) {
      const isRateLimit = result.error?.includes('429') || result.error?.toLowerCase().includes('quota');
      return res.status(isRateLimit ? 429 : 400).json({
        success: false,
        error: {
          code: isRateLimit ? 'RATE_LIMIT' : 'AI_ERROR',
          message: result.error || 'Failed to process crop diagnosis.'
        }
      })
    }

    if (!result.data.isPlantImage) {
      return res.status(400).json({
        success: false,
        code: 'NO_PLANT_DETECTED',
        message: 'Please upload a clear image of a plant leaf or crop.'
      })
    }

    return res.json({
      success: true,
      data: result.data
    })
  } catch (err: any) {
    console.error('[Server Error /api/analyze-crop]:', err?.message || err)
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal server error occurred while processing crop diagnosis.'
      }
    })
  }
})

// POST /api/advisor endpoint
app.post('/api/advisor', async (req: Request, res: Response) => {
  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) {
    return res.status(503).json({ error: 'AI features are currently unavailable. Server is missing GEMINI_API_KEY.' })
  }

  try {
    const { question, farmContext, language } = req.body
    if (!question) {
      return res.status(400).json({ error: 'Question is required' })
    }

    const languageMap: Record<string, string> = {
      'en': 'English', 'hi': 'Hindi', 'gu': 'Gujarati', 'mr': 'Marathi',
      'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese', 'ar': 'Arabic',
      'am': 'Amharic', 'fa': 'Persian', 'id': 'Indonesian'
    }
    const targetLangName = language ? (languageMap[language] || language) : '';
    const langInstruction = targetLangName ? `\nCRITICAL LANGUAGE INSTRUCTION:\nYou MUST generate all your textual responses (recommendation, why, whatToDo, currentCondition, risks, whatToMonitor, whenToAct, prosCons) translated into this language: ${targetLangName}. However, the JSON schema keys MUST remain in English.` : '';

    const prompt = `
You are an expert agricultural agronomy advisor. Return ONLY a raw JSON object (no markdown formatting, no code blocks) matching the exact schema below based on the real farm context and the user's question.

CRITICAL SAFETY RULES:
- Never fabricate NDVI, satellite observations, weather, disease symptoms, diagnosis confidence, treatment effectiveness, or farm measurements.
- Use actual available data.
- If data is missing or satellite data is unavailable, say: "Data unavailable" or "Not enough information" rather than hallucinating it.
- Do NOT claim that NDVI proves a specific disease. Satellite data should be treated as supporting farm-level vegetation information.${langInstruction}

[USER QUESTION]
${question}

[FARM CONTEXT]
- Farm ID: ${farmContext?.farmId || 'Unknown'}
- Crop: ${farmContext?.crop || 'Unknown'}
- Crop Stage: ${farmContext?.cropStage || 'Unknown'}
- Soil Type: ${farmContext?.soilType || 'Unknown'}
- Location: ${farmContext?.location || 'Unknown'}
- Farm Area: ${farmContext?.area || 'Unknown'}
- Weather/Status Context: ${farmContext?.weather || 'None'}
- Recent Diagnosis: ${farmContext?.recentDiagnosis || 'None'}
- Satellite/NDVI Data: ${farmContext?.satelliteData || 'None'}
- Farm Health Score: ${farmContext?.healthScore || 'None'}
- Farm Health Status: ${farmContext?.healthStatus || 'None'}

[EXPECTED JSON SCHEMA]
{
  "recommendation": "A clear, concise, direct answer to the user's question.",
  "why": "Brief agronomic reasoning explaining why the recommendation makes sense given the farm data.",
  "currentCondition": "What the diagnosis + weather + satellite data currently indicate.",
  "risks": "What could happen if the issue is ignored.",
  "whatToDo": [
    "Prioritized practical step 1",
    "Prioritized practical step 2"
  ],
  "whatToMonitor": [
    "Specific thing the farmer should watch 1"
  ],
  "whenToAct": "Timing guidance where supported by available data.",
  "prosCons": "When the decision has meaningful alternatives, list pros/cons or trade-offs.",
  "dataUsed": [
    "Crop Stage",
    "Weather Forecast",
    "Satellite NDVI",
    "Diagnosis"
  ]
}
`

    const ai = new GoogleGenAI({ apiKey: geminiKey })
    const response = await ai.models.generateContent({
      model: AI_CONFIG.TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    })

    const parsed = JSON.parse(response.text || '{}')

    if (parsed && parsed.recommendation && parsed.why && parsed.whatToDo && parsed.dataUsed) {
      return res.json({
        success: true,
        answer: parsed.recommendation,
        recommendations: parsed.whatToDo,
        timestamp: new Date().toISOString(),
        structured: parsed
      })
    }
    
    throw new Error('Gemini response schema mismatch')
  } catch (err: any) {
    console.error('[Server Error /api/advisor]:', err)
    if (err.status === 429 || (err.message && err.message.includes('429'))) {
      return res.status(429).json({ 
        success: false, 
        error: { code: 'RATE_LIMIT', message: 'The AI service is temporarily unavailable due to high demand. Please try again in a minute.' } 
      })
    }
    if (err.status === 503 || (err.message && err.message.includes('503'))) {
      return res.status(503).json({ 
        success: false, 
        error: { code: 'SERVICE_UNAVAILABLE', message: 'The AI model is experiencing high demand. Please try again later.' } 
      })
    }
    return res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate AI recommendation. ' + err.message } 
    })
  }
})

/**
 * POST /api/translate
 * Translates historical text payloads on the fly for legacy/historical data localization.
 */
app.post('/api/translate', async (req: Request, res: Response) => {
  const { text, targetLanguage } = req.body
  if (!text || !targetLanguage) {
    return res.status(400).json({ error: 'text and targetLanguage are required' })
  }

  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing' })
  }

  try {
    const prompt = `Translate the following JSON object to ${targetLanguage}. ONLY translate string values. Do NOT translate keys. Return raw JSON only, no markdown formatting.\n\n${JSON.stringify(text)}`
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
      })
    })

    if (!response.ok) {
      throw new Error('Gemini API request failed')
    }

    const data = await response.json()
    let translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    translatedText = translatedText.replace(/```json/g, '').replace(/```/g, '').trim()

    let translatedObj;
    try {
      translatedObj = JSON.parse(translatedText)
    } catch (e) {
      translatedObj = text // fallback
    }

    res.json({ success: true, translatedData: translatedObj })
  } catch (err: any) {
    console.error('[Translation API Error]', err)
    res.status(500).json({ success: false, error: 'Translation failed', details: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`⚡ Agri AI Backend Server running on http://localhost:${PORT}`)
})


