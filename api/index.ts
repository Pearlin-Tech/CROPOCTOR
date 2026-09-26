import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import dns from 'dns'

dotenv.config()

dns.setDefaultResultOrder('ipv4first')

// Pre-bind iconv encodings to resolve tsx bundle lookup issue
import iconv from 'iconv-lite'
import encodings from 'iconv-lite/encodings'
;(iconv as any).encodings = encodings

import { GoogleGenAI } from '@google/genai'
import { verifyFirebaseAuth, AuthenticatedRequest } from '../server/middleware/auth'
import { transcribeAudio } from '../server/services/sttService'
import { processAssistantRequest } from '../server/services/geminiAssistantService'
import { synthesizeTextToSpeech } from '../server/services/ttsService'
import { analyzeCropWithGeminiModule } from '../server/services/geminiDiagnosisModule'
import { getSatelliteDataForFarm } from '../server/services/satelliteService'
import { runFarmMonitor } from '../server/services/monitorService'
import { AI_CONFIG } from '../server/config/aiConfig'

const app = express()

// ── Rate limiting (in-memory, per IP) ─────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000  // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100  // per window per IP
const rateLimitMap = new Map<string, { count: number; windowStart: number }>()

function rateLimit(req: Request, res: Response, next: () => void) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now })
  } else {
    entry.count++
    if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
      res.setHeader('Retry-After', '60')
      return res.status(429).json({ error: 'Too many requests', retryAfterSeconds: 60 })
    }
  }
  next()
}

// Prune stale entries every 5 minutes to avoid memory leak
setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS * 2
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (entry.windowStart < cutoff) rateLimitMap.delete(ip)
  }
}, 5 * 60 * 1000).unref()

app.use(cors({ origin: true }))
app.use(rateLimit)
app.use(express.json({ limit: '10mb' }))

// ── In-memory server cache ────────────────────────────────────────────────────
interface CacheEntry { timestamp: number; data: any }
const CACHE_TTL_MS = 10 * 60 * 1000
const weatherCache = new Map<string, CacheEntry>()

// ── Weather helpers ───────────────────────────────────────────────────────────
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
  } catch {
    return { moisture: 0.28, status: 'ADEQUATE' }
  }
}

async function fetchWeatherData(lat: number, lng: number) {
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

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dates = daily.time || []
  const forecast = []
  for (let i = 0; i < Math.min(7, dates.length); i++) {
    const dDate = new Date(dates[i])
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : daysOfWeek[dDate.getDay()]
    const dCode = daily.weather_code?.[i] ?? 1
    const { condition, icon } = mapWeatherCode(dCode)
    forecast.push({
      date: dates[i], dayLabel,
      high: Math.round(daily.temperature_2m_max?.[i] ?? currentTemp),
      low: Math.round(daily.temperature_2m_min?.[i] ?? currentTemp - 5),
      icon, rainChance: Math.round(daily.precipitation_probability_max?.[i] ?? 20),
      description: condition
    })
  }

  return {
    sourceName: 'Open-Meteo',
    updatedAt: new Date().toISOString(),
    current: { temperature: currentTemp, feelsLike, condition: mappedCurrent.condition, icon: mappedCurrent.icon, rainProbability: rainChance, humidity, windSpeed, windDirection: 'SW', uvIndex },
    forecast
  }
}

function getFallbackAdvisory(weather: any, soil: any) {
  const rainProb = weather.current.rainProbability
  const isHighRain = rainProb > 50
  const isHighWind = weather.current.windSpeed > 15
  const isHighHumidity = weather.current.humidity > 70
  return {
    irrigation: { status: isHighRain || soil.status === 'HIGH' ? 'delay' : 'proceed', reason: isHighRain ? `High rain chance (${rainProb}%) expected.` : `Soil moisture is ${soil.status.toLowerCase()}.` },
    spraying: { status: isHighRain || isHighWind ? 'postpone' : 'proceed', reason: isHighRain ? 'Rain expected — spraying will wash off.' : isHighWind ? 'High wind causes chemical drift.' : 'Conditions favorable for spraying.' },
    diseaseRisk: { level: isHighHumidity && isHighRain ? 'elevated' : 'moderate', reason: isHighHumidity ? 'High humidity increases fungal risk.' : 'Normal threat level.' },
    summary: 'Monitor weather before scheduling field operations.',
    confidence: 'MEDIUM'
  }
}

async function getGeminiAgriculturalAdvisory(farmContext: any, weather: any, soil: any) {
  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) return getFallbackAdvisory(weather, soil)
  try {
    const prompt = `You are an expert agricultural agronomy advisor. Return ONLY a raw JSON object (no markdown, no code blocks).

[FARM] Location: ${farmContext.displayName}, Crop: ${farmContext.crop} (${farmContext.cropStage}), Soil: ${farmContext.soilType}
[WEATHER] Temp: ${weather.current.temperature}°C, Humidity: ${weather.current.humidity}%, Rain: ${weather.current.rainProbability}%, Wind: ${weather.current.windSpeed}km/h
[SOIL] Moisture: ${soil.moisture} m³/m³ (${soil.status})

Return JSON: {"irrigation":{"status":"","reason":""},"spraying":{"status":"","reason":""},"diseaseRisk":{"level":"","reason":""},"summary":"","confidence":""}`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.TEXT_MODEL}:generateContent?key=${geminiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    })
    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`)
    const resData = await response.json()
    const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim())
    if (parsed?.irrigation && parsed?.spraying && parsed?.diseaseRisk) return parsed
    throw new Error('Schema mismatch')
  } catch {
    return getFallbackAdvisory(weather, soil)
  }
}

// ── /api/health ───────────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    integrations: {
      gemini: !!process.env.GEMINI_API_KEY,
      earthEngine: !!process.env.EE_KEY_PATH || !!process.env.EE_SERVICE_ACCOUNT_JSON,
      googleWeather: !!process.env.GOOGLE_WEATHER_API_KEY,
      firebaseAdmin: !!process.env.FIREBASE_ADMIN_KEY_BASE64,
      cronSecret: !!process.env.CRON_SECRET,
    }
  })
})

// ── /api/weather ──────────────────────────────────────────────────────────────
app.get('/api/weather', async (req: Request, res: Response) => {
  try {
    const farmId = (req.query.farmId as string) || 'unknown'
    const qLat = req.query.lat ? parseFloat(req.query.lat as string) : null
    const qLng = req.query.lng ? parseFloat(req.query.lng as string) : null

    if (!qLat || !qLng) {
      return res.status(400).json({ error: 'lat and lng query params are required' })
    }

    const lat = qLat
    const lng = qLng
    const crop = (req.query.crop as string) || 'Unknown'
    const cropStage = (req.query.cropStage as string) || 'Unknown'
    const soilType = (req.query.soilType as string) || 'Unknown'
    const displayName = (req.query.displayName as string) || `${lat.toFixed(4)}, ${lng.toFixed(4)}`

    const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}_${crop}`
    const cached = weatherCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return res.json(cached.data)
    }

    const [weatherResult, soilResult] = await Promise.all([
      fetchWeatherData(lat, lng),
      fetchSoilMoisture(lat, lng)
    ])

    const advisory = await getGeminiAgriculturalAdvisory(
      { displayName, crop, cropStage, soilType, lat, lng },
      weatherResult, soilResult
    )

    const payload = {
      farmId,
      updatedAt: weatherResult.updatedAt,
      location: { displayName, lat, lng },
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
        interpretation: process.env.GEMINI_API_KEY ? 'Gemini AI' : 'Agronomic Engine',
        updatedAt: weatherResult.updatedAt
      },
      isDemo: false
    }

    weatherCache.set(cacheKey, { timestamp: Date.now(), data: payload })
    return res.json(payload)
  } catch (err: any) {
    console.error('[/api/weather]', err.message)
    return res.status(500).json({ error: 'Failed to fetch weather data', message: err.message })
  }
})

// ── /api/analyze-crop ─────────────────────────────────────────────────────────
app.post('/api/analyze-crop', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, imageUrl, isSample, farmContext } = req.body
    const result = await analyzeCropWithGeminiModule({ imageBase64, mimeType, imageUrl, isSample: Boolean(isSample), farmContext })
    
    if (!result.success || !result.data) {
      const isRateLimit = result.error?.includes('429') || result.error?.toLowerCase().includes('quota')
      return res.status(isRateLimit ? 429 : 400).json({
        success: false,
        error: { code: isRateLimit ? 'RATE_LIMIT' : 'AI_ERROR', message: result.error || 'Failed to process crop diagnosis.' }
      })
    }
    
    if (!result.data.isPlantImage) {
      return res.status(400).json({
        success: false,
        code: 'NO_PLANT_DETECTED',
        message: 'Please upload a clear image of a plant leaf or crop.'
      })
    }

    return res.json({ success: true, data: result.data })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal error during crop diagnosis.' } })
  }
})

// ── /api/advisor ──────────────────────────────────────────────────────────────
app.post('/api/advisor', async (req: Request, res: Response) => {
  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) return res.status(503).json({ success: false, error: { code: 'CONFIG_MISSING', message: 'AI features unavailable — GEMINI_API_KEY not set.' } })

  try {
    const { question, farmContext } = req.body
    if (!question) return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'question is required' } })

    const prompt = `You are an expert agricultural agronomy advisor. Return ONLY a raw JSON object (no markdown, no code blocks).

[USER QUESTION] ${question}

[FARM CONTEXT]
Crop: ${farmContext?.crop || 'Unknown'}, Stage: ${farmContext?.cropStage || 'Unknown'}, Soil: ${farmContext?.soilType || 'Unknown'}
Location: ${farmContext?.location || 'Unknown'}, Area: ${farmContext?.area || 'Unknown'}
Weather: ${farmContext?.weather || 'None'}, Diagnosis: ${farmContext?.recentDiagnosis || 'None'}
NDVI/Satellite: ${farmContext?.satelliteData || 'None'}, Health: ${farmContext?.healthScore || 'None'}

SAFETY: Never fabricate NDVI, weather, diagnosis data. Say "Data unavailable" if missing.

Return JSON: {"recommendation":"","why":"","currentCondition":"","risks":"","whatToDo":[],"whatToMonitor":[],"whenToAct":"","prosCons":"","dataUsed":[]}`

    const ai = new GoogleGenAI({ apiKey: geminiKey })
    const response = await ai.models.generateContent({ model: AI_CONFIG.TEXT_MODEL, contents: prompt, config: { responseMimeType: 'application/json' } })
    const parsed = JSON.parse(response.text || '{}')
    
    if (parsed?.recommendation && parsed?.whatToDo && parsed?.dataUsed) {
      return res.json({
        success: true,
        answer: parsed.recommendation,
        recommendations: parsed.whatToDo,
        timestamp: new Date().toISOString(),
        structured: parsed
      })
    }
    throw new Error('Schema mismatch')
  } catch (err: any) {
    if (err.status === 429 || err.message?.includes('429')) {
      return res.status(429).json({ success: false, error: { code: 'RATE_LIMIT', message: 'AI service temporarily unavailable. Please try again shortly.' } })
    }
    if (err.status === 503 || err.message?.includes('503')) {
      return res.status(503).json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'The AI model is experiencing high demand. Please try again later.' } })
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } })
  }
})

// ── /api/farms/:farmId/satellite ──────────────────────────────────────────────
app.get('/api/farms/:farmId/satellite', async (req: Request, res: Response) => {
  try {
    const { farmId } = req.params
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined
    let boundary: {lat: number, lng: number}[] | undefined = undefined;
    if (req.query.boundary) {
      try {
        boundary = JSON.parse(req.query.boundary as string);
      } catch (e) {
        console.warn('Invalid boundary json passed to satellite endpoint');
      }
    }
    const data = await getSatelliteDataForFarm(farmId, lat, lng, boundary)
    res.json({ success: true, data })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch satellite data' })
  }
})

// ── /api/notifications/subscribe ───────────────────────────────────────────────
app.post('/api/notifications/subscribe', verifyFirebaseAuth as any, async (req: Request, res: Response) => {
  try {
    const { token } = req.body
    if (!token) return res.status(400).json({ error: 'token is required' })
    const userId = (req as AuthenticatedRequest).user?.uid
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const admin = await import('firebase-admin')
    const db = admin.firestore()
    await db.collection('users').doc(userId).collection('fcmTokens').doc(token).set({
      token,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    return res.json({ success: true })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message })
  }
})

// ── Voice routes ──────────────────────────────────────────────────────────────
app.post('/api/voice/stt', verifyFirebaseAuth as any, async (req: Request, res: Response) => {
  try {
    const { audio, mimeType, languageCode } = req.body
    if (!audio) return res.status(400).json({ success: false, error: 'Audio is required.' })
    const sttResult = await transcribeAudio({ audio, mimeType: mimeType || 'audio/webm', languageCode: languageCode || 'en-IN' })
    if (!sttResult.success) return res.status(400).json({ success: false, error: sttResult.error || 'Failed to transcribe.' })
    return res.json({ success: true, transcript: sttResult.transcript, confidence: sttResult.confidence, languageCode: sttResult.languageCode || 'en-IN' })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Speech recognition error.' })
  }
})

app.post('/api/voice/tts', verifyFirebaseAuth as any, async (req: Request, res: Response) => {
  try {
    const { text, languageCode, speakingRate } = req.body
    if (!text) return res.status(400).json({ success: false, error: 'Text is required.' })
    const ttsResult = await synthesizeTextToSpeech({ text, languageCode: languageCode || 'en-IN', speakingRate: speakingRate || 1.0 })
    if (!ttsResult.success) return res.status(400).json({ success: false, error: ttsResult.error || 'Failed to synthesize.' })
    return res.json({ success: true, audioContent: ttsResult.audioContent, languageCode: ttsResult.languageCode || 'en-IN', format: ttsResult.format || 'mp3' })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'TTS error.' })
  }
})

app.post('/api/voice/assistant', verifyFirebaseAuth as any, async (req: Request, res: Response) => {
  try {
    const { query, activeFarmId, language } = req.body
    const userId = (req as AuthenticatedRequest).user?.uid || 'farmer-001'
    if (!query) return res.status(400).json({ success: false, error: 'Query is required.' })
    const result = await processAssistantRequest(query, { userId, activeFarmId, language: language || 'en-IN' })
    return res.json(result)
  } catch (err: any) {
    return res.status(500).json({ success: false, intent: 'GENERAL_AGRICULTURE_QUESTION', answer: 'An error occurred.', error: err?.message })
  }
})

// ── /api/cron/monitor ─────────────────────────────────────────────────────────
app.post('/api/cron/monitor', async (req: Request, res: Response) => {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers['authorization'] || req.headers['x-cron-secret']
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && authHeader !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const dryRun = req.query.dry_run === 'true' || req.body?.dry_run === true

  try {
    console.log(`[/api/cron/monitor] Starting farm monitor run (dryRun=${dryRun})...`)
    const result = await runFarmMonitor({ dryRun })
    console.log(`[/api/cron/monitor] Completed. farmsProcessed=${result.farmsProcessed} alertsFired=${result.alertsFired} alertsDeduplicated=${result.alertsDeduplicated} errors=${result.errors.length}`)
    return res.json({ success: true, ...result })
  } catch (err: any) {
    console.error('[/api/cron/monitor] Fatal error:', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// Export for Vercel serverless + local Express listen
export default app

// Local dev server
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => {
    console.log(`⚡ CROPOCTOR API Server running on http://localhost:${PORT}`)
    console.log(`   Health: http://localhost:${PORT}/api/health`)
  })
}
