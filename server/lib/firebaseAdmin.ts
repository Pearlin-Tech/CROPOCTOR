/**
 * Lazy Firebase Admin initialisation (modular API — firebase-admin v12+ removed
 * the namespaced `admin.firestore()` / `admin.credential` / `admin.apps` API).
 *
 * Credentials come only from FIREBASE_ADMIN_KEY_BASE64 (base64 service-account JSON),
 * a server-only variable. Never expose it through a VITE_* variable.
 */
import type { App } from 'firebase-admin/app'
import type { Firestore } from 'firebase-admin/firestore'
import type { Messaging } from 'firebase-admin/messaging'

let _app: App | null = null

export function isFirebaseAdminConfigured(): boolean {
  return !!process.env.FIREBASE_ADMIN_KEY_BASE64
}

async function getAdminApp(): Promise<App> {
  if (_app) return _app
  const keyB64 = process.env.FIREBASE_ADMIN_KEY_BASE64
  if (!keyB64) throw new Error('FIREBASE_ADMIN_KEY_BASE64 is not set — cannot access Firestore as admin')

  const { initializeApp, getApps, cert } = await import('firebase-admin/app')
  const existing = getApps()
  if (existing.length) {
    _app = existing[0]
    return _app
  }
  let serviceAccount: any
  try {
    serviceAccount = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf-8'))
  } catch {
    throw new Error('FIREBASE_ADMIN_KEY_BASE64 is not valid base64-encoded JSON')
  }
  _app = initializeApp({ credential: cert(serviceAccount) })
  return _app
}

export async function getAdminFirestore(): Promise<Firestore> {
  const { getFirestore } = await import('firebase-admin/firestore')
  return getFirestore(await getAdminApp())
}

export async function getAdminMessaging(): Promise<Messaging> {
  const { getMessaging } = await import('firebase-admin/messaging')
  return getMessaging(await getAdminApp())
}
