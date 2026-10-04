import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pageVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/index'
import { ProgressBar } from '@/components/ui/index'
import { useApp } from '@/store/AppContext'
import { useFarm } from '@/store/FarmContext'
import { useTranslation } from 'react-i18next'
import type { DiagnosisResult } from '@/types'
import { ChevronLeft, RotateCcw, Volume2, VolumeX, ShieldCheck, MessageSquare, AlertTriangle, UserCheck, Stethoscope, Download } from 'lucide-react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import DiagnosisReportPDF from '@/components/pdf/DiagnosisReportPDF'
import { useLocalizedDiagnosis } from '@/services/translationClient'
import { certaintyLabel, isFallbackRecord } from '@/utils/diagnosis'
import { formatDiagnosisTimestamp } from '@/utils/format'

const severityColor = {
  healthy: 'green',
  mild: 'green',
  moderate: 'warning',
  severe: 'danger',
  unknown: 'earth'
} as const

const DiagnosisResultPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast, language } = useApp()
  const { activeFarm } = useFarm()
  const { t } = useTranslation()
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)

  // Read diagnosis object passed via navigation state
  const locationState = (location.state as any) || {}
  // The stored record (English original) is never modified; `d` is a display copy in the UI language.
  const [record] = useState<DiagnosisResult | null>(locationState.diagnosis || null)
  const { display: d, isTranslating, failed: translationFailed } = useLocalizedDiagnosis(record, language)

  React.useEffect(() => {
    if (!record) navigate('/diagnose', { replace: true })
  }, [record, navigate])

  if (!d) return null // Wait for redirect

  const displayImage = locationState.imageUrl || d.imageUrl || ''
  // Legacy records from the old pipeline may be fabricated fallbacks — never show their treatment.
  const unreliable = isFallbackRecord(d)
  const treatmentList = unreliable ? [] : (d.treatment || [])
  const immediateList = unreliable ? [] : (d.immediateActions || [])
  const actionsList = [...immediateList, ...treatmentList]

  const handleListenAudio = () => {
    if ('speechSynthesis' in window) {
      if (isPlayingAudio) {
        window.speechSynthesis.cancel()
        setIsPlayingAudio(false)
        return
      }

      const textToSpeak = [`${d.cropName || d.crop}: ${d.diseaseName || d.disease}.`, ...actionsList].join(' ')
      const utterance = new SpeechSynthesisUtterance(textToSpeak)
      const speechLang = ({ hi: 'hi-IN', gu: 'gu-IN', ar: 'ar-SA', en: 'en-IN' } as Record<string, string>)[language.split('-')[0]] || language
      utterance.lang = speechLang
      const voices = window.speechSynthesis.getVoices()
      if (voices.length && !voices.some(v => v.lang.toLowerCase().startsWith(speechLang.split('-')[0]))) {
        toast.info(t('diagnosis.result.voiceUnsupported', 'Your device has no voice installed for this language.'))
        return
      }
      window.speechSynthesis.cancel() // never overlap speech

      utterance.onend = () => setIsPlayingAudio(false)
      utterance.onerror = () => setIsPlayingAudio(false)

      setIsPlayingAudio(true)
      window.speechSynthesis.speak(utterance)
      toast.info(t("ui.diagnosisResultPage.readingDiagnosisRemediesAloud", "Reading diagnosis remedies aloud..."))
    } else {
      toast.info(t("ui.diagnosisResultPage.audioReadoutUnavailableOnThis", "Audio readout unavailable on this browser."))
    }
  }

  const handleDiagnoseAnother = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    // Clear current state and navigate to diagnose page
    navigate('/diagnose', { state: { reset: true }, replace: true })
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title={t('dashboard.actions.diagnose', 'Diagnosis Result')} onBack={() => navigate('/diagnose')} />

      <PageLayout className="pt-4 pb-8 space-y-4">
        {isTranslating && (
          <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex items-center justify-center gap-2 mb-4">
            <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
            <span className="font-medium text-sm">{t('diagnosis.result.translating', 'Translating history to your language...')}</span>
          </div>
        )}
        {translationFailed && (
          <div role="status" className="bg-gray-50 border border-gray-200 text-gray-700 p-3 rounded-xl text-xs">
            {t('diagnosis.result.translationFailed', 'Translation is unavailable right now, so this result is shown in its original language (English).')}
          </div>
        )}
        
        {/* Prominent "Diagnose Another Crop" CTA Header Banner */}
        <div className="bg-cream border border-brown-pastel/40 p-4 rounded-3xl flex items-center justify-between gap-4 shadow-sm">
          <div>
            <h2 className="font-bold text-green-forest text-base flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-green-forest" />
              <span>{t('diagnosis.result.completed', 'Crop Analysis Completed')}</span>
            </h2>
            {d.timestamp && (
              <p className="text-xs text-brown-earth/80 mt-0.5 font-medium">
                {t('diagnosis.result.analyzedAt', 'Analysed')}: {formatDiagnosisTimestamp(d.timestamp)}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {activeFarm && d && (
              <PDFDownloadLink
                document={<DiagnosisReportPDF diagnosis={d} farm={activeFarm} language={language} weather={activeFarm.lastWeatherSnapshot} />}
                fileName={`diagnosis-report-${d.id}.pdf`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 border-2 border-green-forest text-green-forest font-bold rounded-xl hover:bg-green-50 transition-colors shadow-sm text-sm"
              >
                {({ loading }) => (
                  <>
                    <Download className="w-4 h-4" />
                    <span>{loading ? t('diagnosis.result.preparingPdf', 'Preparing PDF...') : t('diagnosis.result.downloadReport', 'Download Report')}</span>
                  </>
                )}
              </PDFDownloadLink>
            )}
            <Button
              variant="primary"
              size="md"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={handleDiagnoseAnother}
              className="w-full sm:w-auto bg-green-forest hover:bg-green-dark text-white font-bold shadow-md"
            >
              {t('dashboard.actions.diagnose', 'Diagnose Another Crop')}
            </Button>
          </div>
        </div>

        {/* Non-Plant Image Banner */}
        {d.isPlantImage === false && (
          <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-3xl flex items-start gap-3 shadow-sm">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900 text-sm">{t('diagnosis.result.nonPlant', 'Non-Plant Image Detected')}</h3>
              <p className="text-xs text-amber-800 mt-0.5">
                {t('diagnosis.result.nonPlantDesc', 'The image uploaded does not clearly show a plant, crop, or leaf. Please capture a clear, well-lit photo of affected plant foliage.')}
              </p>
            </div>
          </div>
        )}

        {/* Legacy / fabricated record warning */}
        {unreliable && (
          <div role="alert" className="p-4 bg-red-50 border-2 border-red-300 rounded-3xl flex items-start gap-3 shadow-sm">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-900 text-sm">{t('diagnosis.result.unreliableTitle', 'Unreliable older record')}</h3>
              <p className="text-xs text-red-800 mt-0.5">
                {t('diagnosis.result.unreliableDesc', 'This record was created by an earlier version of the app that could produce a result without analysing your photo. Treatment advice is hidden. Please diagnose the plant again and delete this record from History.')}
              </p>
            </div>
          </div>
        )}
        {!unreliable && d.isLegacy && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-700">
            {t('diagnosis.result.legacyNote', 'Older record — created before results were validated. Treat it with caution and re-diagnose if in doubt.')}
          </div>
        )}

        {/* Expert Review Recommended Banner */}
        {d.needsExpertReview && d.isPlantImage !== false && (
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-blue-900 shadow-sm">
            <div className="flex items-center gap-2 font-medium">
              <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{t('diagnosis.result.expertReview', 'Recommended: Have a local agricultural extension officer confirm this diagnosis.')}</span>
            </div>
            <Badge variant="earth" size="sm">{t('diagnosis.result.expertBadge', 'Expert Review')}</Badge>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: image + confidence */}
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] bg-gray-100 shadow-md border border-brown-pastel/30">
              {displayImage ? (
                <img src={displayImage} alt={t('diagnosis.result.photoAlt', 'Diagnosed crop photo')} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">{t('diagnosis.result.noPhoto', 'Photo not stored')}</div>
              )}
              <div className="absolute top-3 left-3 flex gap-2">
                <Badge variant={d.isDemo || d.isSample ? 'demo' : 'green'} size="md">
                  {d.isDemo || d.isSample ? `🧪 ${t('diagnosis.demo', 'Sample image')}` : `🔬 ${t('diagnosis.result.aiBadge', 'AI image analysis')}`}
                </Badge>
              </div>
              <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-sm">
                <p className="text-xs text-gray-500 font-medium">{t('diagnosis.result.certainty', 'Certainty')}</p>
                <p className="text-base font-bold text-green-forest">{certaintyLabel(d, t)}</p>
                {d.certainty && <p className="text-[10px] text-gray-500">{t('diagnosis.result.uncalibrated', 'AI estimate, not calibrated')}</p>}
              </div>
            </div>

            {/* Disease Header Card */}
            <Card className="bg-cream border-brown-pastel/40 shadow-sm" padding="md">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-brown-pastel/30 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-2xl">🌿</span>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-brown-earth/80 font-bold mb-0.5">{t('diagnosis.possibleIssue', 'Identified Condition')}</p>
                  <h2 className="text-2xl font-bold text-green-forest tracking-tight">{d.diseaseName || d.disease}</h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="earth" size="sm">{d.cropName || d.crop}</Badge>
                    <Badge variant={severityColor[d.severity] || 'earth'} size="sm" dot>
                      {t(`diagnosis.severity.${d.severity}`, { defaultValue: { healthy: 'Healthy', mild: 'Mild', moderate: 'Moderate', severe: 'Severe', unknown: 'Severity unknown' }[d.severity] || d.severity })}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Explanation Text */}
              {(d.analysis || d.explanation) && (
                <div className="mt-4 pt-3 border-t border-brown-soft/20 text-sm text-text-secondary leading-relaxed font-medium">
                  💡 <span className="text-brown-earth font-bold">{t('diagnosis.result.analysis', 'Analysis')}:</span> {d.analysis || d.explanation}
                </div>
              )}
            </Card>
          </div>

          {/* Right: symptoms + remedies + prevention */}
          <div className="space-y-4">
            
            {/* Positive Signs */}
            {d.positiveSigns && d.positiveSigns.length > 0 && (
              <Card padding="md" className="border-green-pastel/40 bg-green-50 shadow-sm">
                <h3 className="font-bold text-green-forest mb-2.5 flex items-center gap-2 text-sm">
                  <span className="text-lg">✨</span> {t('diagnosis.positiveSigns', 'Positive Signs')}
                </h3>
                <ul className="space-y-1.5 text-xs text-green-900 font-medium">
                  {d.positiveSigns.map(p => (
                    <li key={p} className="flex gap-2">
                      <span className="text-green-600 font-bold shrink-0">✓</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Supporting Evidence */}
            {d.supportingEvidence && d.supportingEvidence.length > 0 && (
              <Card padding="md" className="border-brown-pastel/30 bg-off-white shadow-sm">
                <h3 className="font-bold text-brown-earth mb-3 flex items-center gap-2">
                  <span className="text-lg">🔍</span> {t('diagnosis.symptoms', 'Supporting Evidence')}
                </h3>
                <ul className="space-y-2">
                  {d.supportingEvidence.map((s: string) => (
                    <li key={s} className="flex gap-3 text-sm text-text-main font-medium bg-white p-2.5 rounded-xl border border-brown-pastel/20">
                      <span className="text-brown-earth shrink-0 mt-0.5">●</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Contradicting Evidence */}
            {d.contradictingEvidence && d.contradictingEvidence.length > 0 && (
              <Card padding="md" className="border-red-200 bg-red-50 shadow-sm">
                <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{t('diagnosis.result.contradicting', 'Contradicting Evidence')}</span>
                </h3>
                <ul className="space-y-2">
                  {d.contradictingEvidence.map((s: string) => (
                    <li key={s} className="flex gap-3 text-sm text-red-900 font-medium bg-white p-2.5 rounded-xl border border-red-200">
                      <span className="text-red-600 shrink-0 mt-0.5">●</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Limitations */}
            {d.limitations && d.limitations.length > 0 && (
              <Card padding="md" className="border-gray-200 bg-gray-50 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-2.5 flex items-center gap-2 text-sm">
                  <span className="text-lg">ℹ️</span> {t('diagnosis.result.limitations', 'Limitations')}
                </h3>
                <ul className="space-y-1.5 text-xs text-gray-700 font-medium">
                  {d.limitations.map((l: string) => (
                    <li key={l} className="flex gap-2">
                      <span className="text-gray-500 font-bold shrink-0">●</span>
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Possible Issues / Alternatives */}
            {((d.alternativeDiagnoses?.length || 0) > 0 || (d.possibleIssues?.length || 0) > 0) && (
              <Card padding="md" className="border-amber-200 bg-amber-50 shadow-sm">
                <h3 className="font-bold text-amber-900 mb-2.5 flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{t('diagnosis.possibleIssues', 'Alternative Diagnoses & Risks')}</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-amber-900 font-medium">
                  {(((d.alternativeDiagnoses?.length || 0) > 0 ? d.alternativeDiagnoses : d.possibleIssues) || []).map((p: string) => (
                    <li key={p} className="flex gap-2">
                      <span className="text-amber-600 font-bold shrink-0">⚠️</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Immediate Actions */}
            {immediateList.length > 0 && (
              <Card padding="md" className="border-orange-200 bg-orange-50 shadow-sm">
                <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2 text-sm">
                  <span className="text-lg">⚡</span> {t('diagnosis.immediateActions', 'Immediate Actions')}
                </h3>
                <ol className="space-y-2">
                  {immediateList.map((a, i) => (
                    <li key={a} className="flex gap-2 text-xs text-orange-900 font-medium">
                      <span className="w-4 h-4 rounded-full bg-orange-200 text-orange-800 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="mt-0.5 leading-relaxed">{a}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            {/* Recommended Treatment Actions */}
            {treatmentList.length > 0 && (
              <Card padding="md" className="border-green-pastel/40 bg-green-pastel/10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-pastel/20 rounded-full blur-[30px]" />
                <div className="relative z-10">
                  <h3 className="font-bold text-green-forest mb-3 flex items-center gap-2">
                    <span className="text-lg">✅</span> {t('diagnosis.recommendedActions', 'Recommended Treatment')}
                  </h3>
                  <ol className="space-y-3">
                    {treatmentList.map((a, i) => (
                      <li key={a} className="flex gap-3 text-sm text-text-main font-medium">
                        <span className="w-6 h-6 rounded-full bg-green-pastel/40 text-green-forest text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                        <span className="mt-0.5 leading-relaxed">{a}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </Card>
            )}

            {/* Prevention Practices Card if present */}
            {d.longTermPrevention && d.longTermPrevention.length > 0 && (
              <Card padding="md" className="border-blue-200 bg-blue-50/40 shadow-sm">
                <h3 className="font-bold text-blue-900 mb-2.5 flex items-center gap-2 text-sm">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{t('diagnosis.longTermPrevention', 'Long-term Prevention Practices')}</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-blue-950 font-medium">
                  {d.longTermPrevention.map(p => (
                    <li key={p} className="flex gap-2">
                      <span className="text-blue-600 font-bold shrink-0">✓</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* When to Recheck */}
            {d.whenToRecheck && (
              <Card padding="md" className="border-purple-200 bg-purple-50 shadow-sm">
                <h3 className="font-bold text-purple-900 mb-1 flex items-center gap-2 text-sm">
                  <span className="text-lg">⏱️</span> {t('diagnosis.whenToRecheck', 'When to Recheck')}
                </h3>
                <p className="text-xs text-purple-900 font-medium ml-7">{d.whenToRecheck}</p>
              </Card>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="primary"
                size="md"
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={handleDiagnoseAnother}
                className="bg-green-forest hover:bg-green-dark text-white font-bold shadow-md flex-1"
              >
                {t('dashboard.actions.diagnose', 'Diagnose Another Crop')}
              </Button>

              <button
                onClick={handleListenAudio}
                className="flex items-center gap-2 text-sm font-bold text-green-forest bg-white border border-green-pastel/50 px-4 py-2.5 rounded-xl hover:bg-green-pastel/20 transition-colors shadow-sm"
              >
                {isPlayingAudio ? <VolumeX className="w-4 h-4 text-amber-600 animate-pulse" /> : <Volume2 className="w-4 h-4 text-green-forest" />}
                <span>{isPlayingAudio ? t('diagnosis.result.stopAudio', 'Stop audio') : t('diagnosis.listen', 'Listen Remedies')}</span>
              </button>
              
              <button
                onClick={() => navigate('/advisor', { state: { diagnosisContext: d } })}
                className="flex items-center gap-2 text-sm font-bold text-white bg-brown-earth px-4 py-2.5 rounded-xl hover:bg-brown-earth/90 transition-colors shadow-sm w-full justify-center"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{t('diagnosis.result.askAI', 'Ask AI Advisor about this')}</span>
              </button>
            </div>

            {/* Agronomic Disclaimer */}
            <p className="text-xs text-text-secondary bg-white p-3 rounded-xl border border-brown-pastel/30 leading-relaxed shadow-sm">
              ⚠️ {t('diagnosis.disclaimer', 'AI diagnosis is informational and should not replace professional agricultural advice. Consult your local agricultural extension officer for confirmed field treatment.')}
            </p>
          </div>
        </div>
      </PageLayout>
    </motion.div>
  )
}

export default DiagnosisResultPage
