// ─── Farmer ───────────────────────────────────────────────────────────────────
export interface Farmer {
  id: string
  name: string
  email?: string
  phone?: string
  avatarUrl?: string
  experience: 'beginner' | 'intermediate' | 'expert'
  preferredLanguage: string
  country: string
  createdAt: string
}

// ─── Farm ─────────────────────────────────────────────────────────────────────
export interface Farm {
  id: string
  farmerId: string
  name: string
  location: FarmLocation
  area: number // in acres
  areaUnit: 'acres' | 'hectares'
  primaryCrop: string
  soilType: string
  cropStage: string
  plantingDate?: string
  healthScore: number // 0–100
  boundary?: LatLng[]
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export interface FarmLocation {
  lat: number
  lng: number
  address: string
  village?: string
  district?: string
  state?: string
  country: string
  displayName: string
}

export interface LatLng {
  lat: number
  lng: number
}

// ─── Weather ──────────────────────────────────────────────────────────────────
export interface WeatherData {
  temperature: number
  feelsLike: number
  humidity: number
  rainChance: number
  windSpeed: number
  windDirection: string
  description: string
  icon: string
  uvIndex: number
  forecast: WeatherDay[]
  farmImpact: FarmImpact
  isDemo: boolean
}

export interface WeatherDay {
  date: string
  dayLabel: string
  high: number
  low: number
  icon: string
  rainChance: number
  description: string
}

export interface FarmImpact {
  irrigation: { status: 'delay' | 'proceed' | 'monitor'; reason: string }
  spraying:   { status: 'postpone' | 'proceed' | 'caution'; reason: string }
  diseaseRisk: { level: 'low' | 'moderate' | 'elevated' | 'high'; reason: string }
}

// ─── AI ───────────────────────────────────────────────────────────────────────
export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  structured?: AIStructuredResponse
}

export interface AIStructuredResponse {
  recommendation: string
  why: string
  whatToDo: string[]
  dataUsed: string[]
}

export interface AIContext {
  farmId?: string
  crop?: string
  soilType?: string
  cropStage?: string
  location?: string
  weather?: string
}

// ─── Diagnosis ────────────────────────────────────────────────────────────────
export interface DiagnosisResult {
  id: string
  imageUrl: string
  crop: string
  disease: string
  confidence: number // 0–100
  symptoms: string[]
  actions: string[]
  severity: 'mild' | 'moderate' | 'severe'
  isDemo: boolean
  timestamp: string
}

// ─── Notifications ────────────────────────────────────────────────────────────
export type NotificationType = 'weather' | 'crop-health' | 'disease' | 'irrigation' | 'ai-advice' | 'reminder'
export type NotificationPriority = 'low' | 'medium' | 'high'

export interface AppNotification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  body: string
  timestamp: string
  read: boolean
  actionLabel?: string
  actionRoute?: string
}

// ─── Insights ─────────────────────────────────────────────────────────────────
export interface FarmInsights {
  cropHealth: { score: number; trend: 'up' | 'down' | 'stable'; factors: string[] }
  soilHealth: { score: number; moisture: 'dry' | 'optimal' | 'wet'; nutrients: string }
  ndvi: { value: number; label: string; isDemo: boolean }
  satelliteImageUrl?: string
  isDemo: boolean
}

// ─── Country ──────────────────────────────────────────────────────────────────
export interface CountryConfig {
  code: string
  name: string
  flag: string
  languages: string[]
  defaultLanguage: string
  units: { area: 'acres' | 'hectares'; temperature: 'celsius' | 'fahrenheit' }
  currency: string
  timezone: string
}

// ─── Crop / Soil ──────────────────────────────────────────────────────────────
export interface CropOption {
  id: string
  name: string
  category: string
  seasons?: string[]
}

export interface SoilOption {
  id: string
  name: string
  description: string
}

// ─── Farm History ─────────────────────────────────────────────────────────────
export type HistoryEventType = 'ai-advice' | 'diagnosis' | 'weather-alert' | 'crop-update' | 'farm-action'

export interface HistoryEvent {
  id: string
  farmId: string
  type: HistoryEventType
  title: string
  summary: string
  timestamp: string
  detail?: string
}
