import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Image, Send, Bot, ChevronRight } from 'lucide-react'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/index'
import { AIResponseSkeleton as AISkel } from '@/components/skeletons'
import { useFarm } from '@/store/FarmContext'
import { aiService } from '@/services'
import type { AIMessage } from '@/types'
import { QUICK_QUESTIONS } from '@/mock/aiResponses'
import { useApp } from '@/store/AppContext'

const AIAdvisorPage: React.FC = () => {
  const navigate = useNavigate()
  const { activeFarm } = useFarm()
  const { toast } = useApp()
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const askQuestion = async (q: string) => {
    if (!q.trim() || loading) return
    const userMsg: AIMessage = { id: `u-${Date.now()}`, role: 'user', content: q, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await aiService.getRecommendation(q, { farmId: activeFarm?.id, crop: activeFarm?.primaryCrop, soilType: activeFarm?.soilType, cropStage: activeFarm?.cropStage })
      setMessages(prev => [...prev, res])
    } catch {
      toast.error('Unable to get recommendation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background flex flex-col">
      <MobileHeader title="AI Advisor" subtitle="Your farm-aware agricultural assistant." />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* ── Chat area ── */}
        <div className="flex-1 flex flex-col">
          <PageLayout className="flex-1 pt-4 pb-2 space-y-4">

            {/* Desktop header (hidden on mobile since MobileHeader handles it) */}
            <div className="hidden lg:block mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-green-light flex items-center justify-center">
                  <Bot className="w-5 h-5 text-green-forest" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">AI Advisor</h1>
                  <p className="text-sm text-gray-500">Your farm-aware agricultural assistant.</p>
                </div>
              </div>
            </div>

            {/* Empty state / quick questions */}
            {messages.length === 0 && !loading && (
              <motion.div variants={listVariants} animate="animate" className="space-y-3">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Quick Questions</p>
                {QUICK_QUESTIONS.map(q => (
                  <motion.button
                    key={q}
                    variants={cardVariants}
                    onClick={() => askQuestion(q)}
                    className="w-full text-left px-4 py-3.5 bg-white rounded-2xl border border-green-pastel/30 shadow-sm text-sm font-medium text-gray-700 hover:border-green-soft hover:bg-green-light/30 transition-all flex items-center justify-between group"
                  >
                    <span>{q}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-forest transition-colors" />
                  </motion.button>
                ))}
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
                    <div className="max-w-[85%] bg-green-forest text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm font-medium">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="max-w-[95%] lg:max-w-full w-full">
                      <Card padding="md" className="border-green-pastel/30">
                        {msg.structured ? (
                          <div className="space-y-4">
                            {/* Recommendation */}
                            <div className="bg-green-light rounded-xl p-3">
                              <p className="text-xs font-bold text-green-forest uppercase tracking-wider mb-1">✅ Recommendation</p>
                              <p className="font-semibold text-gray-800">{msg.structured.recommendation}</p>
                            </div>
                            {/* Why */}
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Why?</p>
                              <p className="text-sm text-gray-700">{msg.structured.why}</p>
                            </div>
                            {/* What to do */}
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">What to do</p>
                              <ol className="space-y-1.5">
                                {msg.structured.whatToDo.map((step, i) => (
                                  <li key={i} className="flex gap-2.5 text-sm text-gray-700">
                                    <span className="w-5 h-5 rounded-full bg-green-light text-green-forest text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </div>
                            {/* Data used */}
                            <div className="flex flex-wrap gap-1.5">
                              <p className="w-full text-xs font-bold text-gray-400 uppercase tracking-wider">Data Used</p>
                              {msg.structured.dataUsed.map(d => (
                                <Badge key={d} variant="earth" size="sm">📊 {d}</Badge>
                              ))}
                            </div>
                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
                              <button onClick={() => toast.info('Playing advice audio…')} className="flex items-center gap-1.5 text-xs font-semibold text-green-forest bg-green-light px-3 py-1.5 rounded-xl hover:bg-green-pastel/50 transition-colors">
                                🔊 Listen
                              </button>
                              <button onClick={() => toast.success('Advice saved.')} className="flex items-center gap-1.5 text-xs font-semibold text-brown-earth bg-beige-warm px-3 py-1.5 rounded-xl hover:bg-brown-soft/20 transition-colors">
                                💾 Save Advice
                              </button>
                              <button onClick={() => inputRef.current?.focus()} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-xl hover:bg-gray-200 transition-colors">
                                💬 Ask Follow-up
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
                  <div className="space-y-2 mb-3">
                    {['Understanding your farm…', 'Checking relevant information…', 'Preparing your recommendation…'].map((s, i) => (
                      <motion.div key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.6 }}
                        className="flex items-center gap-2 text-xs text-green-forest font-medium"
                      >
                        <div className="w-1.5 h-1.5 bg-green-soft rounded-full animate-pulse-soft" />
                        {s}
                      </motion.div>
                    ))}
                  </div>
                  <AISkel />
                </motion.div>
              )}
            </div>
          </PageLayout>

          <div className="sticky bottom-[68px] md:bottom-0 bg-[#EAE0D5]/90 backdrop-blur-md border-t border-brown-pastel/30 px-4 py-4 shadow-[0_-4px_24px_rgba(141,98,69,0.1)]">
            <div className="flex items-center gap-3 max-w-4xl mx-auto">
              <button onClick={() => navigate('/diagnose')} className="w-12 h-12 rounded-2xl bg-white border border-brown-soft/20 flex items-center justify-center text-brown-earth hover:bg-brown-earth/5 transition-colors shadow-sm shrink-0" aria-label="Upload image">
                <Image className="w-5 h-5" />
              </button>
              
              <div className="flex-1 flex items-center bg-white rounded-2xl px-4 py-3 border border-brown-soft/20 shadow-sm">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && askQuestion(input)}
                  placeholder="Ask anything about your farm…"
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
                />
              </div>

              {input.trim() ? (
                <button
                  onClick={() => askQuestion(input)}
                  disabled={loading}
                  className="w-12 h-12 bg-green-forest rounded-2xl flex items-center justify-center disabled:opacity-40 hover:bg-[#256427] transition-all shadow-button shrink-0"
                  aria-label="Send"
                >
                  <Send className="w-5 h-5 text-white ml-0.5" />
                </button>
              ) : (
                <button 
                  onClick={() => navigate('/voice')} 
                  className="w-14 h-14 bg-gradient-to-br from-green-forest to-[#256427] rounded-full flex items-center justify-center shadow-card-lg text-white hover:scale-105 transition-all shrink-0 animate-pulse-soft"
                  aria-label="Voice input"
                >
                  <Mic className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Desktop: Farm Context Panel ── */}
        <div className="hidden lg:flex lg:w-72 xl:w-80 flex-col bg-off-white border-l border-green-pastel/20 p-5 space-y-4">
          <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Farm Context</h3>
          <Card variant="flat" padding="sm" className="space-y-3">
            {[
              { label: 'Crop',     value: activeFarm?.primaryCrop || 'Groundnut', icon: '🌱' },
              { label: 'Soil',     value: activeFarm?.soilType    || 'Loamy',      icon: '🪨' },
              { label: 'Stage',    value: activeFarm?.cropStage   || 'Flowering',  icon: '🌸' },
              { label: 'Location', value: activeFarm?.location.displayName || 'Rajkot, Gujarat', icon: '📍' },
              { label: 'Weather',  value: '29°C · Rain 60%',                      icon: '🌦' },
              { label: 'Health',   value: `${activeFarm?.healthScore ?? 82}%`,    icon: '💚' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-center gap-2.5">
                <span className="text-base w-6">{icon}</span>
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-semibold text-gray-700 capitalize">{value}</p>
                </div>
              </div>
            ))}
          </Card>
          <div className="pt-2">
            <p className="text-xs text-gray-400 leading-relaxed">
              The AI uses your farm context when generating recommendations. All data shown is demo data for Stage 1.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default AIAdvisorPage
