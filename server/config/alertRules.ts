/**
 * Alert Rules Config — CROPOCTOR
 * 
 * These thresholds are crop-specific heuristics for groundnut (peanut).
 * They MUST be validated by a licensed agronomist before being used
 * to make production decisions. Values are based on general agronomy
 * literature and should be treated as starting points only.
 * 
 * Sources:
 * - NDVI crop-stage guidelines: ICRISAT groundnut agronomy manuals
 * - Heat stress threshold: >35°C for groundnut (FAOSTAT)
 * - Heavy rain threshold: >25mm/24h for flood/waterlogging risk
 * - Disease risk: Leaf Spot requires >7 days at >75% RH
 */

export interface AlertThreshold {
  metric: string
  operator: '>' | '<' | '>=' | '<=' | '=='
  value: number
  severity: 'info' | 'warning' | 'critical'
  message: string
  actionRoute?: string
}

export interface CropAlertRules {
  cropId: string
  cropName: string
  /** Expected NDVI range at each crop stage [min, max] */
  ndviExpectedByStage: Record<string, [number, number]>
  /** Alert rules evaluated against current data */
  rules: AlertThreshold[]
  /** Days after sowing at which each stage typically occurs */
  stageDayRanges: Record<string, [number, number]>
}

export const GROUNDNUT_RULES: CropAlertRules = {
  cropId: 'groundnut',
  cropName: 'Groundnut (Peanut)',
  stageDayRanges: {
    seedling:   [0, 20],
    vegetative: [21, 45],
    flowering:  [46, 75],
    pegging:    [76, 95],
    pod_filling: [96, 120],
    maturity:   [121, 140],
  },
  ndviExpectedByStage: {
    seedling:   [0.10, 0.30],
    vegetative: [0.30, 0.55],
    flowering:  [0.55, 0.75],
    pegging:    [0.60, 0.80],
    pod_filling: [0.50, 0.70],
    maturity:   [0.25, 0.50],
  },
  rules: [
    // ── Vegetation stress ───────────────────────────────────────────────────
    {
      metric: 'ndvi_drop_7d',
      operator: '<',
      value: -0.10,
      severity: 'warning',
      message: 'NDVI dropped more than 0.10 in 7 days — possible stress, pest damage, or disease.',
      actionRoute: '/diagnose'
    },
    {
      metric: 'ndvi_below_stage_min',
      operator: '<',
      value: 0,
      severity: 'warning',
      message: 'NDVI is below the expected range for this crop stage. Vegetation may be stressed.',
      actionRoute: '/advisor'
    },

    // ── Heat stress ─────────────────────────────────────────────────────────
    {
      metric: 'temperature_max',
      operator: '>',
      value: 35,
      severity: 'warning',
      message: 'Heat stress alert: max temperature exceeds 35°C. Groundnut yield may be impacted. Consider shade nets or supplemental irrigation.',
      actionRoute: '/irrigation'
    },
    {
      metric: 'temperature_max',
      operator: '>',
      value: 40,
      severity: 'critical',
      message: 'Severe heat: temperature above 40°C. Immediate irrigation and protection measures needed.',
      actionRoute: '/irrigation'
    },

    // ── Heavy rain / waterlogging ────────────────────────────────────────────
    {
      metric: 'precipitation_24h',
      operator: '>',
      value: 25,
      severity: 'warning',
      message: 'Heavy rain forecast (>25mm in 24h). Risk of waterlogging and pod rot. Avoid field operations.',
      actionRoute: '/weather'
    },
    {
      metric: 'precipitation_24h',
      operator: '>',
      value: 50,
      severity: 'critical',
      message: 'Extreme rain event (>50mm in 24h). High waterlogging risk. Check drainage immediately.',
      actionRoute: '/weather'
    },

    // ── Dry spell / irrigation need ──────────────────────────────────────────
    {
      metric: 'soil_moisture',
      operator: '<',
      value: 0.12,
      severity: 'warning',
      message: 'Soil moisture critically low (<0.12 m³/m³). Irrigation recommended within 24h.',
      actionRoute: '/irrigation'
    },
    {
      metric: 'days_without_rain',
      operator: '>',
      value: 7,
      severity: 'warning',
      message: 'No significant rain in the last 7 days. Monitor soil moisture and consider irrigation.',
      actionRoute: '/irrigation'
    },

    // ── Disease risk ─────────────────────────────────────────────────────────
    {
      metric: 'humidity_above_75_days',
      operator: '>=',
      value: 5,
      severity: 'warning',
      message: 'High humidity sustained for 5+ days — elevated risk of early/late leaf spot and stem rot.',
      actionRoute: '/diagnose'
    },
    {
      metric: 'combined_humidity_temp',
      operator: '>=',
      value: 1,
      severity: 'warning',
      message: 'Warm and humid conditions. Disease risk elevated. Scout for symptoms within 48h.',
      actionRoute: '/diagnose'
    },

    // ── Stale data ───────────────────────────────────────────────────────────
    {
      metric: 'satellite_data_age_days',
      operator: '>',
      value: 21,
      severity: 'info',
      message: 'Satellite data is over 3 weeks old. Cloud cover may be preventing fresh observations.',
    },
  ]
}

// Default rules for unknown crops
export const DEFAULT_RULES: CropAlertRules = {
  cropId: 'default',
  cropName: 'General Crop',
  stageDayRanges: {
    seedling:   [0, 30],
    vegetative: [31, 60],
    flowering:  [61, 90],
    maturity:   [91, 120],
  },
  ndviExpectedByStage: {
    seedling:   [0.10, 0.35],
    vegetative: [0.35, 0.65],
    flowering:  [0.55, 0.80],
    maturity:   [0.30, 0.60],
  },
  rules: GROUNDNUT_RULES.rules // Reuse groundnut rules as sensible defaults
}

export function getRulesForCrop(cropId: string): CropAlertRules {
  const normalized = (cropId || '').toLowerCase().trim()
  if (normalized.includes('groundnut') || normalized.includes('peanut')) return GROUNDNUT_RULES
  return DEFAULT_RULES
}
