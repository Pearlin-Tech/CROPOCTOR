/**
 * Loads local env files. Must be the FIRST import of api/index.ts: ES imports are evaluated
 * in order before the importing module's body, and server/config reads process.env at load.
 * Local dev: .env.local (Vite convention) takes precedence over .env. On Vercel neither file
 * exists and variables come from the project settings.
 */
import dotenv from 'dotenv'

dotenv.config({ path: ['.env.local', '.env'], quiet: true })
