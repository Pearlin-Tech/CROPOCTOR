# AUDIT.md — CROPOCTOR Codebase Audit

## Architecture Overview

```
/
├── src/                    — React 18 + TypeScript frontend
│   ├── App.tsx             — Router, lazy page imports, providers
│   ├── store/              — React Context (FarmContext, UserContext, AppContext, FarmSetupContext)
│   ├── services/           — Client-side service layer (calls /api/* endpoints)
│   │   ├── index.ts        — IFarmService, IWeatherService, etc. + singleton exports
│   │   ├── farmService.ts  — FirebaseFarmService (Firestore CRUD)
│   │   ├── cropDoctorService.ts — Diagnosis pipeline (compress → /api/analyze-crop → Firestore)
│   │   ├── satelliteService.ts  — Calls /api/farms/:id/satellite
│   │   └── healthService.ts     — calculateFarmHealthScore() (weather+NDVI+diagnosis+farm)
│   └── pages/
│       ├── main/HomePage.tsx        — Fetches weather+diagnosis+satellite in parallel
│       ├── main/MyFarmsPage.tsx     — Lists farms, FarmHealthIndicator per farm
│       ├── main/FarmDetailPage.tsx  — Shows farm with health factors, no satellite display
│       └── main/AIAdvisorPage.tsx   — AI chat + Farm Context panel
├── server/
│   ├── index.ts            — Express app: /api/weather, /api/advisor, /api/analyze-crop, satellite, voice
│   └── services/           — Server-side: geminiDiagnosisModule, satelliteService, ttsService, sttService
├── api/
│   ├── analyze-crop.ts     — Vercel serverless stub (imports from server/services)
│   └── diagnose.ts         — Duplicate/unused
└── public/                 — Static assets, icons, PWA manifest
```

## Routes Map
| Path | Component | Notes |
|------|-----------|-------|
| /splash | SplashPage | Onboarding entry |
| /home | HomePage | Dashboard with weather + health |
| /farms | MyFarmsPage | Farm list with health indicators |
| /farms/:id | FarmDetailPage | Farm details |
| /diagnose | CropDoctorPage | Crop image diagnosis |
| /advisor | AIAdvisorPage | AI chat + context panel |
| /weather | WeatherPage | Full weather + forecast |
| /insights | InsightsPage | Mock insights (MockInsightsService) |

## API Endpoints (server/index.ts)
| Endpoint | Method | Notes |
|----------|--------|-------|
| /api/weather | GET | Open-Meteo + Gemini advisory. Cached 10min. Falls back to MOCK_WEATHER on error. |
| /api/advisor | POST | Gemini AI farming advisor. No auth required. |
| /api/analyze-crop | POST | Gemini Vision crop diagnosis. No auth required. |
| /api/farms/:farmId/satellite | GET | Earth Engine NDVI. |
| /api/voice/stt | POST | Firebase Auth required. Speech-to-text. |
| /api/voice/tts | POST | Firebase Auth required. Text-to-speech. |
| /api/voice/process | POST | Voice assistant. No auth required. |

## Firestore Collections
```
users/{uid}/
  farms/{farmId}           — Farm documents (name, location, area, crop, stage, healthPercentage)
  diagnoses/{diagnosisId}  — Diagnosis records (cropName, diseaseName, severity, confidence, ...)
  notifications/{notifId}  — App notifications
```

## Environment Variables
| Variable | Where Used | Public? |
|----------|-----------|---------|
| VITE_FIREBASE_API_KEY | Frontend Firebase init | ⚠️ YES (VITE_ prefix) |
| VITE_FIREBASE_AUTH_DOMAIN | Frontend Firebase init | ⚠️ YES |
| VITE_FIREBASE_PROJECT_ID | Frontend Firebase init | ⚠️ YES |
| VITE_FIREBASE_STORAGE_BUCKET | Frontend Firebase init | ⚠️ YES |
| VITE_FIREBASE_MESSAGING_SENDER_ID | Frontend Firebase init | ⚠️ YES |
| VITE_FIREBASE_APP_ID | Frontend Firebase init | ⚠️ YES |
| VITE_GOOGLE_MAPS_API_KEY | Frontend maps | ⚠️ YES |
| GEMINI_API_KEY | Server-side only | ✅ Server |
| EE_KEY_PATH | Server satellite service | ✅ Server |
| GEMINI_TEXT_MODEL | Server AI model config | ✅ Server |
| GEMINI_VISION_MODEL | Server AI model config | ✅ Server |
| GOOGLE_WEATHER_API_KEY | Server weather (optional) | ✅ Server |

## Confirmed Bugs

### BUG-1: "Clicking a farm creates a new farm" (CRITICAL)
- **Root Cause**: `MyFarmsPage.tsx` line 41 calls `farmService.saveFarm({ id: farm.id, healthScore })`. 
  `saveFarm` in `FirebaseFarmService` always calls `addDoc(farmsRef, ...)` — it NEVER checks `farm.id`. 
  Every health score update creates a brand new Firestore document with a random ID.
  Additionally, `IFarmService` has no `updateFarm` method, so there's no way to update in place.
- **Fix**: Add `updateFarm(id, updates)` to `IFarmService` + `FirebaseFarmService` using `setDoc` with `{ merge: true }`.

### BUG-2: Demo data on Home and Weather pages
- **Root Cause**: `ApiWeatherService.getWeather()` fails when the Express server is not running (dev without `npm run server`). It catches the error and returns `MOCK_WEATHER` but does NOT set `isDemo: true`. The UI shows real-looking numbers from 2026-08-21.
- **Fix**: Set `isDemo: true` in the catch block. Show "Demo Data" badge. Ensure server is running.

### BUG-3: Weather uses hardcoded Rajkot coords when farm lat/lng not passed
- **Root Cause**: `FarmHealthIndicator` calls `weatherService.getWeather(farm.id)` without the farm object. The server receives only `farmId` and looks it up in MOCK_FARMS_DB (which has hardcoded Rajkot). Real farm locations are ignored.
- **Fix**: Pass the full farm object to `getWeather(farm.id, farm)` in all health indicator components.

### BUG-4: "Body is disturbed or locked" (Diagnose page)
- **Root Cause**: In `cropDoctorService.ts` lines 181-187: if `!response.ok`, it tries `response.json()` first, then falls back to `response.text()`. If `.json()` partially reads and fails, the body stream is locked for `.text()`. 
- **Fix**: Read the response body once using `response.text()`, then try `JSON.parse()` on that text.

### BUG-5: Non-plant image accepted without rejection
- **Root Cause**: The Gemini model returns `isPlantImage` in its response, but `cropDoctorService.ts` line 214 only sets it — it never rejects the diagnosis if `isPlantImage === false`. The result flows through to the UI as a valid diagnosis.
- **Fix**: After parsing `diagnosisData`, if `isPlantImage === false`, return an error: "This doesn't appear to be a plant image. Please upload a clear photo of crops or leaves."

### BUG-6: Vercel deployment broken (no serverless functions for most routes)
- **Root Cause**: Only `/api/analyze-crop.ts` and `/api/diagnose.ts` exist as Vercel functions. All other routes (`/api/weather`, `/api/advisor`, etc.) only exist in `server/index.ts` (Express), which Vercel doesn't run. `vercel.json` doesn't exist.
- **Fix**: Export Express app from `/api/index.ts`, add `vercel.json`.

## Hypotheses Verification
| Hypothesis | Status |
|------------|--------|
| @rolldown/binding-darwin-arm64 breaks Vercel | CONFIRMED (now removed by user) |
| Body double-read causes Diagnose error | CONFIRMED (BUG-4) |
| Clicking farm creates new farm | CONFIRMED (BUG-1) — saveFarm always addDoc |
| Demo weather data shown | CONFIRMED (BUG-2, BUG-3) |
| Non-plant images accepted | CONFIRMED (BUG-5) |
| Vercel deployment broken | CONFIRMED (BUG-6) |
