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

