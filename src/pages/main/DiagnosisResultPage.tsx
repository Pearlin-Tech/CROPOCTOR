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
import { useTranslation } from 'react-i18next'

const severityColor = { mild: 'green', moderate: 'warning', severe: 'danger' } as const

const DiagnosisResultPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useApp()
  const { t } = useTranslation()
  const d = MOCK_DIAGNOSIS

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title={t('dashboard.actions.diagnose', 'Diagnosis Result')} onBack={() => navigate('/diagnose')} />

      <PageLayout className="pt-4 pb-8 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: image + confidence */}
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3]">
              <img src={d.imageUrl} alt="Diagnosed crop" className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3">
                <Badge variant="demo" size="md">🧪 {t('diagnosis.demo', 'Demo Diagnosis')}</Badge>
              </div>
              <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-2xl px-3 py-2">
                <p className="text-xs text-gray-500">{t('diagnosis.confidence', 'Confidence')}</p>
                <p className="text-2xl font-bold text-muted-danger">{d.confidence}%</p>
              </div>
            </div>

            {/* Disease header */}
            <Card className="bg-cream border-brown-pastel/40 shadow-sm" padding="md">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-brown-pastel/30 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-2xl">🔬</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-brown-earth/80 font-bold mb-0.5">{t('diagnosis.possibleIssue', 'Possible Issue')}</p>
                  <h2 className="text-2xl font-bold text-green-forest tracking-tight">{d.disease}</h2>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="earth" size="sm">{d.crop}</Badge>
                    <Badge variant={severityColor[d.severity]} size="sm" dot>
                      {d.severity.charAt(0).toUpperCase() + d.severity.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-brown-soft/20">
                <ProgressBar value={d.confidence} color="danger" size="sm" label={t('diagnosis.matchConfidence', 'Match confidence')} showValue />
              </div>
            </Card>
          </div>

          {/* Right: symptoms + actions */}
          <div className="space-y-4">
            <Card padding="md" className="border-brown-pastel/30 bg-off-white shadow-sm">
              <h3 className="font-bold text-brown-earth mb-3 flex items-center gap-2">
                <span className="text-lg">🔍</span> {t('diagnosis.symptoms', 'Observed Symptoms')}
              </h3>
              <ul className="space-y-2">
                {d.symptoms.map(s => (
                  <li key={s} className="flex gap-3 text-sm text-text-main font-medium bg-white p-2.5 rounded-xl border border-brown-pastel/20">
                    <span className="text-brown-earth shrink-0 mt-0.5">●</span>
                    {s}
                  </li>
                ))}
              </ul>
            </Card>

            <Card padding="md" className="border-green-pastel/40 bg-green-pastel/10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-pastel/20 rounded-full blur-[30px]" />
              <div className="relative z-10">
                <h3 className="font-bold text-green-forest mb-3 flex items-center gap-2">
                  <span className="text-lg">✅</span> {t('diagnosis.recommendedActions', 'Recommended Actions')}
                </h3>
                <ol className="space-y-3">
                  {d.actions.map((a, i) => (
                    <li key={a} className="flex gap-3 text-sm text-text-main font-medium">
                      <span className="w-6 h-6 rounded-full bg-green-pastel/40 text-green-forest text-xs font-bold flex items-center justify-center shrink-0">{i+1}</span>
                      <span className="mt-0.5 leading-relaxed">{a}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => toast.info('Playing diagnosis audio…')} className="flex items-center gap-1.5 text-sm font-semibold text-green-forest bg-green-pastel/30 px-4 py-2.5 rounded-xl hover:bg-green-pastel/50 transition-colors">
                🔊 {t('diagnosis.listen', 'Listen')}
              </button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/advisor')}>{t('dashboard.actions.askAdvisor', 'Ask AI')}</Button>
              <button onClick={() => toast.success('Diagnosis saved.')} className="flex items-center gap-1.5 text-sm font-semibold text-brown-earth bg-brown-pastel/30 px-4 py-2.5 rounded-xl hover:bg-brown-pastel/50 transition-colors">
                💾 {t('diagnosis.save', 'Save Diagnosis')}
              </button>
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-text-secondary bg-white p-3 rounded-xl border border-brown-pastel/30 leading-relaxed shadow-sm">
              ⚠️ {t('diagnosis.disclaimer', 'AI diagnosis is informational and should not replace professional agricultural advice. Consult your local agricultural extension officer for confirmed treatment plans.')}
            </p>
          </div>
        </div>
      </PageLayout>
    </motion.div>
  )
}

export default DiagnosisResultPage
