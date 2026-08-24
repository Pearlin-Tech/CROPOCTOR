import type { FarmInsights } from '@/types'
import { IMAGES } from '@/config/images'

export const MOCK_INSIGHTS: FarmInsights = {
  cropHealth: {
    score: 82,
    trend: 'up',
    factors: [
      'Optimal soil moisture',
      'Adequate nutrient levels',
      'No confirmed disease',
      'Good canopy development',
    ],
  },
  soilHealth: {
    score: 76,
    moisture: 'optimal',
    nutrients: 'Nitrogen adequate, Phosphorus moderate, Potassium good',
  },
  ndvi: {
    value: 0.72,
    label: 'Good Vegetation',
    isDemo: true,
  },
  satelliteImageUrl: IMAGES.farms.satellite,
  isDemo: true,
}

export const MOCK_NEXT_BEST_ACTIONS = [
  {
    id: 'action-001',
    timeframe: 'today',
    label: 'TODAY',
    title: 'Check soil moisture before deciding on irrigation.',
    priority: 'high',
    reason: 'Heavy rain expected tomorrow. Avoid over-irrigation.',
    benefit: 'Prevents waterlogging and root disease at flowering stage.',
  },
  {
    id: 'action-002',
    timeframe: 'this-week',
    label: 'THIS WEEK',
    title: 'Monitor lower leaves for early disease signs.',
    priority: 'medium',
    reason: 'Elevated humidity increases risk of Cercospora Leaf Spot.',
    benefit: 'Early detection reduces treatment cost by up to 60%.',
  },
  {
    id: 'action-003',
    timeframe: 'watch',
    label: 'WATCH FOR',
    title: 'Heavy rainfall and potential waterlogging in low areas.',
    priority: 'medium',
    reason: 'Weather forecast shows 35–50mm rain over 2 days.',
    benefit: 'Preparing drainage channels now prevents crop loss.',
  },
]
