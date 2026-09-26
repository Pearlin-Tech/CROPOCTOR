# PLAN.md — CROPOCTOR Full Rebuild Plan

## PHASE 0 — AUDIT
- [x] P0.1: Map codebase (routes, pages, data layer, env vars)
- [x] P0.2: Identify root cause of "clicking creates farm" bug (D-9: saveFarm calls addDoc always)
- [x] P0.3: Identify root cause of demo data (D-5: catch returns MOCK_WEATHER silently)
- [x] P0.4: Write docs/AUDIT.md

## PHASE 1 — UNBLOCK DEPLOYMENT
- [x] P1.1: Confirm @rolldown removed from package.json (already done)
- [x] P1.2: Create /api/index.ts — Express app adapter for Vercel
- [x] P1.3: Add /api/health endpoint
- [x] P1.4: Create vercel.json (SPA rewrites, function config)
- [x] P1.5: Add missing proxy routes to vite.config.ts (voice, satellite)
- [x] P1.6: Gate: `npm run build` exits 0 ✅

## PHASE 2 — BUG FIXES
- [x] P2.1: Create shared apiClient.ts (single body read, typed errors, timeout)
- [x] P2.2: Fix "clicking farm creates new farm" — add updateFarm to IFarmService + FirebaseFarmService
- [x] P2.3: Fix MyFarmsPage.tsx saveFarm call → use updateFarm
- [x] P2.4: Fix FarmHealthIndicator not calling updateFarm correctly
- [x] P2.5: Fix weather always returning demo data — show isDemo banner, pass farm lat/lng
- [x] P2.6: Fix diagnose validation — is_plant check, reject non-plant with clear message
- [x] P2.7: Gate: `npm run build` exits 0 ✅

## PHASE 3 — FARM PROFILE + SATELLITE DATA
- [x] P3.1: Add updateFarm to IFarmService interface
- [x] P3.2: Implement updateFarm in FirebaseFarmService (setDoc merge)
- [x] P3.3: Expose updateFarm from FarmContext
- [x] P3.4: Enhance FarmDetailPage with satellite data display (NDVI, moisture, date, source)
- [x] P3.5: Add /api/health endpoint
- [x] P3.6: Gate: FarmDetailPage shows real satellite values with source+date ✅

## PHASE 4 — CONTINUOUS MONITORING PIPELINE
- [x] P4.1: Create /server/services/monitorService.ts (per-farm weather/alert eval, dedup, Firestore writes)
- [x] P4.2: Create alert rules config file (crop-specific heuristics)
- [x] P4.3: Add vercel.json cron entry
- [x] P4.4: Add GitHub Actions fallback workflow
- [x] P4.5: Gate: deduplication via 6-hour cooldown window + alertKey field ✅

## PHASE 5 — TRANSPARENT HEALTH SCORE
- [x] P5.1: Extract tunable weights config → src/config/healthWeights.ts
- [x] P5.2: Add "How is this calculated?" drawer to FarmDetailPage
- [x] P5.3: Show confidence indicator
- [x] P5.4: Gate: unit tests for score function (src/services/__tests__/healthService.test.ts) ✅

## PHASE 6 — NOTIFICATIONS
- [ ] P6.1: Install firebase-admin — BLOCKER: FIREBASE_ADMIN_KEY_BASE64 required
- [ ] P6.2: Create firebase-messaging-sw.js for PWA — BLOCKER: VITE_FCM_VAPID_KEY required
- [ ] P6.3: Add FCM token registration (click-triggered only) — BLOCKER: keys required
- [ ] P6.4: Store tokens in users/{uid}/devices
- [ ] P6.5: Add per-type/per-farm settings
- [ ] P6.6: Gate: browser subagent verifies notification flow

## PHASE 7 — CLEANUP + SECURITY
- [x] P7.1: Move useful root scripts to /scripts/
- [x] P7.2: Delete: catch_error.mjs, check_logs.mjs, recover.py, test-firestore.js, satellite_test*.json
- [x] P7.3: Tighten firestore.rules (devices subcollection, observations subcollection)
- [x] P7.4: Add rate limiting middleware (100 req/min per IP, in api/index.ts)
- [x] P7.5: Add .env.example
- [x] P7.6: Gate: `npm run build` exits 0 + security scan ✅

## PHASE 8 — FINAL VERIFICATION
- [x] P8.1: Build walkthrough — npm run build exits 0, tsc --noEmit exits 0, no secrets in source
- [x] P8.2: Write .gsd/FINAL_REPORT.md (updated)
- [ ] P8.3: ALL_GATES_GREEN — pending Phase 6 (requires Firebase Admin + FCM keys)
