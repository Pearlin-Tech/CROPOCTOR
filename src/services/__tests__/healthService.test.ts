/**
 * healthService.test.ts — Unit tests for calculateFarmHealthScore (P5.4)
 *
 * Run with: npx tsx --test src/services/__tests__/healthService.test.ts
 * (Node built-in test runner via tsx)
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculateFarmHealthScore } from '../healthService.js'
import type { Farm } from '../../types/index.js'

// ── Minimal stubs ─────────────────────────────────────────────────────────────

const mockFarm: Farm = {
  id: 'farm-1',
  farmerId: 'user-1',
  name: 'Test Farm',
  location: { lat: 22.0, lng: 72.0, displayName: 'Test', country: 'IN' },
  area: 5,
  areaUnit: 'acres',
  primaryCrop: 'Groundnut',
  soilType: 'Black',
  cropStage: 'Vegetative',
  healthScore: 80,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  imageUrl: '',
}

const healthyDiagnosis = {
  id: 'd1',
  farmId: 'farm-1',
  imageUrl: '',
  diseaseName: 'Healthy',
  disease: 'Healthy',
  severity: 'healthy' as const,
  confidence: 0.9,
  recommendations: [],
  isPlantImage: true,
  createdAt: new Date().toISOString(),
}

const mildDiagnosis = { ...healthyDiagnosis, severity: 'mild' as const, diseaseName: 'Leaf Spot' }
const severeDiagnosis = { ...healthyDiagnosis, severity: 'severe' as const, diseaseName: 'Blight' }

const goodSatellite = {
  farmId: 'farm-1',
  ndvi: { value: 0.65, label: 'Good Vegetation' },
  satelliteImageUrl: '',
  source: 'earth-engine',
}

const poorSatellite = {
  farmId: 'farm-1',
  ndvi: { value: 0.15, label: 'Poor Vegetation' },
  satelliteImageUrl: '',
  source: 'earth-engine',
}

const errorSatellite = {
  farmId: 'farm-1',
  ndvi: { value: 0, label: 'Data Unavailable' },
  satelliteImageUrl: '',
  source: 'error',
}

const coolWeather = {
  temperature: 28,
  humidity: 60,
  rainChance: 20,
  windSpeed: 10,
  description: 'Clear',
  isDemo: false,
}

const hotWeather = {
  temperature: 39,
  humidity: 70,
  rainChance: 10,
  windSpeed: 8,
  description: 'Sunny',
  isDemo: false,
}

const humidHotWeather = {
  temperature: 30,
  humidity: 90,
  rainChance: 50,
  windSpeed: 5,
  description: 'Humid',
  isDemo: false,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('calculateFarmHealthScore', () => {
  it('returns default score when no data is provided', () => {
    const result = calculateFarmHealthScore()
    assert.equal(result.score, 82)
    assert.equal(result.status, 'Unknown')
    assert.equal(result.factors.length, 0)
  })

  it('returns Excellent status for healthy diagnosis only', () => {
    const result = calculateFarmHealthScore(null, healthyDiagnosis)
    assert.equal(result.factors.length, 1)
    assert.equal(result.factors[0].name, 'Crop Diagnosis')
    assert.equal(result.factors[0].score, 100)
    assert.ok(result.score >= 90, `Expected score >= 90, got ${result.score}`)
    assert.equal(result.status, 'Excellent')
  })

  it('reduces score for mild diagnosis', () => {
    const result = calculateFarmHealthScore(null, mildDiagnosis)
    assert.equal(result.factors[0].score, 75)
    assert.ok(result.score < 100)
  })

  it('reduces score significantly for severe diagnosis', () => {
    const result = calculateFarmHealthScore(null, severeDiagnosis)
    assert.equal(result.factors[0].score, 25)
    assert.ok(result.score <= 40, `Expected score <= 40, got ${result.score}`)
    assert.equal(result.status, 'At Risk')
  })

  it('adds Satellite NDVI factor for good satellite data', () => {
    const result = calculateFarmHealthScore(null, null, goodSatellite as any)
    assert.equal(result.factors.length, 1)
    assert.equal(result.factors[0].name, 'Satellite NDVI')
    assert.equal(result.factors[0].score, 85)
  })

  it('adds poor NDVI factor for low NDVI value', () => {
    const result = calculateFarmHealthScore(null, null, poorSatellite as any)
    assert.equal(result.factors[0].score, 30)
  })

  it('excludes error satellite from score calculation', () => {
    const result = calculateFarmHealthScore(null, null, errorSatellite as any)
    // Error satellite should be excluded — no satellite factor
    assert.equal(result.factors.length, 0)
    assert.equal(result.score, 82) // fallback default
  })

  it('adds Weather factor with good weather', () => {
    const result = calculateFarmHealthScore(null, null, null, coolWeather as any)
    assert.equal(result.factors.length, 1)
    assert.equal(result.factors[0].name, 'Weather Stress')
    assert.equal(result.factors[0].score, 100)
  })

  it('penalizes score for high heat', () => {
    const result = calculateFarmHealthScore(null, null, null, hotWeather as any)
    const wx = result.factors[0]
    assert.ok(wx.score < 100, `Expected weather score < 100, got ${wx.score}`)
    assert.ok(wx.score <= 70, `Expected weather score <= 70 for heat >38°C, got ${wx.score}`)
  })

  it('penalizes for high humidity + high temp (disease risk)', () => {
    const result = calculateFarmHealthScore(null, null, null, humidHotWeather as any)
    const wx = result.factors[0]
    assert.ok(wx.score <= 80, `Expected score <= 80, got ${wx.score}`)
  })

  it('combines all factors and normalizes correctly', () => {
    const result = calculateFarmHealthScore(mockFarm, healthyDiagnosis, goodSatellite as any, coolWeather as any)
    assert.equal(result.factors.length, 4)
    // Total weights = 0.4 + 0.3 + 0.2 + 0.1 = 1.0, all scores high → score should be high
    assert.ok(result.score >= 85, `Expected score >= 85, got ${result.score}`)
  })

  it('renormalizes when some factors are missing', () => {
    // Only diagnosis (0.4 weight) present — renormalize to 100%
    const resultAll = calculateFarmHealthScore(null, healthyDiagnosis)
    const resultFull = calculateFarmHealthScore(mockFarm, healthyDiagnosis, goodSatellite as any, coolWeather as any)
    // Both should have high scores, diagnosis-only should effectively be 100 score normalized
    assert.ok(resultAll.score >= 90)
    assert.ok(resultFull.score >= 85)
  })

  it('respects custom weights override', () => {
    const customWeights = { diagnosis: 0.8, satellite: 0.1, weather: 0.05, farmContext: 0.05 }
    // Severe diagnosis dominates with 80% weight
    const result = calculateFarmHealthScore(mockFarm, severeDiagnosis, goodSatellite as any, coolWeather as any, customWeights)
    // Severe = 25 × 0.8 = 20 pts dominant, should be low overall
    assert.ok(result.score <= 50, `Expected score <= 50 with custom weights + severe diag, got ${result.score}`)
  })

  it('calculatedAt is a valid ISO timestamp', () => {
    const result = calculateFarmHealthScore()
    assert.doesNotThrow(() => new Date(result.calculatedAt))
    assert.ok(new Date(result.calculatedAt).getTime() > 0)
  })
})

console.log('✅ healthService unit tests file loaded — run with: npx tsx --test src/services/__tests__/healthService.test.ts')
