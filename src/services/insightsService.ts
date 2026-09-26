import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db, auth } from './firebase'
import type { FarmInsights, Farm } from '@/types'
import type { IInsightsService } from './index'

export class FirebaseInsightsService implements IInsightsService {
  async getInsights(farmId: string): Promise<FarmInsights> {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')

    try {
      // 1. Fetch Farm Data (contains lastWeatherSnapshot)
      const farmRef = doc(db, 'users', user.uid, 'farms', farmId)
      const farmSnap = await getDoc(farmRef)
      if (!farmSnap.exists()) throw new Error('Farm not found')
      const farmData = farmSnap.data() as Farm & { lastWeatherSnapshot?: any, lastNdviObservation?: any }

      // 2. Fetch Recent Diagnoses
      const diagnosesRef = collection(db, 'users', user.uid, 'diagnoses')
      const q = query(diagnosesRef, orderBy('timestamp', 'desc'), limit(1))
      const diagSnap = await getDocs(q)
      const recentDiagnosis = diagSnap.empty ? null : diagSnap.docs[0].data()

      // --- DYNAMIC CALCULATION ---
      
      // NDVI / Satellite parsing
      const hasRealNdvi = farmData.lastNdviObservation?.ndvi != null
      let ndviVal = hasRealNdvi ? farmData.lastNdviObservation.ndvi : 0.65
      
      // Calculate Crop Health Score (out of 100)
      let cropScore = 80 // Base score
      let factors: string[] = []
      
      if (hasRealNdvi) {
        if (ndviVal > 0.6) { cropScore += 10; factors.push('Excellent vegetation cover'); }
        else if (ndviVal < 0.4) { cropScore -= 20; factors.push('Poor vegetation cover'); }
      } else {
        factors.push('Satellite observation unavailable')
      }

      const weather = farmData.lastWeatherSnapshot
      if (weather) {
        if (weather.soilMoisture !== null) {
           cropScore += 5;
           factors.push(`Soil moisture recorded at ${weather.soilMoisture.toFixed(1)}%`)
        } else {
           factors.push('No direct soil moisture sensor data')
        }
        
        if (weather.precipitation24h > 0) {
           factors.push('Recent rainfall observed')
        }
      }

      if (recentDiagnosis) {
        if (recentDiagnosis.severity === 'healthy') {
          cropScore += 5;
          factors.push('Recent diagnosis: Healthy')
        } else {
          cropScore -= 25;
          factors.push(`Recent diagnosis: ${recentDiagnosis.diseaseName || 'Disease detected'}`)
        }
      } else {
        factors.push('No recent visual disease diagnosis')
      }

      // Bound score 0-100
      cropScore = Math.max(0, Math.min(100, cropScore))

      // Nutrient reality check (Requirement #8)
      const nutrientsLabel = 'Nutrient data unavailable (No soil test found)'
      const soilScore = weather?.soilMoisture ? 70 + (weather.soilMoisture * 10) : 50;

      return {
        cropHealth: {
          score: Math.round(cropScore),
          trend: cropScore > 75 ? 'up' : cropScore < 50 ? 'down' : 'stable',
          factors
        },
        soilHealth: {
          score: Math.round(Math.max(0, Math.min(100, soilScore))),
          moisture: weather?.soilMoisture > 0.4 ? 'wet' : weather?.soilMoisture < 0.2 ? 'dry' : 'optimal',
          nutrients: nutrientsLabel
        },
        ndvi: {
          value: ndviVal,
          label: ndviVal > 0.6 ? 'Good Vegetation' : 'Fair Vegetation',
          isDemo: !hasRealNdvi
        },
        satelliteImageUrl: farmData.lastNdviObservation?.imageUrl || undefined,
        isDemo: false
      }
    } catch (e) {
      console.error('Failed to get real insights, returning fallback:', e)
      return {
        cropHealth: { score: 0, trend: 'stable', factors: ['Data unavailable'] },
        soilHealth: { score: 0, moisture: 'optimal', nutrients: 'Nutrient data unavailable' },
        ndvi: { value: 0, label: 'Unknown', isDemo: true },
        isDemo: true
      }
    }
  }
}
