import type { Farm, WeatherData, DiagnosisResult } from '@/types'
import type { NDVIResult } from '@/services/satelliteService'
import { DEFAULT_HEALTH_WEIGHTS, type HealthWeightsConfig } from '@/config/healthWeights'

export interface HealthFactor {
  name: string
  score: number // score out of 100 for this specific factor
  weight: number // proportion of total score (e.g. 0.4 for 40%)
  explanation: string
}

export interface FarmHealth {
  /** null when no real signal is available — never an invented default */
  score: number | null
  status: string
  factors: HealthFactor[]
  calculatedAt: string
}

/**
 * Derives a dynamic health score based on actual available farm signals.
 * Missing signals are excluded from the denominator to avoid penalizing missing data.
 */
export function calculateFarmHealthScore(
  farm?: Farm | null,
  diagnosis?: DiagnosisResult | null,
  satellite?: NDVIResult | null,
  weather?: WeatherData | null,
  weights: HealthWeightsConfig = DEFAULT_HEALTH_WEIGHTS
): FarmHealth {
  const factors: HealthFactor[] = []
  
  // 1. Diagnosis (Max 40%) — only a real diagnosis with a known severity counts
  const usableDiagnosis = diagnosis && diagnosis.severity && diagnosis.severity !== 'unknown' &&
    !(diagnosis.isLegacy && /fallback|insufficient evidence/i.test(diagnosis.disease || ''))
  if (diagnosis && usableDiagnosis) {
    let diagScore = 100
    let explanation = 'Healthy crop condition.'
    
    // Severity mapping
    const severityMap: Record<string, number> = {
      'healthy': 100,
      'mild': 75,
      'moderate': 50,
      'severe': 25
    }

    diagScore = severityMap[diagnosis.severity.toLowerCase()] ?? 50
    
    if (diagnosis.severity !== 'healthy') {
      explanation = `Condition: ${diagnosis.diseaseName || diagnosis.disease} (${diagnosis.severity} severity).`
    }
    
    factors.push({
      name: 'Crop Diagnosis',
      score: diagScore,
      weight: weights.diagnosis,
      explanation
    })
  }
  
  // 2. Satellite / NDVI (Max 30%)
  // Don't use satellite if it's explicitly "Data Unavailable" or error
  if (satellite && satellite.ndvi && satellite.source === 'earth-engine' && typeof satellite.ndvi.value === 'number' && satellite.ndvi.label !== 'Data Unavailable') {
    let satScore = 100
    let explanation = `Excellent vegetation index (NDVI: ${satellite.ndvi.value.toFixed(2)}).`
    const ndviVal = satellite.ndvi.value
    
    if (ndviVal >= 0.7) {
      satScore = 100
    } else if (ndviVal >= 0.5) {
      satScore = 85
      explanation = `Good vegetation index (NDVI: ${satellite.ndvi.value.toFixed(2)}).`
    } else if (ndviVal >= 0.3) {
      satScore = 60
      explanation = `Fair vegetation index (NDVI: ${satellite.ndvi.value.toFixed(2)}).`
    } else {
      satScore = 30
      explanation = `Poor vegetation index (NDVI: ${satellite.ndvi.value.toFixed(2)}).`
    }
    
    factors.push({
      name: 'Satellite NDVI',
      score: satScore,
      weight: weights.satellite,
      explanation
    })
  }
  
  // 3. Weather (Max 20%) — demo/placeholder weather is never scored
  if (weather && !weather.isDemo && typeof weather.temperature === 'number') {
    let weatherScore = 100
    let explanation = 'Favorable weather conditions.'
    
    // Evaluate stress indicators
    const temp = weather.temperature
    const humidity = weather.humidity
    
    // Heat stress
    if (temp > 38) {
      weatherScore -= 30
      explanation = 'High heat stress.'
    } else if (temp > 35) {
      weatherScore -= 15
      explanation = 'Moderate heat stress.'
    }
    
    // Cold stress
    if (temp < 10 && temp >= 5) {
      weatherScore -= 15
      explanation = 'Moderate cold stress.'
    } else if (temp < 5) {
      weatherScore -= 30
      explanation = 'Severe cold/frost risk.'
    }
    
    // Humidity stress (if very hot and very humid -> disease risk)
    if (temp > 25 && humidity > 85) {
      weatherScore -= 20
      explanation = 'High humidity and temperature (elevated disease risk).'
    }
    
    // Ensure weather score is between 0 and 100
    weatherScore = Math.max(0, weatherScore)
    
    factors.push({
      name: 'Weather Stress',
      score: weatherScore,
      weight: weights.weather,
      explanation
    })
  }
  
  // (A registered farm is not evidence of crop health, so there is no "farm context" bonus.)
  void farm

  // If we have literally no data, return a default safe score
  if (factors.length === 0) {
    return {
      score: null,
      status: 'Unknown',
      factors: [],
      calculatedAt: new Date().toISOString()
    }
  }
  
  // Calculate weighted average, normalizing for missing factors
  let totalScore = 0
  let totalWeight = 0
  
  for (const factor of factors) {
    totalScore += factor.score * factor.weight
    totalWeight += factor.weight
  }
  
  // Normalize score to 100 based on available weights
  const finalScore = Math.round((totalScore / totalWeight))
  
  // Determine Status Band
  let status = 'Unknown'
  if (finalScore >= 90) status = 'Excellent'
  else if (finalScore >= 75) status = 'Good'
  else if (finalScore >= 60) status = 'Fair'
  else if (finalScore >= 40) status = 'At Risk'
  else status = 'Critical'
  
  return {
    score: finalScore,
    status,
    factors,
    calculatedAt: new Date().toISOString()
  }
}
