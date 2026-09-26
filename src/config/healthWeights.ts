/**
 * healthWeights.ts — Tunable weights for the Farm Health Score calculation.
 *
 * These weights control how much each data source contributes to the overall
 * farm health score (0–100). They must sum to ≤ 1.0 — unused slots are
 * renormalized automatically by calculateFarmHealthScore().
 *
 * ⚠️  These are starting heuristics and have NOT been validated by an agronomist.
 *     Tune with real yield data before using in production advisory decisions.
 *
 * Weight semantics:
 *   - diagnosis:   On-the-ground image-based disease/health assessment
 *   - satellite:   Vegetation index (NDVI) from Sentinel-2 / Earth Engine
 *   - weather:     Temperature, humidity, and stress indicators
 *   - farmContext: Baseline score for a registered, managed farm
 */

export interface HealthWeightsConfig {
  /** Weight for image-based crop diagnosis factor (0–1) */
  diagnosis: number
  /** Weight for satellite NDVI factor (0–1) */
  satellite: number
  /** Weight for weather stress factor (0–1) */
  weather: number
  /** Weight for farm context / management baseline (0–1) */
  farmContext: number
}

/**
 * Default weights used by calculateFarmHealthScore().
 * Modify here to globally change the scoring model.
 */
export const DEFAULT_HEALTH_WEIGHTS: HealthWeightsConfig = {
  diagnosis:   0.40, // 40% — most direct signal (image diagnosis)
  satellite:   0.30, // 30% — vegetation index (NDVI) from satellite
  weather:     0.20, // 20% — current weather stress
  farmContext: 0.10, // 10% — baseline for registered / managed farm
}
