import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Leaf, ChevronRight, CheckCircle2, Sparkles, Bot } from 'lucide-react'
import { pageVariants, listVariants, cardVariants } from '@/animations/variants'
import { PageLayout, MobileHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/index'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/index'
import { useFarm } from '@/store/FarmContext'
import { useApp } from '@/store/AppContext'

interface CropRec {
  id: string
  name: string
  emoji: string
  suitability: number
  reason: string
  season: string
  profitPotential: 'high' | 'medium' | 'low'
  waterNeed: 'low' | 'medium' | 'high'
  tags: string[]
}

const MOCK_RECOMMENDATIONS: CropRec[] = [
  {
    id: 'groundnut',
    name: 'Groundnut',
    emoji: '🥜',
    suitability: 94,
    reason: 'Your loamy soil and Rajkot climate are ideal for groundnut. Excellent market demand and good yield potential in your region.',
    season: 'Kharif (Jun–Oct)',
    profitPotential: 'high',
    waterNeed: 'medium',
    tags: ['Current Crop', 'Best Fit', 'Monsoon'],
  },
  {
    id: 'cotton',
    name: 'Cotton (Bt)',
    emoji: '🌸',
    suitability: 81,
    reason: 'Cotton grows well in well-drained loamy soils. Gujarat is India\'s top cotton producer. Requires adequate sunlight.',
    season: 'Kharif (Jun–Oct)',
    profitPotential: 'high',
    waterNeed: 'medium',
    tags: ['High Value', 'Gujarat Staple'],
  },
  {
    id: 'wheat',
    name: 'Wheat',
    emoji: '🌾',
    suitability: 76,
    reason: 'Good option for Rabi season after groundnut harvest. Well-suited to your soil. Requires good irrigation in winter.',
    season: 'Rabi (Nov–Mar)',
    profitPotential: 'medium',
    waterNeed: 'high',
    tags: ['Rabi Season', 'Post-Groundnut'],
  },
  {
    id: 'castor',
    name: 'Castor',
    emoji: '🌿',
    suitability: 72,
    reason: 'Drought-tolerant crop ideal for Gujarat. Low water requirement and good market. Best for sandy-loam soils.',
    season: 'Kharif/Rabi',
    profitPotential: 'medium',
    waterNeed: 'low',
    tags: ['Drought Tolerant', 'Industrial Crop'],
  },
  {
    id: 'cumin',
    name: 'Cumin (Jeera)',
    emoji: '✨',
    suitability: 65,
    reason: 'High-value spice crop. Rajkot district has strong cumin cultivation history. Requires cool, dry weather.',
    season: 'Rabi (Nov–Feb)',
    profitPotential: 'high',
    waterNeed: 'low',
    tags: ['Spice', 'High Value', 'Rabi'],
  },
]

const profitColors = { high: 'green', medium: 'warning', low: 'gray' } as const
const waterColors  = { low: 'green', medium: 'warning', high: 'danger' } as const

const CropRecommendationPage: React.FC = () => {
  const navigate = useNavigate()
  const { activeFarm } = useFarm()
  const { toast } = useApp()
  const [filter, setFilter] = useState<'all' | 'kharif' | 'rabi'>('all')
  const [selected, setSelected] = useState<string | null>(null)

  const filtered = MOCK_RECOMMENDATIONS.filter(r => {
    if (filter === 'all') return true
    if (filter === 'kharif') return r.season.toLowerCase().includes('kharif')
    return r.season.toLowerCase().includes('rabi')
  })

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="min-h-screen bg-background">
      <MobileHeader title="Crop Recommendation" subtitle="AI picks for your soil & climate" onBack={() => navigate(-1)} />

      <PageLayout className="pt-4 pb-8 space-y-5">
        <div className="hidden lg:block mb-2">
          <h1 className="text-2xl font-bold text-gray-800">Crop Recommendation</h1>
          <p className="text-sm text-gray-500 mt-1">AI-powered crop suggestions based on your soil type, location, and local climate.</p>
        </div>

        {/* Farm context chip */}
        {activeFarm && (
          <div className="flex items-center gap-3 bg-beige-warm border border-brown-soft/20 rounded-2xl px-4 py-3">
            <span className="text-xl">🏡</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-700 text-sm truncate">{activeFarm.name}</p>
              <p className="text-xs text-gray-400">{activeFarm.soilType} soil · {activeFarm.location.displayName}</p>
            </div>
            <Badge variant="earth" size="sm">AI Analyzed</Badge>
          </div>
        )}

        {/* Season filter */}
        <div className="flex gap-2">
          <Chip selected={filter === 'all'}    onClick={() => setFilter('all')}>All Seasons</Chip>
          <Chip selected={filter === 'kharif'} onClick={() => setFilter('kharif')}>Kharif</Chip>
          <Chip selected={filter === 'rabi'}   onClick={() => setFilter('rabi')}>Rabi</Chip>
        </div>

        {/* Recommendations list */}
        <motion.div variants={listVariants} animate="animate" className="space-y-3">
          {filtered.map((rec, i) => (
            <motion.div key={rec.id} variants={cardVariants}>
              <Card
                padding="md"
                className={`cursor-pointer transition-all duration-200 ${selected === rec.id ? 'ring-2 ring-green-forest border-green-forest/30' : 'hover:shadow-card-lg'}`}
                onClick={() => setSelected(selected === rec.id ? null : rec.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-green-light flex items-center justify-center text-2xl shrink-0">
                      {rec.emoji}
                    </div>
                    {i === 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-forest rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">★</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-gray-800">{rec.name}</p>
                      {rec.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant={tag === 'Current Crop' ? 'green' : tag === 'High Value' ? 'earth' : 'gray'} size="sm">{tag}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{rec.season}</p>
                    {/* Suitability bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-green-forest to-green-soft transition-all duration-700"
                          style={{ width: `${rec.suitability}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-green-forest shrink-0">{rec.suitability}% match</span>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {selected === rec.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-gray-100 space-y-3"
                  >
                    <p className="text-sm text-gray-700">{rec.reason}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-off-white rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-1">Profit Potential</p>
                        <Badge variant={profitColors[rec.profitPotential]} size="sm" dot>
                          {rec.profitPotential.charAt(0).toUpperCase() + rec.profitPotential.slice(1)}
                        </Badge>
                      </div>
                      <div className="bg-off-white rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-1">Water Need</p>
                        <Badge variant={waterColors[rec.waterNeed]} size="sm" dot>
                          {rec.waterNeed.charAt(0).toUpperCase() + rec.waterNeed.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); toast.success(`${rec.name} saved to your crop plan.`) }}
                        className="flex-1 py-2 bg-green-light text-green-forest text-sm font-semibold rounded-xl hover:bg-green-pastel/50 transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Save to Plan
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); navigate('/advisor') }}
                        className="flex-1 py-2 bg-beige-warm text-brown-earth text-sm font-semibold rounded-xl hover:bg-brown-soft/20 transition-colors flex items-center justify-center gap-1"
                      >
                        <Bot className="w-3.5 h-3.5" /> Ask AI More
                      </button>
                    </div>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Disclaimer + CTA */}
        <Card variant="flat" padding="sm">
          <div className="flex gap-2">
            <Sparkles className="w-4 h-4 text-green-forest shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500">
              AI recommendations are based on your soil type, location climate, and crop history. Always consult local agricultural extension officers before switching crops.
            </p>
          </div>
        </Card>

        <Button variant="primary" fullWidth onClick={() => navigate('/advisor')} icon={<Bot className="w-4 h-4" />}>
          Ask AI for Custom Advice
        </Button>
      </PageLayout>
    </motion.div>
  )
}

export default CropRecommendationPage
