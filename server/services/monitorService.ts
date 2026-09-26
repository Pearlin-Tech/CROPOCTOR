/**
 * monitorService.ts — Full Continuous Monitoring Pipeline (Phase 4)
 *
 * This service implements the per-farm monitor loop that runs every hour:
 *   1. Reads all users' farms from Firestore (server-side, uses Firebase Admin)
 *   2. Fetches fresh weather + soil data for each farm
 *   3. Fetches satellite NDVI where available
 *   4. Evaluates alert rules (per-crop thresholds from alertRules.ts)
 *   5. Deduplicates alerts — skips if same alert fired within the cooldown window
 *   6. Writes new alerts to Firestore users/{uid}/notifications
 *   7. Writes a monitor run record to monitorRuns/{runId} for audit / dedup
 *
 * ⚠️  Requires FIREBASE_ADMIN_KEY_BASE64 to be set in environment.
 *     Falls back to a "dry run" summary when the key is not present.
 */

import { getRulesForCrop, type AlertThreshold } from '../config/alertRules.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FarmRecord {
  farmId: string
  userId: string
  name: string
  lat?: number
  lng?: number
  crop: string
  cropStage?: string
  soilType?: string
  lastWeatherSnapshot?: any
}

export interface AlertResult {
  farmId: string
  farmName: string
  userId: string
  alertKey: string        // dedup key: "{farmId}:{metric}"
  metric: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  actionRoute?: string
  firedAt: string
  isNew: boolean          // false → deduplicated (already fired recently)
}

export interface MonitorRunResult {
  runId: string
  startedAt: string
  completedAt: string
  farmsProcessed: number
  alertsEvaluated: number
  alertsFired: number
  alertsDeduplicated: number
  errors: string[]
  dryRun: boolean
}

// ── Alert deduplication window ────────────────────────────────────────────────

/** Same alert won't re-fire within this many hours */
const ALERT_COOLDOWN_HOURS = 6

// ── Firestore admin (lazy-init) ───────────────────────────────────────────────

let _adminDb: any = null

async function getAdminDb() {
  if (_adminDb) return _adminDb

  const adminKeyB64 = process.env.FIREBASE_ADMIN_KEY_BASE64
  if (!adminKeyB64) {
    throw new Error('FIREBASE_ADMIN_KEY_BASE64 is not set — cannot access Firestore as admin')
  }

  try {
    // Dynamic import so the module doesn't hard-fail at startup when key is absent
    const { default: admin } = await import('firebase-admin')
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(Buffer.from(adminKeyB64, 'base64').toString('utf-8'))
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
    }
    _adminDb = admin.firestore()
    return _adminDb
  } catch (err: any) {
    throw new Error(`Firebase Admin init failed: ${err.message}`)
  }
}

// ── Weather fetcher (reuse Open-Meteo) ───────────────────────────────────────

async function fetchWeatherForFarm(lat: number, lng: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code&daily=temperature_2m_max,precipitation_sum,precipitation_probability_max&timezone=auto`
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
  const json = await res.json()
  return {
    tempMax: json.daily?.temperature_2m_max?.[0] ?? json.current?.temperature_2m ?? 30,
    temp: json.current?.temperature_2m ?? 30,
    humidity: json.current?.relative_humidity_2m ?? 60,
    precipitation24h: json.daily?.precipitation_sum?.[0] ?? 0,
    rainProbability: json.daily?.precipitation_probability_max?.[0] ?? 20,
  }
}

async function fetchSoilMoistureForFarm(lat: number, lng: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=soil_moisture_0_to_7cm&timezone=auto`
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) return null
  const json = await res.json()
  const values: number[] = json.hourly?.soil_moisture_0_to_7cm || []
  return values.length > 0 ? values[0] : null
}

// ── Alert evaluation ──────────────────────────────────────────────────────────

interface LiveData {
  tempMax: number
  temp: number
  humidity: number
  precipitation24h: number
  rainProbability: number
  soilMoisture: number | null
  ndviValue?: number
}

function evaluateRules(rules: AlertThreshold[], data: LiveData): AlertThreshold[] {
  const fired: AlertThreshold[] = []

  for (const rule of rules) {
    let currentValue: number | undefined

    switch (rule.metric) {
      case 'temperature_max':       currentValue = data.tempMax;         break
      case 'precipitation_24h':     currentValue = data.precipitation24h; break
      case 'soil_moisture':         currentValue = data.soilMoisture ?? undefined; break
      case 'ndvi_drop_7d':          currentValue = data.ndviValue;       break
      // Complex multi-day rules — approximate with current snapshot
      case 'days_without_rain':
        currentValue = data.rainProbability < 20 ? 8 : 0 // simplified heuristic
        break
      case 'humidity_above_75_days':
        currentValue = data.humidity > 75 ? 6 : 0        // simplified heuristic
        break
      case 'combined_humidity_temp':
        currentValue = data.temp > 25 && data.humidity > 75 ? 1 : 0
        break
      default:
        continue
    }

    if (currentValue === undefined || currentValue === null) continue

    let triggered = false
    switch (rule.operator) {
      case '>':  triggered = currentValue > rule.value;  break
      case '<':  triggered = currentValue < rule.value;  break
      case '>=': triggered = currentValue >= rule.value; break
      case '<=': triggered = currentValue <= rule.value; break
      case '==': triggered = currentValue === rule.value; break
    }

    if (triggered) fired.push(rule)
  }

  return fired
}

// ── Deduplication check ───────────────────────────────────────────────────────

async function isAlertDeduplicated(db: any, userId: string, alertKey: string): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - ALERT_COOLDOWN_HOURS * 60 * 60 * 1000)
    const snap = await db
      .collection('users').doc(userId)
      .collection('notifications')
      .where('alertKey', '==', alertKey)
      .where('createdAt', '>=', cutoff)
      .limit(1)
      .get()
    return !snap.empty
  } catch {
    return false // on error, allow the alert through
  }
}

// ── Write alert notification to Firestore & Send FCM ────────────────────────────

async function writeAlertNotification(db: any, userId: string, alert: AlertResult) {
  const { FieldValue } = await import('firebase-admin/firestore')
  
  // 1. Write to Firestore for in-app history
  await db
    .collection('users').doc(userId)
    .collection('notifications')
    .add({
      type: 'farm_alert',
      title: `${alert.severity === 'critical' ? '🔴' : '⚠️'} Farm Alert — ${alert.farmName}`,
      message: alert.message,
      severity: alert.severity,
      alertKey: alert.alertKey,
      metric: alert.metric,
      farmId: alert.farmId,
      actionRoute: alert.actionRoute || null,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    })

  // 2. Send FCM Push Notification
  try {
    const admin = await import('firebase-admin')
    const tokensSnap = await db.collection('users').doc(userId).collection('fcmTokens').get()
    const tokens = tokensSnap.docs.map((d: any) => d.id)
    
    if (tokens.length > 0) {
      const payload = {
        notification: {
          title: `Farm Alert: ${alert.farmName}`,
          body: alert.message
        },
        data: {
          actionRoute: alert.actionRoute || '',
          farmId: alert.farmId
        },
        tokens
      }
      
      const response = await admin.messaging().sendMulticast(payload)
      
      // Cleanup stale tokens
      const staleTokens: string[] = []
      response.responses.forEach((resp: any, idx: number) => {
        if (!resp.success) {
          const code = resp.error?.code
          if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
            staleTokens.push(tokens[idx])
          }
        }
      })
      
      for (const t of staleTokens) {
        await db.collection('users').doc(userId).collection('fcmTokens').doc(t).delete()
      }
    }
  } catch (err: any) {
    console.error('FCM send error:', err.message)
  }
}

// ── Write monitor run record ───────────────────────────────────────────────────

async function writeMonitorRun(db: any, result: MonitorRunResult) {
  await db.collection('monitorRuns').add({
    ...result,
    startedAt: new Date(result.startedAt),
    completedAt: new Date(result.completedAt),
  })
}

// ── Main monitor function ─────────────────────────────────────────────────────

export async function runFarmMonitor(options: { dryRun?: boolean } = {}): Promise<MonitorRunResult> {
  const runId = `run_${Date.now()}`
  const startedAt = new Date().toISOString()
  const errors: string[] = []
  let farmsProcessed = 0
  let alertsEvaluated = 0
  let alertsFired = 0
  let alertsDeduplicated = 0

  // Dry run mode (no admin key available or explicitly requested)
  const hasFbAdmin = !!process.env.FIREBASE_ADMIN_KEY_BASE64
  const dryRun = options.dryRun || !hasFbAdmin

  let db: any = null
  if (!dryRun) {
    try {
      db = await getAdminDb()
    } catch (err: any) {
      errors.push(`Admin DB init: ${err.message}`)
      return {
        runId, startedAt, completedAt: new Date().toISOString(),
        farmsProcessed: 0, alertsEvaluated: 0, alertsFired: 0, alertsDeduplicated: 0,
        errors, dryRun: true
      }
    }
  }

  // ── Fetch all farms ─────────────────────────────────────────────────────────
  const farms: FarmRecord[] = []

  if (!dryRun) {
    try {
      // Users collection → farms subcollection (collectionGroup query)
      const usersSnap = await db.collection('users').get()
      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id
        const farmsSnap = await userDoc.ref.collection('farms').get()
        for (const farmDoc of farmsSnap.docs) {
          const d = farmDoc.data()
          farms.push({
            farmId: farmDoc.id,
            userId,
            name: d.name || 'Farm',
            lat: d.location?.latitude,
            lng: d.location?.longitude,
            crop: d.crop || 'unknown',
            cropStage: d.stage,
            soilType: d.soilType,
            lastWeatherSnapshot: d.lastWeatherSnapshot,
          })
        }
      }
    } catch (err: any) {
      errors.push(`Failed to read farms: ${err.message}`)
    }
  } else {
    // In dry run mode, emit a synthetic "test" farm so the response is useful
    farms.push({
      farmId: 'dry-run-farm',
      userId: 'dry-run-user',
      name: 'Dry Run Farm',
      lat: 22.2,
      lng: 72.0,
      crop: 'groundnut',
      cropStage: 'vegetative',
    })
  }

  // ── Per-farm evaluation ─────────────────────────────────────────────────────
  for (const farm of farms) {
    farmsProcessed++

    if (!farm.lat || !farm.lng) {
      errors.push(`Farm ${farm.farmId}: missing coordinates — skipped`)
      continue
    }

    // Fetch live data
    let liveData: LiveData = {
      tempMax: 30, temp: 28, humidity: 60,
      precipitation24h: 0, rainProbability: 20,
      soilMoisture: null,
    }

    try {
      const [weather, soil] = await Promise.all([
        fetchWeatherForFarm(farm.lat, farm.lng),
        fetchSoilMoistureForFarm(farm.lat, farm.lng),
      ])
      liveData = { ...weather, soilMoisture: soil }
    } catch (err: any) {
      errors.push(`Farm ${farm.farmId} weather fetch: ${err.message}`)
    }

    // Evaluate rules for this crop
    const cropRules = getRulesForCrop(farm.crop)
    const triggered = evaluateRules(cropRules.rules, liveData)
    alertsEvaluated += cropRules.rules.length

    // Weather change detection (Phase 11)
    if (farm.lastWeatherSnapshot) {
      const prev = farm.lastWeatherSnapshot
      if (prev.temp && liveData.temp && (prev.temp - liveData.temp) > 10) {
        triggered.push({
          metric: 'temp_drop_rapid',
          operator: '>',
          value: 10,
          severity: 'warning',
          message: `Temperature dropped rapidly by over 10°C (from ${prev.temp}°C to ${liveData.temp}°C). Monitor crop stress.`,
          actionRoute: '/weather'
        })
      }
      if (prev.rainProbability < 30 && liveData.rainProbability > 60) {
        triggered.push({
          metric: 'rain_chance_spike',
          operator: '>',
          value: 50,
          severity: 'warning',
          message: `Rain probability spiked to ${liveData.rainProbability}%. Prepare for wet conditions.`,
          actionRoute: '/weather'
        })
      }
    }

    if (!dryRun && db) {
      try {
        await db.collection('users').doc(farm.userId).collection('farms').doc(farm.farmId).update({
          lastWeatherSnapshot: liveData
        })
      } catch (err: any) {
        errors.push(`Farm ${farm.farmId} snapshot update: ${err.message}`)
      }
    }

    // Process each triggered alert
    for (const rule of triggered) {
      const alertKey = `${farm.farmId}:${rule.metric}`
      const alert: AlertResult = {
        farmId: farm.farmId,
        farmName: farm.name,
        userId: farm.userId,
        alertKey,
        metric: rule.metric,
        severity: rule.severity,
        message: rule.message,
        actionRoute: rule.actionRoute,
        firedAt: new Date().toISOString(),
        isNew: true,
      }

      if (!dryRun) {
        // Check deduplication
        const isDup = await isAlertDeduplicated(db, farm.userId, alertKey)
        if (isDup) {
          alertsDeduplicated++
          alert.isNew = false
          continue
        }
        // Write to Firestore
        try {
          await writeAlertNotification(db, farm.userId, alert)
          alertsFired++
        } catch (err: any) {
          errors.push(`Farm ${farm.farmId} write alert: ${err.message}`)
        }
      } else {
        alertsFired++ // count as fired in dry-run mode
      }
    }
  }

  const completedAt = new Date().toISOString()
  const result: MonitorRunResult = {
    runId, startedAt, completedAt,
    farmsProcessed, alertsEvaluated, alertsFired, alertsDeduplicated,
    errors, dryRun,
  }

  // Persist run record (not in dry run)
  if (!dryRun && db) {
    try {
      await writeMonitorRun(db, result)
    } catch (err: any) {
      errors.push(`Failed to write monitor run: ${err.message}`)
    }
  }

  return result
}
