// ─── Service Interfaces & Mock Implementations ────────────────────────────────
// Components call services. Services use mock data now, real APIs later.
// Swap MockXService for GeminiXService / FirebaseXService without touching UI.

import type { AIMessage, AIContext, WeatherData, Farm, DiagnosisResult, AppNotification, FarmInsights } from '@/types'
import { MOCK_WEATHER } from '@/mock/weather'
import { MOCK_DIAGNOSIS } from '@/mock/diagnosis'
import { MOCK_NOTIFICATIONS } from '@/mock/notifications'
import { MOCK_INSIGHTS } from '@/mock/insights'
import { MOCK_FARMS } from '@/mock/farms'
import { getMockAIResponse } from '@/mock/aiResponses'
import { FirebaseNotificationService } from './notificationService'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

// ─── AI Service ───────────────────────────────────────────────────────────────
export interface IAIService {
  getRecommendation(question: string, context: AIContext): Promise<AIMessage>
  followUp(question: string, history: AIMessage[]): Promise<AIMessage>
}

class MockAIService implements IAIService {
  async getRecommendation(question: string, _context: AIContext): Promise<AIMessage> {
    await delay(2000 + Math.random() * 1000) // simulate processing
    return getMockAIResponse(question)
  }
  async followUp(question: string, _history: AIMessage[]): Promise<AIMessage> {
    await delay(1500)
    return getMockAIResponse(question)
  }
}

// ─── Weather Service ──────────────────────────────────────────────────────────
export interface IWeatherService {
  getWeather(farmId: string, farm?: Farm): Promise<WeatherData>
}

class ApiWeatherService implements IWeatherService {
  async getWeather(farmId: string, farm?: Farm): Promise<WeatherData> {
    try {
      let query = `farmId=${encodeURIComponent(farmId || 'farm-001')}`
      if (farm) {
        query += `&lat=${farm.location.lat}&lng=${farm.location.lng}&crop=${encodeURIComponent(farm.primaryCrop)}&cropStage=${encodeURIComponent(farm.cropStage)}&soilType=${encodeURIComponent(farm.soilType)}`
      }
      const res = await fetch(`/api/weather?${query}`)
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      const data = await res.json()

      return {
        farmId: data.farmId || farmId,
        updatedAt: data.updatedAt || new Date().toISOString(),
        location: data.location,
        temperature: data.current.temperature,
        feelsLike: data.current.feelsLike ?? data.current.temperature,
        humidity: data.current.humidity,
        rainChance: data.current.rainProbability,
        windSpeed: data.current.windSpeed,
        windDirection: data.current.windDirection ?? 'SW',
        description: data.current.condition,
        icon: data.current.icon ?? 'partly-cloudy',
        uvIndex: data.current.uvIndex ?? 5,
        isDemo: data.isDemo ?? false,
        forecast: data.forecast || [],
        farmImpact: {
          irrigation: {
            status: data.farmImpact.irrigation.status,
            reason: data.farmImpact.irrigation.reason
          },
          spraying: {
            status: data.farmImpact.spraying.status,
            reason: data.farmImpact.spraying.reason
          },
          diseaseRisk: {
            level: data.farmImpact.diseaseRisk.level,
            reason: data.farmImpact.diseaseRisk.reason
          }
        }
      }
    } catch (err) {
      console.warn('Backend weather API call failed, using cached fallback data:', err)
      return {
        ...MOCK_WEATHER,
        farmId: farmId || 'farm-001',
        updatedAt: new Date().toISOString(),
        location: farm ? { displayName: farm.location.displayName, city: farm.location.village || farm.name, state: farm.location.state || '', country: farm.location.country } : undefined
      }
    }
  }
}

// ─── Farm Service ─────────────────────────────────────────────────────────────
export interface IFarmService {
  getFarms(farmerId: string): Promise<Farm[]>
  getFarm(farmId: string): Promise<Farm | null>
  saveFarm(farm: Partial<Farm>): Promise<Farm>
  deleteFarm(farmId: string): Promise<void>
}

class MockFarmService implements IFarmService {
  async getFarms(_farmerId: string): Promise<Farm[]> {
    await delay(800)
    return MOCK_FARMS
  }
  async getFarm(farmId: string): Promise<Farm | null> {
    await delay(500)
    return MOCK_FARMS.find(f => f.id === farmId) || null
  }
  async saveFarm(farm: Partial<Farm>): Promise<Farm> {
    await delay(1000)
    const saved: Farm = { ...MOCK_FARMS[0], ...farm, id: farm.id || `farm-${Date.now()}`, updatedAt: new Date().toISOString() }
    return saved
  }
  async deleteFarm(_farmId: string): Promise<void> {
    await delay(600)
  }
}

// ─── Diagnosis Service ────────────────────────────────────────────────────────
export interface IDiagnosisService {
  diagnose(imageFile: File | string): Promise<DiagnosisResult>
}

class MockDiagnosisService implements IDiagnosisService {
  async diagnose(_image: File | string): Promise<DiagnosisResult> {
    await delay(3500) // simulate vision processing
    return MOCK_DIAGNOSIS
  }
}

export interface INotificationService {
  getNotifications(): Promise<AppNotification[]>
  subscribeToUserNotifications(
    callback: (notifications: AppNotification[]) => void,
    onError?: (error: Error) => void
  ): () => void
  markRead(id: string): Promise<void>
  markAllRead(): Promise<void>
  createNotification(notification: Omit<AppNotification, 'id' | 'timestamp'>): Promise<void>
  deleteNotification(id: string): Promise<void>
  deleteAllNotifications(): Promise<void>
}

// ─── Insights Service ─────────────────────────────────────────────────────────
export interface IInsightsService {
  getInsights(farmId: string): Promise<FarmInsights>
}

class MockInsightsService implements IInsightsService {
  async getInsights(_farmId: string): Promise<FarmInsights> {
    await delay(1200)
    return MOCK_INSIGHTS
  }
}

// ─── Location Service ─────────────────────────────────────────────────────────
export interface ILocationService {
  getCurrentPosition(): Promise<{ lat: number; lng: number }>
  reverseGeocode(lat: number, lng: number): Promise<string>
  searchPlaces(query: string): Promise<Array<{ name: string; lat: number; lng: number }>>
}

class MockLocationService implements ILocationService {
  async getCurrentPosition(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: 22.3039, lng: 70.8022 }) // fallback to Rajkot
      )
    })
  }
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    await delay(500)
    return `Farm Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`
  }
  async searchPlaces(query: string): Promise<Array<{ name: string; lat: number; lng: number }>> {
    await delay(600)
    // Mock search results
    return [
      { name: `${query}, Gujarat, India`, lat: 22.3039, lng: 70.8022 },
      { name: `${query} Village, Rajkot District`, lat: 22.3500, lng: 70.7500 },
      { name: `Near ${query}, Saurashtra`, lat: 22.2800, lng: 70.8500 },
    ]
  }
}

// ─── Voice Service ────────────────────────────────────────────────────────────
export interface IVoiceService {
  startListening(): Promise<void>
  stopListening(): string
  speak(text: string, lang: string): void
  stopSpeaking(): void
}

class MockVoiceService implements IVoiceService {
  private recognition: any = null
  private transcript = ''

  async startListening(): Promise<void> {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) throw new Error('Speech recognition not supported')
    this.recognition = new SpeechRecognition()
    this.recognition!.continuous = false
    this.recognition!.interimResults = true
    this.recognition!.start()
  }
  stopListening(): string {
    this.recognition?.stop()
    return this.transcript
  }
  speak(text: string, lang: string): void {
    if (!window.speechSynthesis) return
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = lang
    window.speechSynthesis.speak(utter)
  }
  stopSpeaking(): void {
    window.speechSynthesis?.cancel()
  }
}

export { voiceAiService, type VoiceProcessResult } from './voiceAiService'
export { speechToText, type SpeechToTextOptions, type SpeechToTextResult } from './speechToTextService'
export { processAssistantRequest as processGeminiAssistant, type GeminiAssistantOptions, type GeminiAssistantResult } from './geminiAssistantClient'
export { textToSpeech, playAudioContent, stopAudioPlayback, type TextToSpeechOptions, type TextToSpeechResult } from './textToSpeechService'

// ─── Export singletons (swap class to change implementation) ──────────────────



export const aiService: IAIService               = new MockAIService()
export const weatherService: IWeatherService     = new ApiWeatherService()
export const farmService: IFarmService           = new MockFarmService()
export const diagnosisService: IDiagnosisService = new MockDiagnosisService()
export const notificationService: INotificationService = new FirebaseNotificationService()
export const insightsService: IInsightsService   = new MockInsightsService()
export const locationService: ILocationService   = new MockLocationService()
export const voiceService: IVoiceService         = new MockVoiceService()

