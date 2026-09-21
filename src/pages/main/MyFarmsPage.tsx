import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Trash2 } from 'lucide-react'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/index'
import { ProgressBar } from '@/components/ui/index'
import { FarmCardSkeleton } from '@/components/skeletons'
import { useFarm } from '@/store/FarmContext'
import { useTranslation } from 'react-i18next'
import { formatLocalizedNumber, formatLocalizedPercent } from '@/utils/format'
import { weatherService } from '@/services'
import { cropDoctorService } from '@/services/cropDoctorService'
import { satelliteService } from '@/services/satelliteService'
import { calculateFarmHealthScore } from '@/services/healthService'
import type { Farm } from '@/types'

// Dynamic Health Indicator Component for the list view
const FarmHealthIndicator = ({ farm, i18nLanguage, updateFarm }: { farm: Farm; i18nLanguage: string; updateFarm?: (id: string, updates: Partial<Farm>) => void }) => {
  const [score, setScore] = React.useState<number>(farm.healthScore ?? 82)
  
  React.useEffect(() => {
    let isSubscribed = true
    Promise.all([
      // Pass full farm so server uses real lat/lng, not mock coords
      weatherService.getWeather(farm.id, farm).catch(() => null),
      cropDoctorService.getRecentDiagnoses(1, farm.id).then(res => res?.[0] || null).catch(() => null),
      (farm.location?.lat && farm.location?.lng) 
        ? satelliteService.getSatelliteData(farm.id, farm.location.lat, farm.location.lng).catch(() => null)
        : Promise.resolve(null)
    ]).then(([w, d, s]) => {
      if (isSubscribed) {
        const health = calculateFarmHealthScore(farm, d, s, w)
        if (health.score !== score) {
          setScore(health.score)
        }
        // Use updateFarm (setDoc merge) not saveFarm (addDoc) — prevents creating duplicate farms
        if (updateFarm && health.score !== farm.healthScore) {
          updateFarm(farm.id, { healthScore: health.score })
          farmService.updateFarm(farm.id, { healthScore: health.score }).catch(console.error)
        }
      }
    })
    return () => { isSubscribed = false }
  }, [farm.id, farm.location?.lat, farm.location?.lng])

  return (
    <div className="flex items-center gap-2">
      <ProgressBar value={score} color="green" size="sm" />
      <span className="text-xs font-bold text-green-forest shrink-0">{formatLocalizedPercent(score, i18nLanguage)}</span>
    </div>
  )
}
import { farmService } from '@/services'
import { useApp } from '@/store/AppContext'
const MyFarmsPage: React.FC = () => {
  const navigate = useNavigate()
  const { farms, activeFarm, setActiveFarm, updateFarm, loading, error } = useFarm()
  const { t, i18n } = useTranslation()
  const { toast } = useApp()

  const [farmToDelete, setFarmToDelete] = React.useState<Farm | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('')
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  useEffect(() => {
    console.log('🌾 [MyFarmsPage] Rendered. loading:', loading, 'error:', error, 'farms.length:', farms.length);
  }, [loading, error, farms]);

  const handleDeleteFarm = async () => {
    if (!farmToDelete || deleteConfirmText !== 'DELETE') return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await farmService.deleteFarm(farmToDelete.id)
      if (activeFarm?.id === farmToDelete.id) {
        setActiveFarm(farms.find(f => f.id !== farmToDelete.id) || null)
      }
      setFarmToDelete(null)
      setDeleteConfirmText('')
      toast.success(t('farm.deleted', 'Farm deleted successfully'))
    } catch (err: any) {
      console.error('Delete failed:', err)
      setDeleteError(err.message || 'Failed to delete farm. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title={t('nav.myFarm')} action={
        <button onClick={() => navigate('/onboarding/location')} className="w-9 h-9 bg-green-forest rounded-full flex items-center justify-center shadow-button">
          <Plus className="w-5 h-5 text-white" />
        </button>
      } />

      <PageLayout className="pt-4 pb-8 space-y-4">
        <div className="hidden lg:flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t('nav.myFarm', 'My Farms')}</h1>
            <p className="text-sm text-gray-500">{formatLocalizedNumber(t('profile.farmsRegistered', { count: farms.length }), i18n.language)}</p>
          </div>
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/onboarding/location')}>
            {t('farm.addNew')}
          </Button>
        </div>

        <motion.div variants={listVariants} animate="animate" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array(3).fill(0).map((_, i) => <FarmCardSkeleton key={i} />)
          ) : error ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 text-4xl shadow-sm border border-red-100">
                ⚠️
              </div>
              <h3 className="text-xl font-bold text-gray-800">{t('states.error', 'Something went wrong.')}</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-xs">{error}</p>
            </div>
          ) : (
            <>
              {farms.map(farm => (
                <motion.div key={farm.id} variants={cardVariants}>
                  <button
                    onClick={() => { setActiveFarm(farm); navigate(`/farms/${farm.id}`) }}
                    className="w-full text-left"
                  >
                    <Card padding="none" className={`overflow-hidden transition-all hover:shadow-card-lg ${activeFarm?.id === farm.id ? 'ring-2 ring-green-forest' : ''}`}>
                      <div className="relative h-40">
                        <img src={farm.imageUrl} alt={farm.name} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-hero" />
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFarmToDelete(farm);
                            setDeleteConfirmText('');
                            setDeleteError(null);
                          }}
                          className="absolute top-3 right-3 w-8 h-8 bg-white/20 hover:bg-red-500/80 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors shadow-sm z-10"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>

                        {activeFarm?.id === farm.id && (
                          <div className="absolute top-3 left-3">
                            <Badge variant="green" size="sm">{t('farm.details.setActive', 'Active Farm')}</Badge>
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3 right-3">
                          <h3 className="font-bold text-white text-lg leading-tight">{t(`farms.${farm.id}.name`, farm.name)}</h3>
                          <p className="text-white/80 text-xs">{t(`locations.${farm.location.displayName}`, farm.location.displayName)}</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <Badge variant="green" size="sm">🌱 {t(`crops.${farm.primaryCrop}`, farm.primaryCrop)}</Badge>
                          <Badge variant="earth" size="sm">📐 {formatLocalizedNumber(farm.area, i18n.language)} {t('units.acres', 'acres')}</Badge>
                          <Badge variant="gray" size="sm">🌸 {t(`stages.${farm.cropStage}`, farm.cropStage)}</Badge>
                        </div>
                        <FarmHealthIndicator farm={farm} i18nLanguage={i18n.language} updateFarm={updateFarm} />
                        <p className="text-xs text-gray-400 mt-1">{t('farm.health')}</p>
                      </div>
                    </Card>
                  </button>
                </motion.div>
              ))}

              {/* Add farm card */}
              <motion.div variants={cardVariants}>
                <button
                  onClick={() => navigate('/onboarding/location')}
                  className="w-full h-full min-h-[240px] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-green-pastel rounded-2xl text-green-forest hover:border-green-forest hover:bg-green-light/30 transition-all p-6"
                >
                  <div className="w-14 h-14 bg-green-light rounded-full flex items-center justify-center">
                    <Plus className="w-7 h-7" />
                  </div>
                  <p className="font-semibold">{t('farm.addNew')}</p>
                  <p className="text-xs text-gray-400 text-center">{t('farm.addAnotherHint', 'Add another farm to get personalized insights.')}</p>
                </button>
              </motion.div>
            </>
          )}
        </motion.div>
      </PageLayout>

      {/* Delete Confirmation Modal */}
      {farmToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-xl">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 text-xl">
              <Trash2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Delete {farmToDelete.name}?</h2>
            <p className="text-gray-600 mb-6 text-sm">
              This will permanently remove this farm and its associated data. This action cannot be undone.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Type DELETE to confirm</label>
              <input 
                type="text" 
                value={deleteConfirmText} 
                onChange={e => setDeleteConfirmText(e.target.value)} 
                placeholder="DELETE"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-base font-bold text-center uppercase"
              />
              {deleteError && <p className="text-red-500 text-sm mt-2 text-center">{deleteError}</p>}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setFarmToDelete(null)} disabled={isDeleting}>Cancel</Button>
              <Button variant="danger" fullWidth onClick={handleDeleteFarm} disabled={isDeleting || deleteConfirmText !== 'DELETE'}>
                {isDeleting ? 'Deleting...' : 'Delete Farm'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}

export default MyFarmsPage
