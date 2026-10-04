import { doc, setDoc, collection, query, orderBy, limit, getDocs, getDoc, serverTimestamp, deleteDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { compressImageWithFallback, describeQualityProblem } from '@/utils/imageCompressor'
import type { DiagnosisResult, DiagnosisRequestStatus, InsufficientEvidenceOutcome } from '@/types'
import { mapDiagnosisDoc, DIAGNOSIS_PIPELINE_VERSION } from '@/utils/diagnosis'
import { notificationService } from '@/services/index'

export interface AnalyzeImageParams {
  file?: File | Blob | null
  imageBase64?: string
  imageUrl?: string
  isSample?: boolean
  source?: 'camera' | 'upload' | 'sample'
  farmContext?: {
    farmId?: string
    crop?: string
    cropStage?: string
    soilType?: string
    location?: string
  }
}

export type AnalyzeImageResult =
  | { success: true; status: 'SUCCESS'; diagnosis: DiagnosisResult; saved: boolean; error?: undefined }
  | { success: true; status: 'INSUFFICIENT_EVIDENCE'; insufficient: InsufficientEvidenceOutcome; diagnosis?: undefined; error?: undefined }
  | { success: false; status: Exclude<DiagnosisRequestStatus, 'SUCCESS' | 'INSUFFICIENT_EVIDENCE'>; error: string; reason?: string; retryAfterSeconds?: number; diagnosis?: undefined }

/** Vercel rejects request bodies over 4.5 MB; keep the base64 payload well below it. */
const MAX_UPLOAD_BASE64_CHARS = 4_000_000

/**
 * Client-side image validation (size < 10MB, MIME type check)
 */
export function validateCropImage(file: File | Blob): { valid: boolean; error: string | null } {
  const maxSizeBytes = 10 * 1024 * 1024 // 10 MB limit
  if (file.size > maxSizeBytes) {
    return { valid: false, error: 'Image size exceeds 10MB limit. Please select a smaller image.' }
  }

  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  if (file.type && !validTypes.some(t => file.type.toLowerCase().includes(t.replace('image/', '')))) {
    return { valid: false, error: 'Invalid file format. Please select a JPEG, PNG, or WebP image.' }
  }

  return { valid: true, error: null }
}

/** SHA-256 of the full image payload — identical photos reuse their saved result instead of a new AI call. */
async function generateImageHash(base64: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(base64))
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 24)
}

/** Firestore rejects `undefined` field values. */
function withoutUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T
}

const NETWORK_MESSAGE = 'Could not reach the diagnosis server. Check your internet connection and try again.'

export const cropDoctorService = {
  /**
   * Diagnosis pipeline:
   * 1. Validates and compresses the image in the browser (canvas).
   * 2. POST /api/analyze-crop (authenticated). The server validates the image, calls the
   *    vision model and returns SUCCESS, INSUFFICIENT_EVIDENCE or a typed failure.
   * 3. Only SUCCESS results are saved, to `users/{uid}/diagnoses/{diagnosisId}`.
   * No failure path ever produces a diagnosis.
   */
  analyzeImage: async (params: AnalyzeImageParams): Promise<AnalyzeImageResult> => {
    const { file, isSample, source = 'upload', farmContext } = params
    let imageBase64: string | undefined = params.imageBase64
    let thumbnailDataUrl: string | undefined

    try {
      if (file) {
        const validation = validateCropImage(file)
        if (!validation.valid) {
          return { success: false, status: 'INVALID_REQUEST', error: validation.error || 'Invalid image file' }
        }
        const compression = await compressImageWithFallback(file)
        const problem = compression.quality && describeQualityProblem(compression.quality)
        if (problem) return { success: false, status: 'INVALID_REQUEST', error: problem.message, reason: problem.reason }
        imageBase64 = compression.compressedBase64
        // Never store a full-size image as the thumbnail (Firestore documents are capped at 1 MB)
        thumbnailDataUrl = compression.isFallback ? undefined : compression.thumbnailBase64
      } else if (!imageBase64 && params.imageUrl?.startsWith('/')) {
        // Bundled sample image: load it in the browser and send its pixels like any other photo
        const blob = await fetch(params.imageUrl).then(r => {
          if (!r.ok) throw new Error(`Sample image HTTP ${r.status}`)
          return r.blob()
        })
        const compression = await compressImageWithFallback(blob)
        imageBase64 = compression.compressedBase64
        thumbnailDataUrl = compression.isFallback ? undefined : compression.thumbnailBase64
      }
    } catch (err) {
      console.warn('[cropDoctorService] Could not prepare image:', err)
      return { success: false, status: 'INVALID_REQUEST', error: 'This image could not be read. It may be corrupted — please choose another photo.', reason: 'UNREADABLE' }
    }

    if (!imageBase64) {
      return { success: false, status: 'INVALID_REQUEST', error: 'No image provided for diagnosis.' }
    }
    if (imageBase64.length > MAX_UPLOAD_BASE64_CHARS) {
      return { success: false, status: 'INVALID_REQUEST', error: 'This image is too large to upload. Please take a new photo or use a JPEG image.', reason: 'TOO_LARGE' }
    }

    const currentUser = auth.currentUser
    if (!currentUser) {
      return { success: false, status: 'AUTHENTICATION_ERROR', error: 'Please sign in again to diagnose crops.' }
    }

    const imageHash = await generateImageHash(imageBase64)
    const diagnosisId = `diag_v${DIAGNOSIS_PIPELINE_VERSION}_${imageHash}`

    // Same photo already diagnosed by this pipeline version → reuse the saved record
    try {
      const cached = await getDoc(doc(db, 'users', currentUser.uid, 'diagnoses', diagnosisId))
      if (cached.exists()) {
        console.log(`[Diagnosis] cache hit users/${currentUser.uid}/diagnoses/${diagnosisId}`)
        return { success: true, status: 'SUCCESS', diagnosis: mapDiagnosisDoc(cached.id, cached.data(), currentUser.uid), saved: true }
      }
    } catch (e) {
      console.warn('[cropDoctorService] Cache lookup failed:', e)
    }

    let idToken: string
    try {
      idToken = await currentUser.getIdToken()
    } catch {
      return { success: false, status: 'AUTHENTICATION_ERROR', error: 'Your session has expired. Please sign in again.' }
    }

    let response: Response
    try {
      response = await fetch('/api/analyze-crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ imageBase64, farmContext })
      })
    } catch (fetchErr) {
      console.error('[cropDoctorService] Network error calling /api/analyze-crop:', fetchErr)
      return { success: false, status: 'NETWORK_ERROR', error: NETWORK_MESSAGE }
    }

    const bodyText = await response.text()
    let body: any = null
    try { body = JSON.parse(bodyText) } catch { /* non-JSON (proxy/gateway error page) */ }

    if (!response.ok || !body?.success) {
      if (response.status === 413) {
        return { success: false, status: 'INVALID_REQUEST', error: 'This image is too large to upload. Please use a smaller photo.', reason: 'TOO_LARGE' }
      }
      if (response.status === 401) {
        return { success: false, status: 'AUTHENTICATION_ERROR', error: 'Your session has expired. Please sign in again.' }
      }
      const status = (body?.status as DiagnosisRequestStatus) ||
        (response.status === 429 ? 'RATE_LIMITED' : response.status === 504 ? 'TIMEOUT' : response.status >= 500 ? 'AI_SERVICE_UNAVAILABLE' : 'GENERAL_ERROR')
      const message = body?.error?.message || body?.message || (status === 'AI_SERVICE_UNAVAILABLE'
        ? 'AI diagnosis is temporarily unavailable. Please try again shortly.'
        : 'Something went wrong during diagnosis. Please try again.')
      console.warn(`[cropDoctorService] /api/analyze-crop → HTTP ${response.status} ${status}`)
      return {
        success: false,
        status: (status === 'SUCCESS' || status === 'INSUFFICIENT_EVIDENCE' ? 'GENERAL_ERROR' : status),
        error: message,
        reason: body?.reason,
        retryAfterSeconds: body?.retryAfterSeconds
      }
    }

    if (body.status === 'INSUFFICIENT_EVIDENCE') {
      const d = body.data || {}
      return {
        success: true,
        status: 'INSUFFICIENT_EVIDENCE',
        insufficient: {
          cropName: d.cropName ?? null,
          observations: Array.isArray(d.observations) ? d.observations : [],
          limitations: Array.isArray(d.limitations) ? d.limitations : [],
          imageQualityIssues: Array.isArray(d.imageQualityIssues) ? d.imageQualityIssues : [],
          guidance: Array.isArray(d.guidance) ? d.guidance : []
        }
      }
    }

    if (body.status !== 'SUCCESS' || !body.data || body.data.isPlantImage !== true) {
      console.error('[cropDoctorService] Unexpected success payload shape', body?.status)
      return { success: false, status: 'INVALID_AI_RESPONSE', error: 'The diagnosis service returned an unexpected response. No diagnosis was made.' }
    }

    // ── Persist the validated SUCCESS result ──────────────────────────────────
    const data = body.data
    const language = localStorage.getItem('agri_ai_language') || 'en'
    const record = withoutUndefined({
      pipelineVersion: DIAGNOSIS_PIPELINE_VERSION,
      status: 'SUCCESS',
      userId: currentUser.uid,
      farmId: farmContext?.farmId || null,
      source,
      isSample: Boolean(isSample),
      imageHash,
      imageUrl: thumbnailDataUrl || null,
      // Original AI output is stored in English; presentation translation never overwrites it
      language: 'en',
      uiLanguageAtCapture: language,
      cropName: data.cropName,
      crop: data.cropName,
      cropCode: data.cropCode,
      reportedCrop: data.reportedCrop ?? null,
      cropMatchesReported: data.cropMatchesReported,
      diagnosisCode: data.diagnosisCode,
      diseaseName: data.diseaseName,
      disease: data.diseaseName,
      certainty: data.certainty,
      severity: data.severity,
      imageQuality: data.imageQuality,
      symptoms: data.symptoms || [],
      supportingEvidence: data.supportingEvidence || [],
      contradictingEvidence: data.contradictingEvidence || [],
      alternativeDiagnoses: data.alternativeDiagnoses || [],
      limitations: data.limitations || [],
      explanation: data.explanation || '',
      analysis: data.analysis || '',
      immediateActions: data.immediateActions || [],
      treatment: data.treatment || [],
      recommendations: data.recommendations || [],
      prevention: data.prevention || [],
      longTermPrevention: data.longTermPrevention || [],
      whenToRecheck: data.whenToRecheck || '',
      needsExpertReview: Boolean(data.needsExpertReview),
      isPlantImage: true,
      provenance: data.provenance || null
    })

    let saved = false
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'diagnoses', diagnosisId), { ...record, createdAt: serverTimestamp() })
      saved = true
      console.log(`[Diagnosis] saved users/${currentUser.uid}/diagnoses/${diagnosisId}`)
    } catch (firestoreErr: any) {
      console.error(`[Diagnosis] FIRESTORE WRITE FAILED users/${currentUser.uid}/diagnoses/${diagnosisId}: ${firestoreErr?.code || firestoreErr?.message}`)
    }

    if (saved && data.diagnosisCode !== 'healthy') {
      notificationService.createNotification({
        title: `New Diagnosis: ${data.cropName}`,
        body: `${data.diseaseName} — review the result and recommended steps.`,
        type: 'disease',
        priority: data.severity === 'severe' ? 'high' : 'medium',
        read: false,
        actionRoute: '/history',
      }).catch(e => console.warn('[Diagnosis] notification failed:', e))
    }

    const diagnosis = mapDiagnosisDoc(diagnosisId, { ...record, timestamp: data.provenance?.analyzedAt }, currentUser.uid)
    // Show the full-resolution preview on the result page even when only a thumbnail is stored
    return { success: true, status: 'SUCCESS', diagnosis, saved }
  },

  /**
   * Fetches recent diagnoses for the authenticated user from `users/{uid}/diagnoses`,
   * newest first. Waits for Firebase Auth to resolve before querying.
   */
  getRecentDiagnoses: async (limitCount = 10, farmId?: string): Promise<DiagnosisResult[]> => {
    const currentUser: any = await new Promise(resolve => {
      const u = auth.currentUser
      if (u !== null) return resolve(u)
      const unsub = auth.onAuthStateChanged(user => {
        unsub()
        resolve(user)
      })
    })
    if (!currentUser) return []

    try {
      const uid = currentUser.uid
      const q = query(collection(db, 'users', uid, 'diagnoses'), orderBy('createdAt', 'desc'), limit(farmId ? limitCount * 5 : limitCount))
      const snap = await getDocs(q)
      const results = snap.docs.map(docSnap => mapDiagnosisDoc(docSnap.id, docSnap.data(), uid))
      return farmId ? results.filter(d => d.farmId === farmId).slice(0, limitCount) : results
    } catch (err: any) {
      if (err?.code === 'permission-denied') {
        console.error(`[Diagnosis] PERMISSION DENIED reading users/${currentUser.uid}/diagnoses — check deployed Firestore rules`)
        throw new Error('FIRESTORE_PERMISSION_DENIED')
      }
      console.error('[cropDoctorService] Error retrieving diagnoses from Firestore:', err)
      throw err
    }
  },

  /**
   * Retrieves a single diagnosis record by ID from `users/{uid}/diagnoses/{diagnosisId}`
   */
  getDiagnosisById: async (diagnosisId: string): Promise<DiagnosisResult | null> => {
    const currentUser = auth.currentUser
    if (!currentUser) return null
    try {
      const snap = await getDoc(doc(db, 'users', currentUser.uid, 'diagnoses', diagnosisId))
      return snap.exists() ? mapDiagnosisDoc(snap.id, snap.data(), currentUser.uid) : null
    } catch (err) {
      console.warn('[cropDoctorService] Error retrieving diagnosis by ID from Firestore:', err)
      return null
    }
  },

  /**
   * Deletes a single diagnosis record by ID from Firestore: `users/{uid}/diagnoses/{diagnosisId}`
   */
  deleteDiagnosis: async (diagnosisId: string): Promise<boolean> => {
    try {
      const currentUser = auth.currentUser
      if (!currentUser || !db || !db.app) {
        // Handle guest localStorage deletion
        try {
          const stored = localStorage.getItem('guest_diagnoses')
          if (stored) {
            const parsed = JSON.parse(stored)
            const filtered = parsed.filter((d: any) => d.id !== diagnosisId)
            localStorage.setItem('guest_diagnoses', JSON.stringify(filtered))
            return true
          }
        } catch (e) {}
        return false
      }

      const docRef = doc(db, 'users', currentUser.uid, 'diagnoses', diagnosisId)
      await deleteDoc(docRef)
      console.log(`[Diagnosis] Deleted diagnosis ${diagnosisId}`)
      return true
    } catch (err) {
      console.error('[cropDoctorService] Error deleting diagnosis:', err)
      return false
    }
  },

  /**
   * Deletes all diagnosis records for the current user
   */
  deleteAllDiagnoses: async (): Promise<boolean> => {
    try {
      const currentUser = auth.currentUser
      if (!currentUser || !db || !db.app) {
        localStorage.removeItem('guest_diagnoses')
        return true
      }

      const diagnosesCol = collection(db, 'users', currentUser.uid, 'diagnoses')
      const snap = await getDocs(diagnosesCol)
      
      const deletePromises = snap.docs.map(docSnap => deleteDoc(doc(db, 'users', currentUser.uid, 'diagnoses', docSnap.id)))
      await Promise.all(deletePromises)
      
      console.log(`[Diagnosis] Deleted all ${snap.size} diagnoses`)
      return true
    } catch (err) {
      console.error('[cropDoctorService] Error deleting all diagnoses:', err)
      return false
    }
  }
}
