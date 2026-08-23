import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, X, RotateCcw, Volume2, VolumeX, Send, MapPin, Sparkles, AlertCircle, ArrowRight, Loader2 } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { useFarm } from '@/store/FarmContext'
import { useApp } from '@/store/AppContext'
import { 
  speechToText, 
  processGeminiAssistant, 
  textToSpeech, 
  playAudioContent, 
  stopAudioPlayback,
  voiceAiService, 
  type GeminiAssistantResult 
} from '@/services'

// Voice State Machine
export type VoiceState = 'IDLE' | 'LISTENING' | 'TRANSCRIBING' | 'THINKING' | 'SPEAKING' | 'ERROR'

const VoicePage: React.FC = () => {
  const navigate = useNavigate()
  const { activeFarm } = useFarm()
  const { language, toast } = useApp()

  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE')
  const [transcript, setTranscript] = useState<string>('')
  const [result, setResult] = useState<GeminiAssistantResult | null>(null)
  const [textInput, setTextInput] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Clean up audio playback when leaving page
  useEffect(() => {
    return () => {
      stopAudioPlayback()
      voiceAiService.stopPlayback()
    }
  }, [])

  // Start Voice Recording (IDLE -> LISTENING)
  const handleStartListening = async () => {
    try {
      setErrorMsg(null)
      stopAudioPlayback()
      voiceAiService.stopPlayback()
      setResult(null)
      setTranscript('')

      await voiceAiService.startRecording()
      setVoiceState('LISTENING')
    } catch (err: any) {
      console.error('[VoicePage] Microphone start error:', err)
      const msg = err.message || 'Microphone access denied. Please allow microphone permission in your browser.'
      setErrorMsg(msg)
      setVoiceState('ERROR')
      toast.error(msg)
    }
  }

  // Stop Recording & Execute Pipeline (LISTENING -> TRANSCRIBING -> THINKING -> SPEAKING -> IDLE)
  const handleStopListening = async () => {
    if (voiceState !== 'LISTENING') return

    // 1. Transition to TRANSCRIBING
    setVoiceState('TRANSCRIBING')

    try {
      const { blob, base64, mimeType } = await voiceAiService.stopRecording()

      if (!blob || blob.size === 0 || !base64) {
        setErrorMsg('No speech audio detected in recording. Please try speaking again.')
        setVoiceState('ERROR')
        return
      }

      // 2. Call backend Google Cloud Speech-to-Text service
      const sttResult = await speechToText({
        audio: base64,
        mimeType,
        language
      })

      if (!sttResult.success || !sttResult.transcript) {
        setErrorMsg(sttResult.error || 'Could not recognize speech from audio. Please speak clearly and try again.')
        setVoiceState('ERROR')
        return
      }

      const recognizedText = sttResult.transcript
      setTranscript(recognizedText)

      // 3. Execute Shared Assistant Pipeline with recognized transcript
      await runSharedAssistantPipeline(recognizedText)
    } catch (err: any) {
      console.error('[VoicePage] Pipeline error:', err)
      setErrorMsg('Failed to process voice request. Please try again.')
      setVoiceState('ERROR')
    }
  }

  // Shared Assistant Pipeline for both voice transcript and typed text
  const runSharedAssistantPipeline = async (queryText: string) => {
    // 1. Transition to THINKING
    setVoiceState('THINKING')

    try {
      // 2. Call shared backend Gemini assistant process function with currently selected farm
      const assistantRes = await processGeminiAssistant({
        query: queryText,
        activeFarmId: activeFarm?.id,
        language
      })

      if (!assistantRes.success && !assistantRes.answer) {
        setErrorMsg(assistantRes.error || 'Unable to generate recommendation for your query.')
        setVoiceState('ERROR')
        return
      }

      setResult(assistantRes)

      // 3. Transition to SPEAKING & Synthesize Text-to-Speech
      setVoiceState('SPEAKING')

      const ttsRes = await textToSpeech(assistantRes.answer, language)
      
      if (ttsRes.success && ttsRes.audioContent) {
        await playAudioContent(ttsRes.audioContent)
      } else {
        // Fallback speech playback if Google TTS key is unconfigured
        voiceAiService.playResponseAudio(null, assistantRes.answer, language)
      }

      setVoiceState('IDLE')
    } catch (err: any) {
      console.error('[VoicePage] Assistant pipeline error:', err)
      setErrorMsg('Error receiving assistant response. Please try again.')
      setVoiceState('ERROR')
    }
  }

  // Handle Typed Text Query Submit
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInput.trim() || voiceState === 'LISTENING' || voiceState === 'TRANSCRIBING' || voiceState === 'THINKING') return

    const query = textInput.trim()
    setTextInput('')
    setErrorMsg(null)
    setTranscript(query)
    stopAudioPlayback()

    await runSharedAssistantPipeline(query)
  }

  // Replay Response Audio
  const handleReplayAudio = async () => {
    if (!result?.answer) return
    setVoiceState('SPEAKING')
    const ttsRes = await textToSpeech(result.answer, language)
    if (ttsRes.success && ttsRes.audioContent) {
      await playAudioContent(ttsRes.audioContent)
    } else {
      voiceAiService.playResponseAudio(null, result.answer, language)
    }
    setVoiceState('IDLE')
  }

  // Stop Audio Playback
  const handleStopAudio = () => {
    stopAudioPlayback()
    voiceAiService.stopPlayback()
    setVoiceState('IDLE')
  }

  // Reset Voice Assistant to IDLE state
  const handleReset = () => {
    stopAudioPlayback()
    voiceAiService.stopPlayback()
    setVoiceState('IDLE')
    setTranscript('')
    setResult(null)
    setErrorMsg(null)
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="min-h-screen bg-gradient-to-b from-green-forest via-[#1e3e2b] to-green-deep flex flex-col items-center justify-between px-4 py-6 relative overflow-hidden text-white"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-green-pastel/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-brown-earth/20 rounded-full blur-[140px] pointer-events-none" />

      {/* Header Bar */}
      <div className="w-full max-w-lg flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-1">
            <Sparkles className="w-5 h-5 text-green-pastel" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide uppercase text-green-pastel">Cropoctor Voice AI</h2>
            <p className="text-[11px] text-white/70 font-medium">Google Cloud Speech & Gemini AI</p>
          </div>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/10"
          aria-label="Close voice assistant"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Active Selected Farm Context Badge (Multi-Farm) */}
      <div className="w-full max-w-lg mt-4 z-10">
        <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-green-pastel/20 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-green-pastel" />
            </div>
            <div className="truncate">
              <p className="text-[10px] text-green-pastel font-semibold uppercase tracking-wider">Active Selected Farm</p>
              <p className="text-xs font-bold text-white truncate">
                {activeFarm ? activeFarm.name : 'No Farm Selected'}
                {activeFarm?.primaryCrop && <span className="text-white/80 font-normal"> ({activeFarm.primaryCrop})</span>}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/farms')}
            className="text-[11px] font-semibold text-green-pastel hover:underline shrink-0 bg-white/10 px-2.5 py-1 rounded-full border border-white/10"
          >
            Switch Farm
          </button>
        </div>
      </div>

      {/* Center Dynamic Content Area */}
      <div className="w-full max-w-lg flex-1 flex flex-col items-center justify-center my-6 z-10">
        {/* State: TRANSCRIBING */}
        {voiceState === 'TRANSCRIBING' && (
          <div className="flex flex-col items-center justify-center text-center py-10">
            <Loader2 className="w-12 h-12 text-green-pastel animate-spin mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">Transcribing Audio</h3>
            <p className="text-xs text-white/70 max-w-xs">
              Sending audio to Google Cloud Speech-to-Text service…
            </p>
          </div>
        )}

        {/* State: THINKING */}
        {voiceState === 'THINKING' && (
          <div className="flex flex-col items-center justify-center text-center py-10">
            <div className="relative mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="w-28 h-28 rounded-full border-4 border-green-pastel/20 border-t-green-pastel"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-9 h-9 text-green-pastel animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Analyzing with Gemini AI</h3>
            <p className="text-xs text-white/70 max-w-xs">
              Evaluating crop intent, soil, and weather for {activeFarm?.name || 'your farm'}…
            </p>
          </div>
        )}

        {/* State: SPEAKING or IDLE with Result Available */}
        {(voiceState === 'SPEAKING' || voiceState === 'IDLE') && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[60vh] overflow-y-auto"
          >
            {/* Transcript Display */}
            {transcript && (
              <div className="bg-black/20 rounded-2xl p-3.5 border border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-green-pastel font-bold mb-1">Voice Transcript</p>
                <p className="text-sm italic text-white/95">"{transcript}"</p>
              </div>
            )}

            {/* AI Response Display */}
            <div className="bg-white/15 rounded-2xl p-4 border border-white/20 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-green-pastel font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-green-pastel" /> Gemini AI Agronomic Advisory
                </span>
                
                {voiceState === 'SPEAKING' ? (
                  <button
                    onClick={handleStopAudio}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/30 text-red-200 text-[11px] font-medium border border-red-400/30 animate-pulse"
                  >
                    <VolumeX className="w-3.5 h-3.5" /> Stop Speaking
                  </button>
                ) : (
                  <button
                    onClick={handleReplayAudio}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-pastel/20 text-green-pastel text-[11px] font-medium border border-green-pastel/30 hover:bg-green-pastel/30"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Speak Answer
                  </button>
                )}
              </div>
              
              <p className="text-sm font-medium leading-relaxed text-white text-justify">
                {result.answer}
              </p>
            </div>

            {/* Controls */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleReset}
                className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold text-white border border-white/15 flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4 text-green-pastel" /> Ask Another
              </button>
              <button
                onClick={() => navigate('/advisor')}
                className="flex-1 py-3 px-4 bg-green-forest hover:bg-green-deep rounded-2xl text-xs font-bold text-white border border-green-pastel/30 flex items-center justify-center gap-2 transition-all shadow-md"
              >
                Open in Advisor <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* State: LISTENING or IDLE (No Result) */}
        {(voiceState === 'IDLE' || voiceState === 'LISTENING') && !result && (
          <div className="flex flex-col items-center justify-center text-center">
            {/* Microphone Button */}
            <div className="relative mb-8">
              <motion.button
                onClick={voiceState === 'LISTENING' ? handleStopListening : handleStartListening}
                whileTap={{ scale: 0.95 }}
                className={`relative z-10 w-36 h-36 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none shadow-[0_12px_40px_rgba(0,0,0,0.35)] border-2 ${
                  voiceState === 'LISTENING'
                    ? 'bg-red-500/30 border-red-400 text-red-300 animate-pulse'
                    : 'bg-white/15 hover:bg-white/20 border-white/30 text-white backdrop-blur-md'
                }`}
                aria-label={voiceState === 'LISTENING' ? 'Stop recording and process voice' : 'Start microphone recording'}
              >
                {voiceState === 'LISTENING' && (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 rounded-full border-2 border-green-pastel/60"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.3, ease: 'easeInOut' }}
                      className="absolute inset-0 rounded-full border-2 border-green-pastel/30"
                    />
                  </>
                )}
                <Mic className={`w-14 h-14 ${voiceState === 'LISTENING' ? 'text-red-400' : 'text-green-pastel'}`} />
              </motion.button>
            </div>

            {/* Waveform Visualizer during LISTENING */}
            {voiceState === 'LISTENING' && (
              <div className="flex items-end gap-1.5 h-12 mb-6">
                {Array.from({ length: 16 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 bg-green-pastel rounded-full"
                    animate={{ height: [6, Math.random() * 40 + 8, 6] }}
                    transition={{ duration: 0.4 + Math.random() * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.04 }}
                  />
                ))}
              </div>
            )}

            {/* Instruction */}
            <p className="text-base font-medium text-white mb-2">
              {voiceState === 'LISTENING' ? 'Listening… Tap microphone to stop' : 'Tap microphone to speak'}
            </p>
            <p className="text-xs text-white/60 max-w-xs">
              Ask in English (en-IN), Hindi (hi-IN), or Gujarati (gu-IN)
            </p>
          </div>
        )}

        {/* State: ERROR */}
        {voiceState === 'ERROR' && (
          <div className="w-full bg-red-500/20 border border-red-400/30 rounded-3xl p-5 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/30 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-300" />
            </div>
            <h3 className="text-sm font-bold text-red-200">Voice Assistant Error</h3>
            <p className="text-xs text-red-100/90">{errorMsg || 'An error occurred during voice processing.'}</p>
            <button
              onClick={handleReset}
              className="mt-2 py-2.5 px-5 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold text-white border border-white/20 flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-green-pastel" /> Retry Recording
            </button>
          </div>
        )}
      </div>

      {/* Fallback Keyboard Text Input Bar */}
      <div className="w-full max-w-lg z-10 pt-2">
        <form onSubmit={handleTextSubmit} className="relative flex items-center">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={voiceState === 'LISTENING' || voiceState === 'TRANSCRIBING' || voiceState === 'THINKING'}
            placeholder={`Type question for ${activeFarm?.name || 'farm'}…`}
            className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-full pl-4 pr-12 py-3 text-xs text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-pastel/50 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || voiceState === 'LISTENING' || voiceState === 'TRANSCRIBING' || voiceState === 'THINKING'}
            className="absolute right-1.5 w-9 h-9 bg-green-pastel text-green-forest rounded-full flex items-center justify-center disabled:opacity-40 transition-all hover:scale-105"
            aria-label="Send typed question"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </motion.div>
  )
}

export default VoicePage
