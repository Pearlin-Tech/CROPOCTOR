# CHANGELOG.md

## Phase 0 — Audit (completed)
- Mapped all routes, pages, Firestore collections, env vars, and API endpoints
- Identified 6 confirmed bugs (BUG-1 through BUG-6)
- Documented all findings in docs/AUDIT.md

## Phase 1 — Unblock Deployment (completed)
### P1.1 — @rolldown/binding-darwin-arm64 removed
- Already removed by user prior session. Confirmed absent from package.json.

### P1.2 — Created /api/index.ts (Express on Vercel adapter)
- Unified all server routes into a single Express app exported as default
- Same file powers local dev (`npm run server`) and Vercel serverless (`/api/*`)
- Added `/api/health` endpoint returning integration status (booleans only, no secrets)
- Added `/api/cron/monitor` stub endpoint (full implementation in Phase 4)
- Weather endpoint now requires `lat` and `lng` query params (no more hardcoded Rajkot)
- Server-side weather cache unchanged (10min TTL keyed by lat/lng/crop)

### P1.3 — Created vercel.json
- SPA rewrite: all non-API paths → /index.html
- /api/* → /api/index.ts serverless function
- maxDuration: 30 seconds (covers Gemini + EE calls)
- Cron job: POST /api/cron/monitor every hour
- CORS headers for /api/* routes

### P1.4 — Updated vite.config.ts proxy
- Changed from per-route proxies to wildcard `/api` proxy
- All /api/* calls in dev now route to localhost:3001

### P1.5 — Created .env.example
- Documents all required and optional environment variables with descriptions
- Notes which vars are public (VITE_*) vs server-only

## Phase 2 — Bug Fixes (completed)

### BUG-1 FIX — "Clicking a farm creates a new farm"
- **Root cause**: `farmService.saveFarm({ id, healthScore })` called `addDoc` (always creates new doc)
- **Fix 1**: Added `updateFarm(farmId, updates)` to `IFarmService` interface
- **Fix 2**: Implemented `updateFarm` in `FirebaseFarmService` using `setDoc(ref, updates, { merge: true })`
  — only updates specified fields, never creates a new document
- **Fix 3**: Added `updateFarm` no-op stub to `MockFarmService`
- **Fix 4**: Changed `MyFarmsPage.tsx` `FarmHealthIndicator` to call `farmService.updateFarm()` instead of `farmService.saveFarm()`

### BUG-2+3 FIX — Demo data shown without badge + wrong farm location
- **Root cause 2**: Weather API error fallback didn't set `isDemo: true`, so fake data showed as real
- **Root cause 3**: `getWeather(farm.id)` without farm object → server used hardcoded Rajkot coords
- **Fix 1**: `ApiWeatherService.getWeather()` now returns `isDemo: true` immediately if no lat/lng provided
- **Fix 2**: Catch block always sets `isDemo: true` so UI shows the "Demo Data" badge
- **Fix 3**: Frontend always passes full `farm` object to `getWeather(farm.id, farm)` in all health components
- **Fix 4**: Server `/api/weather` now returns `400` if lat/lng not provided (no more silent Rajkot fallback)

### BUG-4 FIX — "Body is disturbed or locked" (Diagnose page)
- **Root cause**: `response.json()` was tried first in error case; if it failed, `response.text()` tried to read the same (already-consumed) stream
- **Fix**: Read response body ONCE as `response.text()`, then try `JSON.parse()` on the string
  — This guarantees the stream is read exactly once in all code paths

### BUG-5 FIX — Non-plant images accepted silently
- **Root cause**: `isPlantImage === false` was stored in the record but never caused early rejection
- **Fix**: After API response parsed, if `isPlantImage === false`, immediately `return { success: false, error: "This doesn't appear to be a plant..." }` with a clear user message — before touching Firestore

### WeatherData type update
- Added optional `source` field to `WeatherData` interface for displaying provenance in the UI

## Phase 7 — Cleanup + Security (partial, completed)

### Root clutter removed
- Moved to /scripts/: app.js (as app-legacy.js), catch_error.mjs, check_logs.mjs, recover.py, test-firestore.js, satellite_test.json, satellite_test_2.json
- Deleted originals from root

### Firestore rules tightened
- Added `devices/{deviceId}` subcollection (for FCM tokens, Phase 6)
- Added `observations/{observationId}` subcollection (server-write-only, Phase 3)
- Added `monitorRuns/{runId}` collection (server-write-only, Phase 4)
- Added explicit deny-all fallback `match /{document=**}`

### Cleanup script created
- `/scripts/cleanup-junk-farms.mjs` — finds and optionally removes "New Farm / 0 acres / Unknown Crop" documents
- Supports `--dry-run` (default) and `--delete` modes
- Shows full table of what would be deleted before committing

## Open Items (Phases 3-8)
- Phase 3: FarmDetailPage satellite data display (NDVI, moisture, date, source)
- Phase 4: Full cron monitor implementation (alert rules, deduplication, push)
- Phase 5: Transparent health score with "How calculated?" drawer
- Phase 6: FCM web push notifications
- Phase 8: Browser walkthrough + FINAL_REPORT.md
