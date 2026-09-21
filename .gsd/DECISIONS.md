# DECISIONS.md

All assumptions made, with rationale.

## D-1: API base URL resolution (dev vs prod)
- **Decision**: Use Vite proxy (`/api/*` → `http://localhost:3001`) for dev; Vercel routes `/api/*` to serverless functions in prod. Frontend always calls `/api/*` relative URL — no env var needed.
- **Rationale**: The vite.config.ts proxy already does this. Vercel auto-routes `/api/**` to `/api/` directory functions. No change needed to URL logic.

## D-2: Vercel serverless strategy
- **Decision**: Export the entire Express app from `/api/index.ts` as a Vercel serverless function. This is the "Express on Vercel" pattern — simpler than rewriting every route.
- **Source**: https://vercel.com/docs/functions/serverless-functions/runtimes/node-js#using-express.js
- **Rationale**: Rewriting 15+ routes individually is high risk. The Express adapter pattern is well-supported.

## D-3: Open-Meteo weather (no key required)
- **Decision**: Keep Open-Meteo as the primary weather source (free, no API key). The existing `fetchWeatherData` function already uses it correctly.
- **Source**: https://open-meteo.com/en/docs — confirmed `temperature_2m`, `relative_humidity_2m`, `precipitation_probability_max` are valid v1/forecast parameters.

## D-4: Farm "clicking creates new farm" bug
- **Decision**: Root cause confirmed in `FarmDetailPage.tsx` line 23: `const farm = farms.find(f => f.id === id) || farms[0]`. If `id` doesn't match any farm (e.g., on first load before subscription fires), it falls back to `farms[0]` and still renders — this is NOT the create bug.
- The actual create bug would be in the onboarding flow if a useEffect triggers `saveFarm`. Need to audit `SetupCompletePage`.

## D-5: Demo data fallback
- **Decision**: When server is unreachable in dev (npm run dev without npm run server), `ApiWeatherService` catches the fetch error and returns `MOCK_WEATHER` with `isDemo` not set to true. This silently shows mock data. Fix: always set `isDemo: true` in the catch block and show a visible banner.

## D-6: Firebase Admin SDK
- **Decision**: Firebase Admin SDK is NOT currently installed. Will add it as a dependency for Phase 6 (push notifications). For now, Phases 1-5 work without it.

## D-7: `@rolldown/binding-darwin-arm64` removal
- **Decision**: Already removed by user in a prior session (`npm uninstall`). The package.json confirms it's gone. No action needed — just verify `npm ci` passes.

## D-8: Cron frequency
- **Decision**: Default to hourly (`0 * * * *`) for Vercel Hobby plan (max 2 crons, daily execution limit on Hobby). Make frequency configurable via `CRON_INTERVAL_HOURS` env var. Provide GitHub Actions fallback.
- **Source**: https://vercel.com/docs/cron-jobs — Hobby plan allows cron jobs.

## D-9: `saveFarm` used for healthScore update (Phase 0 discovery)
- **Decision**: `farmService.saveFarm({ id: farm.id, healthScore: health.score })` in MyFarmsPage.tsx will always call `addDoc` (creating a new farm) instead of updating. This is the source of the "clicking creates a new farm" regression. Fix: add `updateFarm` method to `IFarmService` and `FirebaseFarmService`.

## D-10: Earth Engine SDK in browser vs server
- **Decision**: Earth Engine JS API (`@google/earthengine`) cannot run in a browser. It must run server-side only. The existing `satelliteService.ts` on the server side is correct. Client-side `satelliteService.ts` calls `/api/farms/:id/satellite`.
