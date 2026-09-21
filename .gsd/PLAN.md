# PLAN.md — CROPOCTOR Full Rebuild Plan

## PHASE 0 — AUDIT
- [x] P0.1: Map codebase (routes, pages, data layer, env vars)
- [x] P0.2: Identify root cause of "clicking creates farm" bug (D-9: saveFarm calls addDoc always)
- [x] P0.3: Identify root cause of demo data (D-5: catch returns MOCK_WEATHER silently)
- [x] P0.4: Write docs/AUDIT.md

## PHASE 1 — UNBLOCK DEPLOYMENT
- [x] P1.1: Confirm @rolldown removed from package.json (already done)
- [ ] P1.2: Create /api/index.ts — Express app adapter for Vercel
- [ ] P1.3: Add /api/health endpoint
- [ ] P1.4: Create vercel.json (SPA rewrites, function config)
- [ ] P1.5: Add missing proxy routes to vite.config.ts (voice, satellite)
- [ ] P1.6: Gate: `npm run build` exits 0

## PHASE 2 — BUG FIXES
- [ ] P2.1: Create shared apiClient.ts (single body read, typed errors, timeout)
- [ ] P2.2: Fix "clicking farm creates new farm" — add updateFarm to IFarmService + FirebaseFarmService
- [ ] P2.3: Fix MyFarmsPage.tsx saveFarm call → use updateFarm
- [ ] P2.4: Fix FarmHealthIndicator not calling updateFarm correctly
- [ ] P2.5: Fix weather always returning demo data — show isDemo banner, pass farm lat/lng
- [ ] P2.6: Fix diagnose validation — is_plant check, reject non-plant with clear message
- [ ] P2.7: Gate: `npm run build` exits 0

## PHASE 3 — FARM PROFILE + SATELLITE DATA
- [ ] P3.1: Add updateFarm to IFarmService interface
- [ ] P3.2: Implement updateFarm in FirebaseFarmService (setDoc merge)
- [ ] P3.3: Expose updateFarm from FarmContext
- [ ] P3.4: Enhance FarmDetailPage with satellite data display (NDVI, moisture, date, source)
- [ ] P3.5: Add /api/health endpoint
- [ ] P3.6: Gate: FarmDetailPage shows real satellite values with source+date

## PHASE 4 — CONTINUOUS MONITORING PIPELINE
- [ ] P4.1: Create /api/cron/monitor.ts endpoint (protected by CRON_SECRET)
- [ ] P4.2: Create alert rules config file (crop-specific heuristics)
- [ ] P4.3: Add vercel.json cron entry
- [ ] P4.4: Add GitHub Actions fallback workflow
- [ ] P4.5: Gate: integration test verifies deduplication

## PHASE 5 — TRANSPARENT HEALTH SCORE
- [ ] P5.1: Rewrite healthService.ts with tunable weights config
- [ ] P5.2: Add "How is this calculated?" drawer to FarmDetailPage
- [ ] P5.3: Show confidence indicator
- [ ] P5.4: Gate: unit tests for score function

## PHASE 6 — NOTIFICATIONS
- [ ] P6.1: Install firebase-admin
- [ ] P6.2: Create firebase-messaging-sw.js for PWA
- [ ] P6.3: Add FCM token registration (click-triggered only)
- [ ] P6.4: Store tokens in users/{uid}/devices
- [ ] P6.5: Add per-type/per-farm settings
- [ ] P6.6: Gate: browser subagent verifies notification flow

## PHASE 7 — CLEANUP + SECURITY
- [ ] P7.1: Move useful root scripts to /scripts/
- [ ] P7.2: Delete: catch_error.mjs, check_logs.mjs, recover.py, test-firestore.js, satellite_test*.json
- [ ] P7.3: Tighten firestore.rules (devices subcollection, observations subcollection)
- [ ] P7.4: Add rate limiting middleware
- [ ] P7.5: Add .env.example
- [ ] P7.6: Gate: `npm run build` exits 0 + security scan

## PHASE 8 — FINAL VERIFICATION
- [ ] P8.1: Browser walkthrough (sign in, add farm, diagnose, weather, notifications)
- [ ] P8.2: Write .gsd/FINAL_REPORT.md
- [ ] P8.3: Print ALL_GATES_GREEN
