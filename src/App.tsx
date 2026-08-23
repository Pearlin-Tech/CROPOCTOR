import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppProvider } from '@/store/AppContext'
import { UserProvider, useUser } from '@/store/UserContext'
import { FarmProvider } from '@/store/FarmContext'
import { FarmSetupProvider } from '@/store/FarmSetupContext'
import { PageSkeleton } from '@/components/skeletons'
import '@/locales/i18n'

const Fallback = () => <div className="min-h-screen bg-background flex items-center justify-center"><PageSkeleton /></div>

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isAuthLoading } = useUser()
  if (isAuthLoading) return <Fallback />
  if (!isAuthenticated) return <Navigate to="/welcome" replace />
  return <>{children}</>
}

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────
const SplashPage          = lazy(() => import('@/pages/onboarding/SplashPage'))
const WelcomePage         = lazy(() => import('@/pages/onboarding/WelcomePage'))
const LanguagePage        = lazy(() => import('@/pages/onboarding/LanguagePage'))
const CountryPage         = lazy(() => import('@/pages/onboarding/CountryPage'))
const LoginPage           = lazy(() => import('@/pages/onboarding/LoginPage'))
const SignUpPage           = lazy(() => import('@/pages/onboarding/SignUpPage'))
const FarmerProfilePage   = lazy(() => import('@/pages/onboarding/FarmerProfilePage'))
const FarmLocationPage    = lazy(() => import('@/pages/onboarding/FarmLocationPage'))
const FarmBoundaryPage    = lazy(() => import('@/pages/onboarding/FarmBoundaryPage'))
const FarmDetailsPage     = lazy(() => import('@/pages/onboarding/FarmDetailsPage'))
const CropSelectionPage   = lazy(() => import('@/pages/onboarding/CropSelectionPage'))
const SoilSelectionPage   = lazy(() => import('@/pages/onboarding/SoilSelectionPage'))
const CropStagePage       = lazy(() => import('@/pages/onboarding/CropStagePage'))
const SetupCompletePage   = lazy(() => import('@/pages/onboarding/SetupCompletePage'))

const HomePage              = lazy(() => import('@/pages/main/HomePage'))
const AIAdvisorPage         = lazy(() => import('@/pages/main/AIAdvisorPage'))
const VoicePage             = lazy(() => import('@/pages/main/VoicePage'))
const CropDoctorPage        = lazy(() => import('@/pages/main/CropDoctorPage'))
const ImageAnalysisPage     = lazy(() => import('@/pages/main/ImageAnalysisPage'))
const DiagnosisResultPage   = lazy(() => import('@/pages/main/DiagnosisResultPage'))
const WeatherPage           = lazy(() => import('@/pages/main/WeatherPage'))
const InsightsPage          = lazy(() => import('@/pages/main/InsightsPage'))
const NextBestActionPage    = lazy(() => import('@/pages/main/NextBestActionPage'))
const CropRecommendationPage= lazy(() => import('@/pages/main/CropRecommendationPage'))
const IrrigationPage        = lazy(() => import('@/pages/main/IrrigationPage'))
const MyFarmsPage           = lazy(() => import('@/pages/main/MyFarmsPage'))
const FarmDetailPage        = lazy(() => import('@/pages/main/FarmDetailPage'))
const FarmHistoryPage       = lazy(() => import('@/pages/main/FarmHistoryPage'))
const NotificationsPage     = lazy(() => import('@/pages/main/NotificationsPage'))
const ProfilePage           = lazy(() => import('@/pages/main/ProfilePage'))
const SettingsPage          = lazy(() => import('@/pages/main/SettingsPage'))
const LanguageSettingsPage  = lazy(() => import('@/pages/main/LanguageSettingsPage'))
const VoiceSettingsPage     = lazy(() => import('@/pages/main/VoiceSettingsPage'))
const HelpPage              = lazy(() => import('@/pages/main/HelpPage'))
const AboutPage             = lazy(() => import('@/pages/main/AboutPage'))
const HistoryPage           = lazy(() => import('@/pages/main/FarmHistoryPage'))



const App: React.FC = () => (
  <ErrorBoundary>
    <AppProvider>
      <UserProvider>
        <FarmProvider>
          <FarmSetupProvider>
          <BrowserRouter>
            <Suspense fallback={<Fallback />}>
              <Routes>
                {/* Onboarding (no nav shell) */}
                <Route path="/splash"   element={<SplashPage />} />
                <Route path="/welcome"  element={<WelcomePage />} />
                <Route path="/language" element={<LanguagePage />} />
                <Route path="/country"  element={<CountryPage />} />
                <Route path="/login"    element={<LoginPage />} />
                <Route path="/signup"   element={<SignUpPage />} />
                <Route path="/onboarding">
                  <Route path="profile"      element={<FarmerProfilePage />} />
                  <Route path="location"     element={<FarmLocationPage />} />
                  <Route path="boundary"     element={<FarmBoundaryPage />} />
                  <Route path="farm-details" element={<FarmDetailsPage />} />
                  <Route path="crop"         element={<CropSelectionPage />} />
                  <Route path="soil"         element={<SoilSelectionPage />} />
                  <Route path="stage"        element={<CropStagePage />} />
                  <Route path="complete"     element={<SetupCompletePage />} />
                </Route>

                {/* Main App (with nav shell) */}
                <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                  <Route path="/home"       element={<HomePage />} />
                  <Route path="/advisor"    element={<AIAdvisorPage />} />
                  <Route path="/voice"      element={<VoicePage />} />
                  <Route path="/diagnose"   element={<CropDoctorPage />} />
                  <Route path="/image-analysis" element={<ImageAnalysisPage />} />
                  <Route path="/diagnosis-result" element={<DiagnosisResultPage />} />
                  <Route path="/weather"    element={<WeatherPage />} />
                  <Route path="/insights"   element={<InsightsPage />} />
                  <Route path="/next-action" element={<NextBestActionPage />} />
                  <Route path="/crop-recommendation" element={<CropRecommendationPage />} />
                  <Route path="/irrigation" element={<IrrigationPage />} />
                  <Route path="/farms"      element={<MyFarmsPage />} />
                  <Route path="/farms/:id"  element={<FarmDetailPage />} />
                  <Route path="/history"    element={<HistoryPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/profile"    element={<ProfilePage />} />
                  <Route path="/settings"   element={<SettingsPage />} />
                  <Route path="/settings/language" element={<LanguageSettingsPage />} />
                  <Route path="/settings/voice"    element={<VoiceSettingsPage />} />
                  <Route path="/help"       element={<HelpPage />} />
                  <Route path="/about"      element={<AboutPage />} />
                </Route>

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/splash" replace />} />
                <Route path="*" element={<Navigate to="/home" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          </FarmSetupProvider>
        </FarmProvider>
      </UserProvider>
    </AppProvider>
  </ErrorBoundary>
)

export default App
