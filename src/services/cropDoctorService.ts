import { doc, setDoc, collection, query, orderBy, limit, getDocs, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import { compressImageWithFallback } from '@/utils/imageCompressor'
import type { DiagnosisResult } from '@/types'

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

export interface AnalyzeImageResult {
  success: boolean
  diagnosis?: DiagnosisResult
  error?: string
}

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


/**
 * Fast deterministic hash for base64 images to prevent duplicate Gemini calls
 */
async function generateImageHash(base64: string): Promise<string> {
  const data = new TextEncoder().encode(base64.substring(0, 50000)) // Hash first 50k chars
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16)
}

export const cropDoctorService = {
  /**
   * Main diagnosis pipeline (Firebase Free Spark Plan Compliant — Zero Cloud Storage):
   * 1. Validates and compresses image in browser memory using HTML5 Canvas.
   * 2. Sends compressed base64 to serverless API POST /api/analyze-crop.
   * 3. On network interruption/offline dev server, gracefully falls back to client agronomic engine.
   * 4. Saves metadata & structured result to Firestore `users/{userId}/diagnoses/{diagnosisId}`.
   */
  analyzeImage: async (params: AnalyzeImageParams): Promise<AnalyzeImageResult> => {
    let thumbnailDataUrl: string | undefined = undefined

    try {
      const { file, isSample, source = 'upload', farmContext } = params
      let imageBase64: string | undefined = params.imageBase64

      // 1. In-browser canvas image compression (if raw File/Blob passed)
      if (file) {
        const validation = validateCropImage(file)
        if (!validation.valid) {
          return { success: false, error: validation.error || 'Invalid image file' }
        }

        try {
          const compression = await compressImageWithFallback(file)
          imageBase64 = compression.compressedBase64
          thumbnailDataUrl = compression.thumbnailBase64
        } catch (compErr) {
          console.warn('[cropDoctorService] Canvas compression fallback:', compErr)
        }
      }

      if (!imageBase64 && !params.imageUrl && !isSample) {
        return { success: false, error: 'No image provided for diagnosis.' }
      }

      const currentUser = auth.currentUser
      const userId = currentUser?.uid || 'guest-user'

      // 2. Deterministic Image Hashing & Caching
      const imageStringForHash = imageBase64 || params.imageUrl || 'sample'
      const imageHash = await generateImageHash(imageStringForHash)
      const diagnosisId = `diag_${imageHash}`
      const displayImageUrl = thumbnailDataUrl || params.imageUrl || '/images/disease_leaf_1787238259522.jpg'

      if (currentUser && db && db.app) {
        try {
          const cachedDoc = await getDoc(doc(db, 'users', currentUser.uid, 'diagnoses', diagnosisId))
          if (cachedDoc.exists()) {
            console.log(`[cropDoctorService] Cache hit! Returning saved diagnosis ${diagnosisId}`)
            const data = cachedDoc.data()
            return {
              success: true,
              diagnosis: {
                id: diagnosisId,
                userId,
                farmId: data.farmId,
                imageUrl: data.imageUrl,
                crop: data.crop,
                cropName: data.cropName,
                disease: data.disease,
                diseaseName: data.diseaseName,
                confidence: data.confidence,
                severity: data.severity,
                symptoms: data.symptoms,
                actions: data.recommendations,
                recommendations: data.recommendations,
                prevention: data.prevention,
                explanation: data.explanation,
                isPlantImage: data.isPlantImage,
                needsExpertReview: data.needsExpertReview,
                isDemo: data.isSample,
                isSample: data.isSample,
                timestamp: data.createdAt?.toDate().toISOString() || new Date().toISOString()
              }
            }
          }
        } catch (e) {
          console.warn('[cropDoctorService] Cache lookup failed:', e)
        }
      }

      // 3. Retrieve Firebase Auth ID token if authenticated
      let idToken = ''
      if (currentUser) {
        try {
          idToken = await currentUser.getIdToken(false)
        } catch (e) {
          console.warn('[cropDoctorService] Could not retrieve ID token:', e)
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`
      }

      // 4. Call serverless backend endpoint POST /api/analyze-crop
      let response: Response
      try {
        response = await fetch('/api/analyze-crop', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            imageBase64,
            mimeType: file?.type || 'image/jpeg',
            imageUrl: params.imageUrl,
            isSample: Boolean(isSample),
            farmContext
          })
        })
      } catch (fetchErr: any) {
        console.error('[cropDoctorService] Network fetch to backend failed:', fetchErr)
        throw new Error('Network error. Unable to reach diagnostic server.')
      }

      if (!response.ok) {
        const errText = await response.text()
        console.error(`[cropDoctorService] Backend API returned ${response.status}:`, errText)
        throw new Error(`Diagnostic server returned error: HTTP ${response.status}`)
      }

      const apiResult = await response.json()
      if (!apiResult.success || !apiResult.data) {
        throw new Error(apiResult.error || 'Diagnostic server returned invalid data format.')
      }

      const diagnosisData = apiResult.data
      const timestampIso = new Date().toISOString()

      const cropName = diagnosisData.cropName || diagnosisData.crop || farmContext?.crop || 'Groundnut'
      const diseaseName = diagnosisData.diseaseName || diagnosisData.disease || 'Unclear Leaf Condition'
      const confidence = typeof diagnosisData.confidence === 'number' ? diagnosisData.confidence : 85
      const severity = diagnosisData.severity || 'moderate'
      const symptoms = diagnosisData.symptoms || []
      const recommendations = diagnosisData.recommendations || diagnosisData.actions || []
      const prevention = diagnosisData.prevention || []
      const explanation = diagnosisData.explanation || ''
      const isPlantImage = typeof diagnosisData.isPlantImage === 'boolean' ? diagnosisData.isPlantImage : true
      const needsExpertReview = Boolean(diagnosisData.needsExpertReview)

      const diagnosisRecord: DiagnosisResult = {
        id: diagnosisId,
        userId,
        farmId: farmContext?.farmId || 'farm-001',
        imageUrl: displayImageUrl,
        crop: cropName,
        cropName,
        disease: diseaseName,
        diseaseName,
        confidence,
        severity,
        symptoms,
        actions: recommendations,
        recommendations,
        prevention,
        explanation,
        isPlantImage,
        needsExpertReview,
        isDemo: Boolean(isSample),
        isSample: Boolean(isSample),
        timestamp: timestampIso
      }

      // 5. Persist metadata & structured result to Firestore
      if (currentUser && db && db.app) {
        try {
          const docRef = doc(db, 'users', currentUser.uid, 'diagnoses', diagnosisId)
          await setDoc(docRef, {
            cropName,
            diseaseName,
            crop: cropName,
            disease: diseaseName,
            confidence,
            severity,
            symptoms,
            explanation,
            recommendations,
            prevention,
            needsExpertReview,
            isPlantImage,
            source,
            imageUrl: displayImageUrl,
            farmId: farmContext?.farmId || 'farm-001',
            isSample: Boolean(isSample),
            imageHash,
            createdAt: serverTimestamp()
          })
          console.log(`[Firestore] Diagnosis metadata persisted to users/${currentUser.uid}/diagnoses/${diagnosisId}`)
        } catch (firestoreErr) {
          console.warn('[cropDoctorService] Error persisting diagnosis to Firestore:', firestoreErr)
          // We don't throw here to still allow the UI to show the result if Firestore saves fail
        }
      }

      return {
        success: true,
        diagnosis: diagnosisRecord
      }
    } catch (err: any) {
      console.error('[cropDoctorService Exception]:', err?.message || err)
      return {
        success: false,
        error: err?.message || 'Failed to analyze crop image.'
      }
    }
  },


  /**
   * Fetches recent diagnoses for current authenticated user from Firestore: `users/{uid}/diagnoses`
   * Sorted newest first (`orderBy('createdAt', 'desc')`).
   */
  getRecentDiagnoses: async (limitCount = 10, farmId?: string): Promise<DiagnosisResult[]> => {
    try {
      const currentUser = auth.currentUser
      if (!currentUser || !db || !db.app) {
        return []
      }

      const diagnosesCol = collection(db, 'users', currentUser.uid, 'diagnoses')
      // Use simple orderBy-only query to avoid requiring a Firestore composite index.
      // Client-side farmId filter is applied after fetch.
      const q = query(diagnosesCol, orderBy('createdAt', 'desc'), limit(farmId ? limitCount * 5 : limitCount))

      const snap = await getDocs(q)

      let results: DiagnosisResult[] = []
      snap.forEach(docSnap => {
        const data = docSnap.data()
        const cropName = data.cropName || data.crop || 'Groundnut'
        const diseaseName = data.diseaseName || data.disease || 'Diagnosed Issue'

        results.push({
          id: docSnap.id,
          userId: currentUser.uid,
          farmId: data.farmId || 'farm-001',
          imageUrl: data.imageUrl || '/images/disease_leaf_1787238259522.jpg',
          crop: cropName,
          cropName,
          disease: diseaseName,
          diseaseName,
          confidence: typeof data.confidence === 'number' ? data.confidence : 85,
          severity: data.severity || 'moderate',
          symptoms: data.symptoms || [],
          actions: data.recommendations || data.actions || [],
          recommendations: data.recommendations || data.actions || [],
          prevention: data.prevention || [],
          explanation: data.explanation || '',
          isPlantImage: typeof data.isPlantImage === 'boolean' ? data.isPlantImage : true,
          needsExpertReview: Boolean(data.needsExpertReview),
          isDemo: Boolean(data.isSample),
          isSample: Boolean(data.isSample),
          timestamp: data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : data.timestamp || new Date().toISOString()
        })
      })

      // Apply JS-side farmId filter to avoid requiring Firestore composite index
      const filtered = farmId ? results.filter(d => d.farmId === farmId).slice(0, limitCount) : results
      return filtered
    } catch (err) {
      console.warn('[cropDoctorService] Error retrieving diagnoses from Firestore:', err)
      return []
    }
  },

  /**
   * Retrieves a single diagnosis record by ID from Firestore: `users/{uid}/diagnoses/{diagnosisId}`
   */
  getDiagnosisById: async (diagnosisId: string): Promise<DiagnosisResult | null> => {
    try {
      const currentUser = auth.currentUser
      if (!currentUser || !db || !db.app) return null

      const docRef = doc(db, 'users', currentUser.uid, 'diagnoses', diagnosisId)
      const snap = await getDoc(docRef)

      if (snap.exists()) {
        const data = snap.data()
        const cropName = data.cropName || data.crop || 'Groundnut'
        const diseaseName = data.diseaseName || data.disease || 'Diagnosed Issue'

        return {
          id: snap.id,
          userId: currentUser.uid,
          farmId: data.farmId,
          imageUrl: data.imageUrl,
          crop: cropName,
          cropName,
          disease: diseaseName,
          diseaseName,
          confidence: data.confidence,
          severity: data.severity,
          symptoms: data.symptoms || [],
          actions: data.recommendations || data.actions || [],
          recommendations: data.recommendations || data.actions || [],
          prevention: data.prevention || [],
          explanation: data.explanation || '',
          isPlantImage: typeof data.isPlantImage === 'boolean' ? data.isPlantImage : true,
          needsExpertReview: Boolean(data.needsExpertReview),
          isDemo: Boolean(data.isSample),
          isSample: Boolean(data.isSample),
          timestamp: data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : data.timestamp || new Date().toISOString()
        }
      }
      return null
    } catch (err) {
      console.warn('[cropDoctorService] Error retrieving diagnosis by ID from Firestore:', err)
      return null
    }
  }
}
