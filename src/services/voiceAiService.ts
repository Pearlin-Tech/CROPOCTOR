import type { Farm, WeatherData } from '@/types'

export interface VoiceProcessResult {
  transcript: string
  answer: string
  shortAnswer: string
  audioContent: string | null
  language: string
  farmId: string
}

export class VoiceAiService {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private currentAudioElement: HTMLAudioElement | null = null

  /**
   * Request microphone access and start recording audio
   */
  async startRecording(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone access is not supported in this browser.')
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.audioChunks = []
    
    // Choose optimal mimeType for recording
    let mimeType = 'audio/webm'
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus'
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4'
    } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
      mimeType = 'audio/ogg'
    }

    this.mediaRecorder = new MediaRecorder(stream, { mimeType })

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data)
      }
    }

    this.mediaRecorder.start(100) // capture chunks every 100ms
  }

  /**
   * Stop recording audio and return audio Blob + mimeType
   */
  async stopRecording(): Promise<{ blob: Blob; base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder is not initialized.'))
        return
      }

      const mimeType = this.mediaRecorder.mimeType || 'audio/webm'

      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.audioChunks, { type: mimeType })
          // Release microphone tracks
          this.mediaRecorder?.stream?.getTracks().forEach(track => track.stop())
          this.mediaRecorder = null

          const base64 = await this.blobToBase64(blob)
          resolve({ blob, base64, mimeType })
        } catch (err) {
          reject(err)
        }
      }

      this.mediaRecorder.stop()
    })
  }

  /**
   * Send audio base64 or text query to server with selected farm context and weather data
   */
  async processVoiceQuery(params: {
    base64Audio?: string
    mimeType?: string
    textQuery?: string
    activeFarm: Farm | null
    weather: WeatherData | null
    language?: string
  }): Promise<VoiceProcessResult> {
    const { base64Audio, mimeType, textQuery, activeFarm, weather, language } = params

    const farmContext = activeFarm ? {
      id: activeFarm.id,
      name: activeFarm.name,
      location: activeFarm.location,
      primaryCrop: activeFarm.primaryCrop,
      cropStage: activeFarm.cropStage,
      soilType: activeFarm.soilType,
      area: activeFarm.area
    } : null

    const payload = {
      audio: base64Audio || null,
      mimeType: mimeType || 'audio/webm',
      text: textQuery || null,
      farmContext,
      weather: weather ? {
        temperature: weather.temperature,
        feelsLike: weather.feelsLike,
        humidity: weather.humidity,
        rainChance: weather.rainChance,
        windSpeed: weather.windSpeed,
        description: weather.description,
        farmImpact: weather.farmImpact
      } : null,
      language: language || localStorage.getItem('agri_ai_language') || 'en'
    }

    try {
      const response = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`)
      }

      const data = await response.json()
      return {
        transcript: data.transcript || 'Voice query processed',
        answer: data.answer || 'No recommendation available.',
        shortAnswer: data.shortAnswer || data.answer || '',
        audioContent: data.audioContent || null,
        language: data.language || 'en-US',
        farmId: data.farmId || activeFarm?.id || 'default'
      }
    } catch (err) {
      console.warn('[VoiceAiService] Backend endpoint call failed, using client fallback:', err)
      
      // Safe fallback response when backend is offline or unreachable
      const crop = activeFarm?.primaryCrop || 'crops'
      const farmName = activeFarm?.name || 'your farm'
      const fallbackAnswer = `For ${farmName} (${crop}): Weather currently shows ${weather?.description || 'moderate conditions'} at ${weather?.temperature || 28}°C. ${weather?.farmImpact?.irrigation?.reason || 'Ensure optimal soil moisture and inspect crop health regularly.'}`

      return {
        transcript: textQuery || 'Voice advice request',
        answer: fallbackAnswer,
        shortAnswer: fallbackAnswer,
        audioContent: null,
        language: language || 'en-US',
        farmId: activeFarm?.id || 'default'
      }
    }
  }

  /**
   * Play synthesized speech audio (Google TTS base64 audio or Browser SpeechSynthesis fallback)
   */
  async playResponseAudio(audioContent: string | null, textToSpeak: string, languageCode: string = 'en-US'): Promise<void> {
    this.stopPlayback()

    // 1. Play Google Cloud Text-to-Speech audio if returned
    if (audioContent) {
      try {
        const audioSrc = `data:audio/mp3;base64,${audioContent}`
        this.currentAudioElement = new Audio(audioSrc)
        await this.currentAudioElement.play()
        return
      } catch (err) {
        console.warn('[VoiceAiService] Google TTS audio playback failed, falling back to Web Speech API:', err)
      }
    }

    // 2. Web Speech API SpeechSynthesis Fallback
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(textToSpeak)
      utter.lang = languageCode
      utter.rate = 0.95 // slightly slower for clarity in farming terms
      utter.pitch = 1.0

      // Find matching voice if available
      const voices = window.speechSynthesis.getVoices()
      const matchingVoice = voices.find(v => v.lang.toLowerCase() === languageCode.toLowerCase() || v.lang.startsWith(languageCode.split('-')[0]))
      if (matchingVoice) utter.voice = matchingVoice

      window.speechSynthesis.speak(utter)
    }
  }

  /**
   * Stop any playing audio or speech synthesis
   */
  stopPlayback(): void {
    if (this.currentAudioElement) {
      this.currentAudioElement.pause()
      this.currentAudioElement.currentTime = 0
      this.currentAudioElement = null
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }

  /**
   * Convert Blob to Base64 data string (without header)
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        const base64Data = result.split(',')[1] || result
        resolve(base64Data)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
}

export const voiceAiService = new VoiceAiService()
