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

async function getGeminiAgriculturalAdvisory(farmContext: any, weather: any, soil: any, language?: string) {
  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) return getFallbackAdvisory(weather, soil)
  try {
    const prompt = `You are an expert agricultural agronomy advisor. Analyze this farm's real-time data and provide operational decisions. Return ONLY a raw JSON object (no markdown, no code blocks).

FARM DETAILS:
- Location: ${farmContext.displayName}
- Crop: ${farmContext.crop} (Stage: ${farmContext.cropStage})
- Soil Type: ${farmContext.soilType}

REAL-TIME WEATHER (Open-Meteo):
- Temperature: ${weather.current.temperature}°C (Feels like: ${weather.current.feelsLike || weather.current.temperature}°C)
- Humidity: ${weather.current.humidity}%
- Rain Probability: ${weather.current.rainProbability}%
- Wind Speed: ${weather.current.windSpeed} km/h
- Condition: ${weather.current.condition}

SOIL DATA:
- Soil Moisture: ${soil.moisture} m³/m³ (Status: ${soil.status})

Based on this data, determine: should the farmer irrigate, spray pesticides, and what is the fungal disease risk level?

Return ONLY this JSON (status must be one of: "delay", "proceed", "postpone", "monitor"):
{"irrigation":{"status":"","reason":""},"spraying":{"status":"","reason":""},"diseaseRisk":{"level":"","reason":""},"summary":"","confidence":""}`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.TEXT_MODEL}:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 1024 }
      })
    })
    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`)
    const resData = await response.json()
    const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const parsed = JSON.parse(rawText.replace(/```json/gi, '').replace(/```/g, '').trim())
    if (parsed?.irrigation && parsed?.spraying && parsed?.diseaseRisk) return parsed
    throw new Error('Schema mismatch')
  } catch (err) {
    console.warn('[Weather Advisory] Gemini fallback triggered:', (err as any).message)
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
    const { imageBase64, mimeType, imageUrl, isSample, farmContext, language } = req.body
    const result = await analyzeCropWithGeminiModule({ imageBase64, mimeType, imageUrl, isSample: Boolean(isSample), farmContext, language: language || 'en' })
    
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

/**
 * Calls Gemini with model cascade fallback.
 * Tries: gemini-3.5-flash-lite → gemini-3.1-flash-lite → gemini-3.6-flash → gemini-3.7-flash
 * Returns the first successful response, or a failed-response object.
 */
async function callGeminiAdvisorCascade(body: any, geminiKey: string, timeoutMs: number): Promise<any> {
  const models = AI_CONFIG.MODEL_CASCADE

  for (const modelName of models) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    console.log(`[Advisor] Trying model: ${modelName}`)

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId))

      if (res.ok) {
        const data = await res.json()
        return { ok: true, status: res.status, data }
      }

      const errText = await res.text()
      console.warn(`[Advisor] Model ${modelName} failed HTTP ${res.status}`)
      if (res.status === 503 || res.status === 429) {
        await new Promise(r => setTimeout(r, 1500))
        continue // Try next model
      }
      if (res.status === 404) continue // Model not found, skip
      return { ok: false, status: res.status, _errText: errText }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn(`[Advisor] Model ${modelName} timed out`)
      } else {
        console.warn(`[Advisor] Model ${modelName} error:`, err.message)
      }
      continue // Try next model
    }
  }

  return { ok: false, status: 503, _errText: 'All models failed' }
}

/**
 * Builds a smart agronomic fallback when Gemini is unavailable.
 * Uses rule-based logic to generate useful farm-specific advice.
 */
function buildAdvisorFallback(question: string, farmContext: any): any {
  const crop = farmContext?.crop || 'your crop'
  const stage = farmContext?.cropStage || 'current'
  const soil = farmContext?.soilType || 'your soil'
  const location = farmContext?.location || 'your area'
  const q = question.toLowerCase()

  // Determine question type
  const isIrrigation = q.includes('irrigat') || q.includes('water') || q.includes('पिया') || q.includes('piyo')
  const isPest = q.includes('pest') || q.includes('insect') || q.includes('bug') || q.includes('spray')
  const isFertilizer = q.includes('fertiliz') || q.includes('nutrient') || q.includes('manure') || q.includes('urea')
  const isDisease = q.includes('diseas') || q.includes('blight') || q.includes('spot') || q.includes('yellow') || q.includes('पाती')
  const isHarvest = q.includes('harvest') || q.includes('pick') || q.includes('ready')

  let recommendation, why, whatToDo: string[], whatToMonitor: string[]

  if (isIrrigation) {
    recommendation = `For ${crop} at ${stage} stage in ${soil} soil, check your topsoil moisture (0-10cm depth) by pressing your thumb into the soil. If soil sticks together and stays clumped, soil moisture is adequate. If it crumbles immediately, irrigation is needed. During the ${stage} stage, ${crop} has moderate-to-high water demand.`
    why = `The ${stage} stage is a critical growth period for ${crop}. Water stress during this phase can directly reduce yield by 20-40%. ${soil} soil has specific water-holding capacity that determines irrigation frequency.`
    whatToDo = [
      'Check soil moisture at 0-10cm and 10-20cm depths using the thumb test or a moisture meter',
      `If soil is dry below 10cm, apply ${soil.toLowerCase().includes('sandy') ? '25-30mm' : '35-40mm'} of water per irrigation`,
      'Irrigate in the early morning (5AM-8AM) or late evening (5PM-7PM) to reduce evaporation losses',
      'For flood irrigation, let water reach all field ends before stopping; for drip, run for 2-4 hours'
    ]
    whatToMonitor = [
      'Leaf wilting in the afternoon (mild wilting is normal; persistent morning wilting indicates water stress)',
      'Soil color at 10cm depth — dark brown = moist, light brown/grey = dry',
      `Groundnut: watch for flower/peg development — water stress during pegging stage is very harmful`
    ]
  } else if (isDisease) {
    recommendation = `For disease management in ${crop} at ${stage} stage in ${location}, first confirm the disease visually by examining leaf symptoms closely. Take clear photos and use the Crop Doctor feature for AI diagnosis. Preventive fungicide application every 10-14 days is recommended during humid conditions.`
    why = `During the ${stage} stage, ${crop} canopy is dense which creates humid microclimate conditions favorable for fungal diseases. Early intervention when less than 10% of leaves are affected is far more effective and economical than treating advanced infections.`
    whatToDo = [
      'Examine 10-15 plants from different parts of the field to estimate disease spread percentage',
      'Use the Crop Doctor feature (camera icon) to photograph affected leaves for AI diagnosis',
      'If fungal spots are confirmed: spray Mancozeb 75% WP at 2.5g/litre or Copper Oxychloride 50% WP at 3g/litre',
      'Remove and destroy severely infected leaves to reduce disease inoculum in the field'
    ]
    whatToMonitor = [
      'Disease progression rate — check every 3-5 days to see if new lesions are appearing',
      'Percentage of leaves affected — above 20% indicates urgent intervention needed',
      'Weather conditions: high humidity (>75%) and moderate temperatures (20-30°C) accelerate most fungal diseases'
    ]
  } else if (isFertilizer) {
    recommendation = `For ${crop} at ${stage} stage, fertilizer application timing and type depends on the specific nutrient need. Yellowing leaves typically indicate nitrogen deficiency; purple/reddish tints suggest phosphorus deficiency; brown leaf edges point to potassium deficiency. Soil testing is the most accurate method to determine exact needs.`
    why = `Fertilizer applied at the wrong growth stage can cause more harm than good — excess nitrogen during flowering can cause vegetative growth at the expense of yield. The ${stage} stage of ${crop} has specific nutrient priorities.`
    whatToDo = [
      'Visually diagnose nutrient deficiency: check symptom location (older vs younger leaves) and pattern (interveinal vs marginal)',
      'For nitrogen deficiency (yellowing old leaves): apply urea at 20-25 kg/acre dissolved in irrigation water',
      'For immediate correction: foliar spray of 1% urea solution (10g/litre) on leaf surfaces in the evening',
      'Get a soil test done for accurate nutrient status — contact your local Krishi Vigyan Kendra (KVK)'
    ]
    whatToMonitor = [
      'New leaf color after 7-10 days of treatment — should show recovery toward healthy green color',
      'Crop growth rate and canopy density compared to unaffected sections of the field',
      'Soil pH — many nutrient deficiencies are secondary to pH being outside the optimal 6.0-7.0 range'
    ]
  } else {
    recommendation = `As an expert agronomy advisor for your ${crop} farm at ${stage} stage in ${location}: the current period is critical for yield formation. Focus on preventive disease scouting, ensuring adequate soil moisture, and monitoring for any stress symptoms that could indicate nutritional or pest issues.`
    why = `The ${stage} stage of ${crop} growth is when management decisions have the highest impact on final yield. Proper agronomic practices during this phase can determine 30-50% of the final crop output.`
    whatToDo = [
      'Scout your field at least twice a week — walk an X or W pattern through the field to check 20-30 plants',
      'Check soil moisture every 2-3 days and irrigate based on crop need, not a fixed schedule',
      'Look for early signs of pest damage: leaf holes, sticky residue, insect presence on undersides of leaves',
      'Maintain field records of any symptoms, treatments applied, and their effectiveness'
    ]
    whatToMonitor = [
      'Leaf color, size, and surface — any change from the normal healthy green is a symptom',
      'Plant height and uniformity across the field — patchy growth indicates nutrient or soil variation',
      'Weather forecast for the next 7-10 days — plan irrigation and spray schedules accordingly'
    ]
  }

  return {
    recommendation,
    why,
    currentCondition: `Your ${crop} is currently at the ${stage} stage on ${soil} soil in ${location}. Based on the available information, the crop appears to be in active growth phase. Weather data was not available for this response.`,
    risks: `During the ${stage} stage, main risks include: fungal diseases in humid conditions, water stress affecting yield, and pest pressure. Monitor closely and act early if symptoms appear.`,
    whatToDo,
    whatToMonitor,
    whenToAct: 'Act within the next 24-48 hours for any urgent symptoms. For preventive measures, begin monitoring and applications this week.',
    prosCons: 'This is an agronomically-derived response based on crop science best practices. For the most precise recommendation tailored to your exact current conditions, please try the AI Advisor again when the service is fully available.',
    dataUsed: [`Crop: ${crop}`, `Growth stage: ${stage}`, `Soil type: ${soil}`, `Location: ${location}`, 'Rule-based agronomy engine (AI service temporarily unavailable)']
  }
}

app.post('/api/advisor', async (req: Request, res: Response) => {
  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) {
    return res.status(503).json({ success: false, error: { code: 'CONFIG_MISSING', message: 'AI features unavailable — GEMINI_API_KEY not set.' } })
  }

  try {
    const { question, farmContext, language } = req.body
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'question is required' } })
    }

    const langCode = language || 'en'
    const { getLanguageName } = await import('../server/config/aiConfig')
    const langName = getLanguageName(langCode)
    const langInstruction = (langCode !== 'en' && langCode !== 'en-IN')
      ? `\n\nIMPORTANT LANGUAGE INSTRUCTION: You MUST write ALL text values in the JSON response in ${langName} (language code: ${langCode}). Translate all recommendations, explanations, and action items into ${langName}. Keep JSON keys in English.`
      : ''

    const hasWeather = farmContext?.weather && farmContext.weather !== 'None'
    const hasDiagnosis = farmContext?.recentDiagnosis && farmContext.recentDiagnosis !== 'None'
    const hasSatellite = farmContext?.satelliteData && farmContext.satelliteData !== 'None'

    const prompt = `You are an expert agricultural agronomy advisor with deep knowledge in crop science, soil management, integrated pest management, weather impacts on farming, and precision agriculture. You are advising a farmer in ${farmContext?.location || 'South Asia'}.

FARMER'S QUESTION: "${question}"

FARM CONTEXT:
- Crop: ${farmContext?.crop || 'Unknown'}
- Crop Stage: ${farmContext?.cropStage || 'Unknown'}
- Soil Type: ${farmContext?.soilType || 'Unknown'}
- Farm Location: ${farmContext?.location || 'Unknown'}
- Farm Area: ${farmContext?.area || 'Unknown'}
- Current Weather: ${hasWeather ? farmContext.weather : 'Data unavailable — do not assume weather conditions'}
- Recent Disease Diagnosis: ${hasDiagnosis ? farmContext.recentDiagnosis : 'None on record'}
- Satellite/NDVI Data: ${hasSatellite ? farmContext.satelliteData : 'Data unavailable — do not fabricate NDVI values'}
- Crop Health Score: ${farmContext?.healthScore || 'Not available'}

INSTRUCTIONS FOR HIGH-QUALITY RESPONSE:
1. Answer the farmer's specific question directly and comprehensively.
2. Provide SPECIFIC, ACTIONABLE advice — not generic tips.
3. Reference the actual farm data provided (crop type, stage, soil, weather) in your reasoning.
4. For chemical recommendations, include product categories/active ingredients when relevant.
5. Include the WHY behind every recommendation — explain the agronomic reasoning.
6. If data is missing (weather, NDVI), clearly state that and give conditional advice.
7. Tailor advice to the specific crop stage — what matters at seedling stage differs from flowering.
8. NEVER fabricate weather data, NDVI values, or diagnosis results not provided in the context.
9. Return ONLY a raw JSON object — no markdown, no code blocks.${langInstruction}

Return this EXACT JSON schema with ALL fields populated with rich, detailed content:
{
  "recommendation": "<Primary answer to the farmer's question — 2-3 detailed sentences with specific agronomic reasoning>",
  "why": "<Comprehensive explanation of WHY this recommendation is appropriate for this specific crop, stage, soil, and conditions — 3-4 sentences>",
  "currentCondition": "<Assessment of the current farm/crop condition based on available data — be specific about what data you used>",
  "risks": "<Specific risks the farmer should be aware of right now given their crop stage, weather, and recent diagnosis>",
  "whatToDo": [
    "<Immediate action 1 — specific, with timing and method>",
    "<Immediate action 2>",
    "<Immediate action 3>",
    "<Action 4 if applicable>"
  ],
  "whatToMonitor": [
    "<Monitoring item 1 — what to look for, how often>",
    "<Monitoring item 2>",
    "<Monitoring item 3>"
  ],
  "whenToAct": "<Specific timing guidance — e.g., 'Apply within the next 2-3 days before rain, preferably early morning when temperatures are below 30°C'>",
  "prosCons": "<Balanced assessment of the recommended approach — benefits vs potential downsides or considerations>",
  "dataUsed": ["<List each data point from farm context that influenced this recommendation>"]
}`

    const advisorBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: AI_CONFIG.ADVISOR_TEMPERATURE,
        maxOutputTokens: AI_CONFIG.MAX_OUTPUT_TOKENS,
        responseMimeType: 'application/json'
      }
    }

    const geminiRes = await callGeminiAdvisorCascade(advisorBody, geminiKey, AI_CONFIG.TIMEOUT_MS)

    // All cascade models failed
    if (!geminiRes.ok) {
      console.warn(`[/api/advisor] All models failed — returning error`)
      return res.status(503).json({
        success: false,
        error: {
          code: 'AI_ERROR',
          message: 'AI service is temporarily unavailable due to high demand. Please try again in a few minutes.'
        }
      })
    }

    const resData = geminiRes.data
    const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || ''


    if (!rawText) {
      console.warn('[/api/advisor] Empty Gemini response — returning error')
      return res.status(503).json({
        success: false,
        error: {
          code: 'AI_ERROR',
          message: 'AI service returned an empty response. Please try again.'
        }
      })
    }

    const cleanText = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
    let parsed: any

    try {
      parsed = JSON.parse(cleanText)
    } catch (parseErr) {
      console.error('[/api/advisor] JSON parse failed, raw text:', rawText.substring(0, 500))
      const fallback = buildAdvisorFallback(question, farmContext)
      return res.json({ success: true, answer: fallback.recommendation, recommendations: fallback.whatToDo, timestamp: new Date().toISOString(), structured: fallback, isFallback: true })
    }

    if (!parsed?.recommendation) {
      const fallback = buildAdvisorFallback(question, farmContext)
      return res.json({ success: true, answer: fallback.recommendation, recommendations: fallback.whatToDo, timestamp: new Date().toISOString(), structured: fallback, isFallback: true })
    }

    return res.json({
      success: true,
      answer: parsed.recommendation,
      recommendations: parsed.whatToDo || [],
      timestamp: new Date().toISOString(),
      structured: parsed,
      model: AI_CONFIG.TEXT_MODEL
    })

  } catch (err: any) {
    if (err.name === 'AbortError') {
      const fallback = buildAdvisorFallback(req.body?.question || '', req.body?.farmContext)
      return res.json({ success: true, answer: fallback.recommendation, recommendations: fallback.whatToDo, timestamp: new Date().toISOString(), structured: fallback, isFallback: true })
    }
    console.error('[/api/advisor] Unexpected error:', err.message)
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
