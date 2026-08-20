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
  getWeather(farmId: string): Promise<WeatherData>
}

class MockWeatherService implements IWeatherService {
  async getWeather(_farmId: string): Promise<WeatherData> {
    await delay(1000)
    return MOCK_WEATHER
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

// ─── Notification Service ─────────────────────────────────────────────────────
export interface INotificationService {
  getNotifications(): Promise<AppNotification[]>
  markRead(id: string): Promise<void>
}

class MockNotificationService implements INotificationService {
  async getNotifications(): Promise<AppNotification[]> {
    await delay(600)
    return MOCK_NOTIFICATIONS
  }
  async markRead(_id: string): Promise<void> {
    await delay(200)
  }
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

// ─── Export singletons (swap class to change implementation) ──────────────────
export const aiService: IAIService               = new MockAIService()
export const weatherService: IWeatherService     = new MockWeatherService()
export const farmService: IFarmService           = new MockFarmService()
export const diagnosisService: IDiagnosisService = new MockDiagnosisService()
export const notificationService: INotificationService = new MockNotificationService()
export const insightsService: IInsightsService   = new MockInsightsService()
export const locationService: ILocationService   = new MockLocationService()
export const voiceService: IVoiceService         = new MockVoiceService()
