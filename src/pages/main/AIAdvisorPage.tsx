import React, { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Image, Send, ChevronRight } from 'lucide-react'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/index'
import { AIResponseSkeleton as AISkel } from '@/components/skeletons'
import { useFarm } from '@/store/FarmContext'
import { aiService, weatherService } from '@/services'
import { cropDoctorService } from '@/services/cropDoctorService'
import { satelliteService } from '@/services/satelliteService'
import type { AIMessage, DiagnosisResult } from '@/types'
import { useApp } from '@/store/AppContext'
import { useTranslation } from 'react-i18next'
import { formatLocalizedNumber, formatLocalizedPercent } from '@/utils/format'
import { calculateFarmHealthScore } from '@/services/healthService'
import { advisorService } from '@/services/advisorService'
import { useUser } from '@/store/UserContext'
import { Plus } from 'lucide-react'

const QUESTION_KEYS = [
  'advisor.questions.q1',
  'advisor.questions.q2',
  'advisor.questions.q3',
  'advisor.questions.q4',
  'advisor.questions.q5',
  'advisor.questions.q6',
]

const AIAdvisorPage: React.FC = () => {
  const navigate = useNavigate()
  const { activeFarm } = useFarm()
  const { toast } = useApp()
  const { t, i18n } = useTranslation()
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const [activeDiagnosis, setActiveDiagnosis] = useState<DiagnosisResult | null>(null)
  const [weatherData, setWeatherData] = useState<any>(null)
  const [satelliteData, setSatelliteData] = useState<any>(null)
  const location = useLocation()
  
  const { authUser } = useUser()
  const [conversationId, setConversationId] = useState<string | null>(null)

  // Fetch context on mount
  React.useEffect(() => {
    if (!activeFarm?.id) return
    let isMounted = true

    const passedDiagnosis = location.state?.diagnosisContext as DiagnosisResult | undefined
    if (passedDiagnosis) {
      setActiveDiagnosis(passedDiagnosis)
    } else {
      cropDoctorService.getRecentDiagnoses(1, activeFarm.id).then(diagnoses => {
        if (isMounted && diagnoses && diagnoses.length > 0) {
          setActiveDiagnosis(diagnoses[0])
        }
      }).catch(err => console.warn('Failed to fetch recent diagnoses', err))
    }

    // Fetch weather and satellite for the Farm Context panel
    weatherService.getWeather(activeFarm.id, activeFarm).then(w => {
      if (isMounted) setWeatherData(w)
    }).catch(() => {})

    if (activeFarm.location?.lat && activeFarm.location?.lng) {
      satelliteService.getSatelliteData(activeFarm.id, activeFarm.location.lat, activeFarm.location.lng).then(s => {
        if (isMounted) setSatelliteData(s)
      }).catch(() => {})
    }

    
    // Load existing conversation or start new
    const passedConvId = location.state?.conversationId as string | undefined
    if (passedConvId) {
      setConversationId(passedConvId)
      // fetch it
      advisorService.getRecentConversations(20, activeFarm.id, authUser?.uid).then(convs => {
        const found = convs.find(c => c.id === passedConvId)
        if (found && isMounted) {
          setMessages(found.messages)
        }
      })
    } else {
      // get most recent for farm
      advisorService.getRecentConversations(1, activeFarm.id, authUser?.uid).then(convs => {
        if (convs.length > 0 && isMounted) {
          setConversationId(convs[0].id)
          setMessages(convs[0].messages)
        }
      })
    }

    return () => { isMounted = false }
  }, [activeFarm?.id, location.state, authUser?.uid])

  const askQuestion = async (q: string) => {
    if (!q.trim() || loading) return
    const userMsg: AIMessage = { id: `u-${Date.now()}`, role: 'user', content: q, timestamp: new Date().toISOString() }
    
    const newMsgsWithUser = [...messages, userMsg]
    setMessages(newMsgsWithUser)
    setInput('')
    setLoading(true)

    // Helper to save conversation
    const saveChat = async (msgs: AIMessage[]) => {
      if (!activeFarm) return
      const cid = conversationId || `conv-${Date.now()}`
      if (!conversationId) setConversationId(cid)
      try {
        await advisorService.saveConversation({
          id: cid,
          userId: authUser?.uid,
          farmId: activeFarm.id,
          title: msgs[0]?.content.slice(0, 40) || 'New Conversation',
          createdAt: msgs[0]?.timestamp || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: msgs
        })
      } catch (e) {
        console.warn('Failed to save conversation', e)
      }
    }
    
    await saveChat(newMsgsWithUser)
    try {
      let weatherStr = 'None'
      let recentDiagnosisStr: string | null = null
      let satelliteStr = 'Data unavailable'

      if (activeFarm) {
        // Fetch weather
        try {
          const weather = await weatherService.getWeather(activeFarm.id, activeFarm)
          weatherStr = `${weather.temperature}°C, ${weather.description}, Humidity: ${weather.humidity}%, Rain Chance: ${weather.rainChance}%`
        } catch (e) {
          console.warn('Failed to fetch weather for AI Advisor context', e)
        }

        // Fetch satellite
        try {
          if (activeFarm.location?.lat && activeFarm.location?.lng) {
            const satData = await satelliteService.getSatelliteData(activeFarm.id, activeFarm.location.lat, activeFarm.location.lng)
            satelliteStr = `NDVI: ${satData.ndvi.value.toFixed(2)} (${satData.ndvi.label}), Source: ${satData.source}`
          }
        } catch (e) {
          console.warn('Failed to fetch satellite data for AI Advisor context', e)
        }

        // Use the active diagnosis state if available, or fetch again as fallback
        if (activeDiagnosis) {
          recentDiagnosisStr = `Condition: ${activeDiagnosis.disease} (${activeDiagnosis.confidence}% match). Severity: ${activeDiagnosis.severity}. Symptoms: ${activeDiagnosis.symptoms?.join(', ')}. Actions: ${activeDiagnosis.actions?.join(', ')}. Date: ${activeDiagnosis.timestamp?.slice(0, 10)}.`
        } else {
          try {
            const diagnoses = await cropDoctorService.getRecentDiagnoses(1, activeFarm.id)
            if (diagnoses && diagnoses.length > 0) {
              const d = diagnoses[0]
              setActiveDiagnosis(d)
              recentDiagnosisStr = `Condition: ${d.disease} (${d.confidence}% match). Severity: ${d.severity}. Symptoms: ${d.symptoms?.join(', ')}. Actions: ${d.actions?.join(', ')}. Date: ${d.timestamp?.slice(0, 10)}.`
            }
          } catch (e) {
            console.warn('Failed to fetch recent diagnosis for AI Advisor context', e)
          }
        }

        // Calculate dynamic health score for context
        // Try to fetch weather/satellite again if we didn't cache them, or just use what we fetched
        let satResult = null
        let weatherResult = null
        try {
          if (activeFarm.location?.lat && activeFarm.location?.lng) {
            satResult = await satelliteService.getSatelliteData(activeFarm.id, activeFarm.location.lat, activeFarm.location.lng)
          }
        } catch(e) {}
        try {
          weatherResult = await weatherService.getWeather(activeFarm.id, activeFarm)
        } catch(e) {}
        
        const healthResult = calculateFarmHealthScore(activeFarm, activeDiagnosis, satResult, weatherResult)
        
        const res = await aiService.getRecommendation(q, { 
          farmId: activeFarm?.id, 
          crop: activeFarm?.primaryCrop, 
          soilType: activeFarm?.soilType, 
          cropStage: activeFarm?.cropStage,
          location: activeFarm?.location?.displayName,
          area: activeFarm?.area ? `${activeFarm.area} ${activeFarm.areaUnit}` : undefined,
          weather: weatherStr,
          recentDiagnosis: recentDiagnosisStr,
          satelliteData: satelliteStr,
          healthScore: `${healthResult.score}/100`,
          healthStatus: healthResult.status
        })
        const finalMsgs = [...newMsgsWithUser, res]
        setMessages(finalMsgs)
        await saveChat(finalMsgs)
      } else {
        const res = await aiService.getRecommendation(q, {})
        const finalMsgs = [...newMsgsWithUser, res]
        setMessages(finalMsgs)
        await saveChat(finalMsgs)
      }
    } catch (err: any) {
      console.error('[AI Advisor]', err)
      const msg = err.message || 'Unable to get recommendation. Please try again.'
      toast.error(msg)
      // Remove the user's pending message from the UI since it failed, or let it remain?
      // Usually, it's better to remove it so they can try again, or add an error message.
      // We'll leave it as is, but maybe pop the last message if we want to be fancy.
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background flex flex-col">
      <MobileHeader title={t('nav.advisor')} subtitle={t('advisor.subtitle', 'Your farm-aware agricultural assistant.')} />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* ── Chat area ── */}
        <div className="flex-1 flex flex-col">
          <PageLayout className="flex-1 pt-4 pb-2 space-y-4">

            {/* Desktop header */}
            <div className="hidden lg:flex mb-6 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cream border border-brown-pastel/40 flex items-center justify-center shadow-sm">
                  <img src="/images/logo.jpg" alt="Cropoctor Logo" className="w-8 h-8 object-cover rounded-lg" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-green-forest tracking-tight">{t('nav.advisor')}</h1>
                  <p className="text-sm text-brown-earth/80 font-medium mt-0.5">{t('advisor.subtitle', 'Your farm-aware agricultural assistant.')}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setConversationId(null)
                  setMessages([])
                }}
                className="flex items-center gap-2 bg-green-forest/10 hover:bg-green-forest/20 text-green-forest px-4 py-2 rounded-xl font-bold transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                New Conversation
              </button>
            </div>

            {/* Active Context Banner */}
            {activeDiagnosis && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 bg-green-pastel/20 border border-green-pastel/50 rounded-xl p-3 flex items-start gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 border border-green-pastel/40 shadow-sm">
                  {activeDiagnosis.imageUrl ? (
                    <img src={activeDiagnosis.imageUrl} alt={activeDiagnosis.disease} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg">🔬</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-green-forest uppercase tracking-widest mb-0.5">Active Context</p>
                  <p className="text-sm font-bold text-text-main leading-tight">{activeDiagnosis.disease}</p>
                  <p className="text-xs text-text-secondary mt-0.5">I have analyzed your recent diagnosis. Ask me how to treat it!</p>
                </div>
                {messages.length === 0 && (
                  <button 
                    onClick={() => askQuestion(`What is the recommended treatment for ${activeDiagnosis.disease}?`)}
                    className="shrink-0 bg-green-forest text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-dark transition-colors shadow-sm mt-1"
                  >
                    Ask Treatment
                  </button>
                )}
              </motion.div>
            )}

            {/* Empty state / quick questions */}
            {messages.length === 0 && !loading && (
              <motion.div variants={listVariants} animate="animate" className="space-y-3">
                <p className="text-[11px] font-bold text-brown-earth uppercase tracking-wider mb-2">{t('advisor.quickQuestions', 'Quick Questions')}</p>
                {QUESTION_KEYS.map(key => {
                  const qText = t(key)
                  return (
                    <motion.button
                      key={key}
                      variants={cardVariants}
                      onClick={() => askQuestion(qText)}
                      className="w-full text-left px-4 py-3.5 bg-cream rounded-2xl border border-brown-pastel/30 shadow-sm text-sm font-semibold text-text-main hover:border-green-forest/40 hover:bg-green-pastel/10 transition-all flex items-center justify-between group"
                    >
                      <span>{qText}</span>
                      <ChevronRight className="w-4 h-4 text-brown-earth/40 group-hover:text-green-forest transition-colors" />
                    </motion.button>
                  )
                })}
              </motion.div>
            )}

            {/* Message thread */}
            <div className="space-y-4">
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                >
                  {msg.role === 'user' ? (
                    <div className="max-w-[85%] bg-brown-earth text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm font-medium shadow-sm">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="max-w-[95%] lg:max-w-full w-full">
                      <Card padding="md" className="border-brown-pastel/30 bg-cream shadow-sm">
                        {msg.structured ? (
                          <div className="space-y-4">
                            {/* Recommendation */}
                            <div className="bg-green-pastel/20 border border-green-pastel/30 rounded-xl p-3">
                              <p className="text-[10px] font-bold text-green-forest uppercase tracking-widest mb-1">✅ {t('advisor.recommendation', 'Recommendation')}</p>
                              <p className="font-semibold text-text-main">{msg.structured.recommendation}</p>
                            </div>
                            {/* Why */}
                            <div>
                              <p className="text-[10px] font-bold text-brown-earth uppercase tracking-widest mb-1.5">{t('advisor.why', 'Why?')}</p>
                              <p className="text-sm text-text-secondary font-medium">{msg.structured.why}</p>
                            </div>
                            {/* Current Condition */}
                            {msg.structured.currentCondition && (
                              <div className="bg-blue-50/50 border border-blue-200/50 rounded-xl p-3 mt-3">
                                <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest mb-1.5">Current Condition</p>
                                <p className="text-sm text-blue-900 font-medium">{msg.structured.currentCondition}</p>
                              </div>
                            )}
                            {/* Risks */}
                            {msg.structured.risks && (
                              <div className="bg-red-50/50 border border-red-200/50 rounded-xl p-3 mt-3">
                                <p className="text-[10px] font-bold text-red-800 uppercase tracking-widest mb-1.5">Potential Risks</p>
                                <p className="text-sm text-red-900 font-medium">{msg.structured.risks}</p>
                              </div>
                            )}
                            {/* What to do */}
                            <div>
                              <p className="text-[10px] font-bold text-brown-earth uppercase tracking-widest mb-2">{t('advisor.whatToDo', 'What to do')}</p>
                              <ol className="space-y-2">
                                {msg.structured.whatToDo.map((step, i) => (
                                  <li key={i} className="flex gap-2.5 text-sm text-text-secondary font-medium">
                                    <span className="w-5 h-5 rounded-full bg-green-forest text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </div>
                            {/* What to monitor */}
                            {msg.structured.whatToMonitor && msg.structured.whatToMonitor.length > 0 && (
                              <div className="mt-4">
                                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-2">What to Monitor</p>
                                <ul className="space-y-2">
                                  {msg.structured.whatToMonitor.map((item, i) => (
                                    <li key={i} className="flex gap-2.5 text-sm text-text-secondary font-medium">
                                      <span className="text-amber-600 mt-0.5">👀</span>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {/* When to act */}
                            {msg.structured.whenToAct && (
                              <div className="mt-3">
                                <p className="text-[10px] font-bold text-purple-800 uppercase tracking-widest mb-1.5">When to Act</p>
                                <p className="text-sm text-purple-900 font-medium">{msg.structured.whenToAct}</p>
                              </div>
                            )}
                            {/* Pros / Cons */}
                            {msg.structured.prosCons && (
                              <div className="bg-gray-50/50 border border-gray-200/50 rounded-xl p-3 mt-3">
                                <p className="text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-1.5">Pros / Cons & Trade-offs</p>
                                <p className="text-sm text-gray-800 font-medium">{msg.structured.prosCons}</p>
                              </div>
                            )}
                            {/* Data used */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {msg.structured.dataUsed.map(d => (
                                <Badge key={d} variant="earth" size="sm">📊 {d}</Badge>
                              ))}
                            </div>
                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 pt-3 mt-1 border-t border-brown-pastel/20">
                              <button onClick={() => toast.info('Playing advice audio…')} className="flex items-center gap-1.5 text-xs font-semibold text-green-forest bg-green-pastel/30 px-3 py-1.5 rounded-xl hover:bg-green-pastel/50 transition-colors">
                                🔊 {t('advisor.listen', 'Listen')}
                              </button>
                              <button onClick={() => toast.success(t('advisor.saved', 'Advice saved.'))} className="flex items-center gap-1.5 text-xs font-semibold text-brown-earth bg-brown-pastel/30 px-3 py-1.5 rounded-xl hover:bg-brown-pastel/50 transition-colors">
                                💾 {t('advisor.saveAdvice', 'Save')}
                              </button>
                              <button onClick={() => inputRef.current?.focus()} className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary bg-off-white px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors border border-brown-pastel/30">
                                💬 {t('advisor.askFollowUp', 'Ask Follow-up')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700">{msg.content}</p>
                        )}
                      </Card>
                    </div>
                  )}
                </motion.div>
              ))}

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <AISkel />
                </motion.div>
              )}
            </div>
          </PageLayout>

          <div className="sticky bottom-[68px] md:bottom-0 bg-cream/95 backdrop-blur-md border-t border-brown-pastel/40 px-4 py-4 shadow-[0_-8px_30px_rgba(141,98,69,0.08)]">
            <div className="flex items-center gap-3 max-w-4xl mx-auto">
              <button onClick={() => navigate('/diagnose')} className="w-12 h-12 rounded-2xl bg-off-white border border-brown-pastel/50 flex items-center justify-center text-brown-earth hover:bg-brown-pastel/20 transition-colors shadow-sm shrink-0" aria-label="Upload image">
                <Image className="w-5 h-5" />
              </button>
              
              <div className="flex-1 flex items-center bg-off-white rounded-2xl px-4 py-3 border border-brown-pastel/50 shadow-inner">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && askQuestion(input)}
                  placeholder={t('advisor.askPlaceholder', 'Ask anything about your farm…')}
                  className="flex-1 bg-transparent text-sm text-text-main placeholder:text-brown-earth/40 focus:outline-none font-medium"
                />
              </div>

              {input.trim() ? (
                <button
                  onClick={() => askQuestion(input)}
                  disabled={loading}
                  className="w-12 h-12 bg-brown-earth rounded-2xl flex items-center justify-center disabled:opacity-40 hover:bg-brown-deep transition-all shadow-button shrink-0"
                  aria-label="Send"
                >
                  <Send className="w-5 h-5 text-white ml-0.5" />
                </button>
              ) : (
                <button 
                  onClick={() => navigate('/voice')} 
                  className="w-14 h-14 bg-gradient-to-br from-green-forest to-[#256427] rounded-full flex items-center justify-center shadow-card-lg text-white hover:scale-105 transition-all shrink-0 relative overflow-hidden"
                  aria-label="Voice input"
                >
                  <div className="absolute inset-0 bg-white/20 blur-[10px] animate-pulse-soft" />
                  <Mic className="w-6 h-6 relative z-10" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Desktop: Farm Context Panel ── */}
        <div className="hidden lg:flex lg:w-72 xl:w-80 flex-col bg-cream border-l border-brown-pastel/30 p-5 space-y-4">
          <h3 className="font-bold text-brown-earth text-[11px] uppercase tracking-widest">{t('farm.context.title', 'Farm Context')}</h3>
          <Card variant="flat" padding="sm" className="space-y-3 bg-white/60 border border-brown-pastel/30 shadow-sm">
            {[
              { label: t('farm.context.crop', 'Crop'),     value: t(`crops.${activeFarm?.primaryCrop || 'groundnut'}`, activeFarm?.primaryCrop || 'groundnut'), icon: '🌱' },
              { label: t('farm.context.soil', 'Soil'),     value: t(`soils.${activeFarm?.soilType || 'unknown'}`, activeFarm?.soilType || 'Unknown'),      icon: '🪨' },
              { label: t('farm.context.stage', 'Stage'),    value: t(`stages.${activeFarm?.cropStage || 'flowering'}`, activeFarm?.cropStage || 'flowering'),  icon: '🌸' },
              { label: t('farm.context.location', 'Location'), value: activeFarm?.location ? `${activeFarm.location.lat.toFixed(5)}, ${activeFarm.location.lng.toFixed(5)}` : 'Unknown', icon: '📍' },
              { label: t('farm.context.weather', 'Weather'),  value: weatherData ? `${formatLocalizedNumber(weatherData.current?.temperature || 29, i18n.language)}°C · ${t('dashboard.weatherCard.rain', 'Rain')} ${formatLocalizedPercent(weatherData.current?.rainProbability || 60, i18n.language)}` : t('states.loading', 'Loading...'), icon: '🌦' },
              { label: t('farm.context.health', 'Health'),   value: (weatherData || satelliteData || activeDiagnosis) ? `${calculateFarmHealthScore(activeFarm, activeDiagnosis, satelliteData, weatherData).score}% (${calculateFarmHealthScore(activeFarm, activeDiagnosis, satelliteData, weatherData).status})` : t('states.loading', 'Loading...'), icon: '💚' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-lg w-6 text-center">{icon}</span>
                <div>
                  <p className="text-[10px] uppercase font-bold text-brown-earth/60 tracking-wider">{label}</p>
                  <p className="text-sm font-semibold text-text-main">{value}</p>
                </div>
              </div>
            ))}
          </Card>
          <div className="pt-2">
            <p className="text-xs text-text-secondary font-medium leading-relaxed bg-brown-pastel/20 p-3 rounded-xl">
              {t('farm.context.hint', 'The AI uses your farm context when generating recommendations.')}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default AIAdvisorPage
