# BLOCKERS.md

## Things only the human can provide

### BLOCKER-1: Earth Engine Service Account
- **What**: A Google Earth Engine service account JSON key file + registered GEE project ID.
- **Why needed**: Server-side satellite NDVI/moisture data requires EE authentication.
- **Current state**: `.gee-key.json` exists at repo root (may be valid). `EE_KEY_PATH=".gee-key.json"` is set in `.env`.
- **Action required**: Verify the service account is still valid and the project has EE API enabled.
- **Impact if missing**: Satellite data will return fallback "unavailable" values with clear labeling.

### BLOCKER-2: Gemini API Key Quota
- **What**: The `GEMINI_API_KEY` uses a non-standard `AQ.` prefix (likely a Google AI Studio key).
- **Why needed**: AI Advisor, diagnosis, and weather advisory all require Gemini.
- **Current state**: Key hits 429/503 errors under load. Fallbacks exist.
- **Action required**: If persistent failures, upgrade to Gemini API with higher quota or use Google Cloud Vertex AI.

### BLOCKER-3: Firebase Admin SDK credentials
- **What**: For Phases 4-6 (push notifications via FCM server-send), firebase-admin needs service account credentials.
- **Why needed**: Sending web push from the server requires Admin SDK.
- **Current state**: Not installed. Frontend uses Firebase client SDK only.
- **Action required**: Download Firebase Admin service account JSON, add to env as `FIREBASE_ADMIN_KEY_BASE64` (base64-encoded).
- **Impact if missing**: Push notifications cannot be sent from the server. In-app notifications still work.

### BLOCKER-4: FCM VAPID Key
- **What**: For web push notifications, a VAPID key pair is needed.
- **Why needed**: Firebase Cloud Messaging requires VAPID for web push.
- **Action required**: Generate in Firebase Console → Project Settings → Cloud Messaging → Web Push certificates.
- **Add as**: `VITE_FCM_VAPID_KEY` (public) and note in `.env.example`.

### BLOCKER-5: CRON_SECRET
- **What**: A secret string to protect the `/api/cron/monitor` endpoint from unauthorized calls.
- **Action required**: Generate a random 32+ character string, add as `CRON_SECRET` in Vercel environment variables.

### BLOCKER-6: Vercel Environment Variables
- **What**: All server-side env vars must be added to Vercel project settings.
- **List**: `GEMINI_API_KEY`, `EE_KEY_PATH` or `EE_SERVICE_ACCOUNT_JSON`, `CRON_SECRET`, `FIREBASE_ADMIN_KEY_BASE64`, `GOOGLE_WEATHER_API_KEY` (optional).
- **Action required**: Add each in Vercel Dashboard → Project → Settings → Environment Variables.
