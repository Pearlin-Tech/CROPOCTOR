import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/index'
import { ProgressBar } from '@/components/ui/index'
import { MOCK_DIAGNOSIS } from '@/mock/diagnosis'
import { useApp } from '@/store/AppContext'

const severityColor = { mild: 'green', moderate: 'warning', severe: 'danger' } as const

const DiagnosisResultPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useApp()
  const d = MOCK_DIAGNOSIS

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title="Diagnosis Result" onBack={() => navigate('/diagnose')} />

      <PageLayout className="pt-4 pb-8 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: image + confidence */}
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3]">
              <img src={d.imageUrl} alt="Diagnosed crop" className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3">
                <Badge variant="demo" size="md">🧪 Demo Diagnosis</Badge>
              </div>
              <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-2xl px-3 py-2">
                <p className="text-xs text-gray-500">Confidence</p>
                <p className="text-2xl font-bold text-muted-danger">{d.confidence}%</p>
              </div>
            </div>

            {/* Disease header */}
            <Card className="bg-gradient-to-br from-[#FFF9F0] to-[#FAFBF8] border-brown-pastel/30 shadow-sm" padding="md">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-2xl">🔬</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-brown-soft font-bold mb-0.5">Possible Issue</p>
                  <h2 className="text-2xl font-bold text-gray-900">{d.disease}</h2>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="earth" size="sm">{d.crop}</Badge>
                    <Badge variant={severityColor[d.severity]} size="sm" dot>
                      {d.severity.charAt(0).toUpperCase() + d.severity.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-brown-soft/20">
                <ProgressBar value={d.confidence} color="danger" size="sm" label="Match confidence" showValue />
              </div>
            </Card>
          </div>

          {/* Right: symptoms + actions */}
          <div className="space-y-4">
            <Card padding="md" className="border-brown-pastel/20 shadow-sm">
              <h3 className="font-bold text-brown-earth mb-3 flex items-center gap-2">
                <span className="text-lg">🔍</span> Observed Symptoms
              </h3>
              <ul className="space-y-2">
                {d.symptoms.map(s => (
                  <li key={s} className="flex gap-3 text-sm text-gray-800 font-medium bg-off-white p-2.5 rounded-xl border border-gray-100">
                    <span className="text-muted-danger shrink-0 mt-0.5">●</span>
                    {s}
                  </li>
                ))}
              </ul>
            </Card>

            <Card padding="md" className="border-green-pastel/30 bg-green-light/10 shadow-sm">
              <h3 className="font-bold text-green-forest mb-3 flex items-center gap-2">
                <span className="text-lg">✅</span> Recommended Actions
              </h3>
              <ol className="space-y-3">
                {d.actions.map((a, i) => (
                  <li key={a} className="flex gap-3 text-sm text-gray-800 font-medium">
                    <span className="w-6 h-6 rounded-full bg-green-light text-green-forest text-xs font-bold flex items-center justify-center shrink-0">{i+1}</span>
                    <span className="mt-0.5 leading-relaxed">{a}</span>
                  </li>
                ))}
              </ol>
            </Card>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => toast.info('Playing diagnosis audio…')} className="flex items-center gap-1.5 text-sm font-semibold text-green-forest bg-green-light px-4 py-2.5 rounded-xl hover:bg-green-pastel/50 transition-colors">
                🔊 Listen
              </button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/advisor')}>Ask AI</Button>
              <button onClick={() => toast.success('Diagnosis saved.')} className="flex items-center gap-1.5 text-sm font-semibold text-brown-earth bg-beige-warm px-4 py-2.5 rounded-xl hover:bg-brown-soft/20 transition-colors">
                💾 Save Diagnosis
              </button>
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed">
              ⚠️ AI diagnosis is informational and should not replace professional agricultural advice. Consult your local agricultural extension officer for confirmed treatment plans.
            </p>
          </div>
        </div>
      </PageLayout>
    </motion.div>
  )
}

export default DiagnosisResultPage
