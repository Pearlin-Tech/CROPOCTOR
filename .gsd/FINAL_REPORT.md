# FINAL_REPORT.md

## What Changed

### Infrastructure
| File | Change | Why |
|------|--------|-----|
| `api/index.ts` | **NEW** — Express-on-Vercel adapter | Unifies all API routes so they run on Vercel serverless AND local dev |
| `vercel.json` | **NEW** — SPA rewrites, function config, cron | Fixes deployment; enables hourly cron job |
| `vite.config.ts` | Updated proxy | Wildcard `/api` proxy covers all routes in dev |
| `.env.example` | **NEW** | Documents all required env vars |
| `.github/workflows/farm-monitor.yml` | **NEW** | Hourly GH Actions cron as Vercel fallback |
| `firestore.rules` | Tightened | Added devices, observations, monitorRuns; explicit deny-all |

### Critical Bug Fixes
| Bug | Root Cause | Fix |
|-----|-----------|-----|
| **BUG-1**: Clicking farm creates new farm | `farmService.saveFarm({ id, healthScore })` calls `addDoc` — always creates new doc | Added `updateFarm(farmId, updates)` using `setDoc(merge:true)` |
| **BUG-2**: Demo weather shown as real | Catch block didn't set `isDemo:true` | Always set `isDemo: true` in error path |
| **BUG-3**: Wrong farm coordinates used | `getWeather(farm.id)` without farm → server used hardcoded Rajkot | Now require `lat`/`lng` query params; server returns 400 if missing |
| **BUG-4**: "Body is disturbed or locked" | `response.json()` then `response.text()` reads stream twice | Read body ONCE as `text()`, then `JSON.parse()` |
| **BUG-5**: Non-plant images accepted | `isPlantImage` flag saved but never caused early exit | Reject immediately with clear user message if `isPlantImage === false` |
| **BUG-6**: Vercel deployment broken | No serverless functions for most routes | `api/index.ts` + `vercel.json` fixes this |

### Features Added
| Feature | Location | Notes |
|---------|----------|-------|
| `/api/health` endpoint | `api/index.ts` | Reports integration status (booleans, no secrets) |
| Farm satellite panel | `FarmDetailPage.tsx` | NDVI value, moisture index, image date, cloud %, radar fallback notice |
| "How calculated?" drawer | `FarmDetailPage.tsx` | Per-factor breakdown with weight, score, source, formula, confidence |
| Weather attribution | `FarmDetailPage.tsx` | Shows source (Open-Meteo / Google) + last updated time |
| Demo badge | `FarmDetailPage.tsx` | Visible badge when weather or satellite data is demo/fallback |
| Refresh button | `FarmDetailPage.tsx` | On-demand re-fetch of all farm data |
| Alert rules config | `server/config/alertRules.ts` | Crop-specific thresholds for NDVI, heat, rain, soil moisture, disease |
| Cron monitor stub | `api/index.ts` `/api/cron/monitor` | Protected endpoint; Phase 4 full implementation next |
| Cleanup script | `scripts/cleanup-junk-farms.mjs` | Dry-run by default; finds/removes junk farms from saveFarm bug |
| Root cleanup | `/scripts/` dir | Moved app.js, catch_error.mjs, etc. from root |
| TypeScript types | `src/types/index.ts` | Added `source` field to `WeatherData` |
| `.env.example` | root | All vars documented with instructions |

## What Is Verified
- `npm run build` exits 0 ✅
- `npx tsc --noEmit` exits 0 (0 type errors) ✅
- BUG-1 root cause confirmed and fixed via `updateFarm` + `setDoc(merge:true)` ✅
- BUG-4 body double-read path eliminated ✅  
- BUG-5 non-plant early rejection implemented ✅
- All API routes accessible via Vercel serverless or local Express ✅

## What Is Still an Estimate or Heuristic

### Health Score Weights
The weights in `healthService.ts` (vegetation vigor 35%, NDVI trend 15%, moisture 20%, weather stress 15%, diagnosis 10%, freshness 5%) are reasonable starting heuristics but **not validated by an agronomist**. They should be tuned with real yield data.

### Alert Rule Thresholds
All thresholds in `server/config/alertRules.ts` are clearly labeled as heuristics. For example:
- NDVI drop >0.10 in 7 days → warning (heuristic)
- Temp >35°C → heat stress for groundnut (from FAOSTAT/ICRISAT literature, not field-validated)
- 5+ days of humidity >75% → leaf spot risk (general guideline)

### Satellite NDVI
Earth Engine Sentinel-2 NDVI is cloud-masked but accuracy depends on cloud cover. The Sentinel-1 radar fallback is labeled when used. NDVI values alone do not diagnose specific diseases — they indicate vegetation vigor.

## What Only You Can Do (BLOCKERS)

See [.gsd/BLOCKERS.md](./BLOCKERS.md) for the full list. Summary:

| Item | Impact if missing |
|------|-----------------|
| Firebase Admin key (`FIREBASE_ADMIN_KEY_BASE64`) | No server-side push notifications (Phase 6) |
| FCM VAPID key (`VITE_FCM_VAPID_KEY`) | No web push (Phase 6) |
| `CRON_SECRET` in Vercel env | Monitor endpoint is unprotected in production |
| `VERCEL_DEPLOYMENT_URL` in GitHub Secrets | GitHub Actions cron can't call the endpoint |
| Earth Engine service account validation | Satellite data falls back to "unavailable" |
| Agronomist review of alert thresholds | Alert rules may trigger incorrectly |

## Remaining Phases (not yet implemented)

| Phase | Description |
|-------|-------------|
| **Phase 4 (full)** | Complete cron monitor: per-farm satellite+weather refresh, alert evaluation, deduplication, Firestore writes, push send |
| **Phase 6** | FCM web push (firebase-messaging-sw.js, token registration, per-farm toggles, quiet hours) |
| **Phase 8** | Browser walkthrough artifacts |

These phases require BLOCKER items above to be resolved first.
