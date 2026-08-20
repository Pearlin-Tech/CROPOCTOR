import type { DiagnosisResult } from '@/types'
import { IMAGES } from '@/config/images'

export const MOCK_DIAGNOSIS: DiagnosisResult = {
  id: 'diag-001',
  imageUrl: IMAGES.diagnosis.leafSpot,
  crop: 'Groundnut',
  disease: 'Cercospora Leaf Spot',
  confidence: 87,
  symptoms: [
    'Dark circular spots with yellow halo',
    'Progressive yellowing of leaves',
    'Premature leaf drop',
    'Spots appear first on older leaves',
  ],
  actions: [
    'Inspect nearby plants for early spread',
    'Avoid overhead irrigation',
    'Apply Mancozeb 75% WP at 2.5g/litre',
    'Improve field drainage and air circulation',
    'Remove and destroy heavily infected leaves',
    'Consult an agricultural extension officer',
  ],
  severity: 'moderate',
  isDemo: true,
  timestamp: new Date().toISOString(),
}

export const MOCK_DIAGNOSIS_HISTORY = [
  { id: 'diag-001', disease: 'Leaf Spot', confidence: 87, crop: 'Groundnut', date: '2 days ago', imageUrl: IMAGES.diagnosis.leafSpot },
  { id: 'diag-002', disease: 'Healthy Crop', confidence: 95, crop: 'Cotton', date: '1 week ago', imageUrl: IMAGES.diagnosis.healthyLeaf },
]
