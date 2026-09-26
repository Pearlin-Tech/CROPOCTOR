import { doc, setDoc, collection, query, orderBy, limit, getDocs, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import { compressImageWithFallback } from '@/utils/imageCompressor'
import type { DiagnosisResult } from '@/types'
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
      console.log(`[Diagnosis] authenticated UID: ${currentUser?.uid || 'null — user not signed in'}`)
      const userId = currentUser?.uid || null

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
                userId: data.userId || userId || currentUser.uid,
                farmId: data.farmId,
                imageUrl: data.imageUrl,
                crop: data.crop,
                cropName: data.cropName,
                disease: data.disease,
                diseaseName: data.diseaseName,
                confidence: data.confidence,
                severity: data.severity,
                symptoms: data.symptoms,
                observedSymptoms: data.observedSymptoms,
                positiveSigns: data.positiveSigns,
                possibleIssues: data.possibleIssues,
                analysis: data.analysis,
                actions: data.recommendations,
                immediateActions: data.immediateActions,
                recommendations: data.recommendations,
                treatment: data.treatment,
                prevention: data.prevention,
                longTermPrevention: data.longTermPrevention,
                whenToRecheck: data.whenToRecheck,
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
            farmContext,
            language: localStorage.getItem('agri_ai_language') || 'en'
          })
        })
      } catch (fetchErr: any) {
        console.error('[cropDoctorService] Network fetch to backend failed:', fetchErr)
        throw new Error('Network error. Unable to reach diagnostic server.')
      }

      if (!response.ok) {
        // Read body ONCE as text to avoid "body is disturbed or locked"
        const errText = await response.text()
        let errMessage = `Diagnostic server error: HTTP ${response.status}`
        let errCode = 'SERVER_ERROR'
        try {
          const errJson = JSON.parse(errText)
          if (errJson.code === 'NO_PLANT_DETECTED') {
            return {
              success: false,
              error: errJson.message
            }
          }
          errMessage = errJson.error?.message || errJson.message || errMessage
          errCode = errJson.error?.code || errJson.code || errCode
        } catch {
          if (errText) errMessage = errText
        }
        
        console.error(`[cropDoctorService] Backend API returned ${response.status}:`, errMessage)
        if (response.status === 429 || errCode === 'RATE_LIMIT') {
          throw new Error('AI Quota Exceeded. The diagnosis service is temporarily unavailable due to high demand. Please try again later.')
        }
        throw new Error(errMessage)
      }

      const apiResult = await response.json()
      if (!apiResult.success || !apiResult.data) {
        throw new Error(apiResult.error?.message || apiResult.error || 'Diagnostic server returned invalid data format.')
      }

      const diagnosisData = apiResult.data
      const timestampIso = new Date().toISOString()
      
      const isPlantImage = typeof diagnosisData.isPlantImage === 'boolean' ? diagnosisData.isPlantImage : true

      const cropName = diagnosisData.cropName || diagnosisData.crop || farmContext?.crop || 'Groundnut'
      const diseaseName = diagnosisData.diseaseName || diagnosisData.disease || 'Unclear Leaf Condition'
      const confidence = typeof diagnosisData.confidence === 'number' ? diagnosisData.confidence : 85
      const severity = diagnosisData.severity || 'moderate'
      const symptoms = diagnosisData.symptoms || []
      const recommendations = diagnosisData.recommendations || diagnosisData.actions || []
      const prevention = diagnosisData.prevention || []
      const explanation = diagnosisData.explanation || ''
      // isPlantImage already declared and validated above
      const needsExpertReview = Boolean(diagnosisData.needsExpertReview)

      const observedSymptoms = diagnosisData.observedSymptoms || diagnosisData.symptoms || []
      const positiveSigns = diagnosisData.positiveSigns || []
      const possibleIssues = diagnosisData.possibleIssues || []
      const analysis = diagnosisData.analysis || diagnosisData.explanation || ''
      const immediateActions = diagnosisData.immediateActions || diagnosisData.actions || diagnosisData.recommendations || []
      const treatment = diagnosisData.treatment || diagnosisData.recommendations || []
      const longTermPrevention = diagnosisData.longTermPrevention || diagnosisData.prevention || []
      const whenToRecheck = diagnosisData.whenToRecheck || 'Within 3-5 days'

      const diagnosisRecord: DiagnosisResult = {
        id: diagnosisId,
        userId: userId || 'guest-user',
        farmId: farmContext?.farmId || 'farm-001',
        imageUrl: displayImageUrl,
        crop: cropName,
        cropName,
        disease: diseaseName,
        diseaseName,
        confidence,
        severity,
        symptoms,
        observedSymptoms,
        positiveSigns,
        possibleIssues,
        analysis,
        actions: recommendations,
        immediateActions,
        recommendations,
        treatment,
        prevention,
        longTermPrevention,
        whenToRecheck,
        explanation,
        isPlantImage,
        needsExpertReview,
        isDemo: Boolean(isSample),
        isSample: Boolean(isSample),
        timestamp: timestampIso
      }

      // 5. Persist metadata & structured result to Firestore or LocalStorage
      if (currentUser && userId && db && db.app) {
        try {
          if (isPlantImage && diseaseName.toLowerCase() !== 'non-plant image detected') {
            console.log(`[Diagnosis] writing document: users/${userId}/diagnoses/${diagnosisId}`)
            const docRef = doc(db, 'users', userId, 'diagnoses', diagnosisId)
            await setDoc(docRef, {
              userId,
              cropName,
              diseaseName,
              crop: cropName,
              disease: diseaseName,
              confidence,
              severity,
              symptoms,
              observedSymptoms,
              positiveSigns,
              possibleIssues,
              analysis,
              explanation,
              recommendations,
              immediateActions,
              treatment,
              prevention,
              longTermPrevention,
              whenToRecheck,
              needsExpertReview,
              isPlantImage,
              source,
              imageUrl: displayImageUrl,
              farmId: farmContext?.farmId || 'farm-001',
              isSample: Boolean(isSample),
              imageHash,
              language: localStorage.getItem('agri_ai_language') || 'en',
              createdAt: serverTimestamp()
            })
            console.log(
              `[Diagnosis] Firestore write successful: users/${userId}/diagnoses/${diagnosisId}`
            )

            if (diseaseName.toLowerCase() !== 'healthy plant' && diseaseName.toLowerCase() !== 'non-plant image detected') {
              await notificationService.createNotification({
                title: `New Diagnosis: ${cropName}`,
                body: `${diseaseName} detected with ${severity} severity. Click to view treatment plan.`,
                type: 'disease',
                priority: severity === 'severe' ? 'high' : 'medium',
                read: false,
                actionRoute: `/farms/${farmContext?.farmId || 'farm-001'}`,
              })
            }
          }
        } catch (firestoreErr: any) {
          console.error(
            `[Diagnosis] FIRESTORE WRITE FAILED: users/${userId}/diagnoses/${diagnosisId}` +
            ` error=${firestoreErr?.code || firestoreErr?.message}`
          )
          // Do not throw — UI must still show the result even if persistence fails
        }
      } else {
        // Fallback for guest users
        try {
          const stored = localStorage.getItem('guest_diagnoses')
          const diagnoses = stored ? JSON.parse(stored) : []
          // Check if already exists to prevent duplicates
          if (!diagnoses.find((d: any) => d.id === diagnosisId)) {
            diagnoses.unshift(diagnosisRecord)
            localStorage.setItem('guest_diagnoses', JSON.stringify(diagnoses.slice(0, 50)))
          }
        } catch (e) {
          console.warn('[cropDoctorService] Failed to save guest diagnosis to localStorage:', e)
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
   * Waits for Firebase Auth to be ready before querying.
   */
  getRecentDiagnoses: async (limitCount = 10, farmId?: string): Promise<DiagnosisResult[]> => {
    // Ensure auth is resolved — auth.currentUser may be null on first render
    const currentUser: any = await new Promise(resolve => {
      const u = auth.currentUser
      if (u !== null) return resolve(u)
      // Auth hasn't fired yet — wait for one state change event
      const unsub = auth.onAuthStateChanged(user => {
        unsub()
        resolve(user)
      })
    })

    console.log(`[Diagnosis] loading recent diagnoses: uid=${currentUser?.uid || 'null'}`)

    if (!currentUser || !db || !db.app) {
      console.log('[Diagnosis] no authenticated user — reading from localStorage')
      // Guest: read from localStorage
      try {
        const stored = localStorage.getItem('guest_diagnoses')
        if (stored) {
          const parsed = JSON.parse(stored)
          const filtered = farmId ? parsed.filter((d: any) => d.farmId === farmId) : parsed
          return filtered.slice(0, limitCount)
        }
      } catch (e) {
        console.warn('[cropDoctorService] Failed to read guest diagnoses from localStorage', e)
      }
      return []
    }

    try {
      const uid = currentUser.uid
      console.log(`[Diagnosis] history query path: users/${uid}/diagnoses (orderBy createdAt desc limit ${limitCount})`)
      const diagnosesCol = collection(db, 'users', uid, 'diagnoses')
      const q = query(diagnosesCol, orderBy('createdAt', 'desc'), limit(farmId ? limitCount * 5 : limitCount))

      const snap = await getDocs(q)
      console.log(`[Diagnosis] history documents: ${snap.size} returned from Firestore`)

      const results: DiagnosisResult[] = []
      snap.forEach(docSnap => {
        const data = docSnap.data()
        const cropName = data.cropName || data.crop || 'Groundnut'
        const diseaseName = data.diseaseName || data.disease || 'Diagnosed Issue'

        // Safe timestamp conversion — serverTimestamp() may still be null during pending writes
        let timestamp: string
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          timestamp = data.createdAt.toDate().toISOString()
        } else if (data.createdAt && typeof data.createdAt.seconds === 'number') {
          timestamp = new Date(data.createdAt.seconds * 1000).toISOString()
        } else if (data.timestamp) {
          timestamp = data.timestamp
        } else {
          timestamp = new Date().toISOString()
        }

        results.push({
          id: docSnap.id,
          userId: data.userId || uid,
          farmId: data.farmId || 'farm-001',
          imageUrl: data.imageUrl || '/images/disease_leaf_1787238259522.jpg',
          crop: cropName,
          cropName,
          disease: diseaseName,
          diseaseName,
          confidence: typeof data.confidence === 'number' ? data.confidence : 85,
          severity: data.severity || 'moderate',
          symptoms: data.symptoms || [],
          observedSymptoms: data.observedSymptoms || data.symptoms || [],
          positiveSigns: data.positiveSigns || [],
          possibleIssues: data.possibleIssues || [],
          analysis: data.analysis || data.explanation || '',
          actions: data.recommendations || data.actions || [],
          immediateActions: data.immediateActions || data.actions || data.recommendations || [],
          recommendations: data.recommendations || data.actions || [],
          treatment: data.treatment || data.recommendations || [],
          prevention: data.prevention || [],
          longTermPrevention: data.longTermPrevention || data.prevention || [],
          whenToRecheck: data.whenToRecheck || 'Within 3-5 days',
          explanation: data.explanation || '',
          isPlantImage: typeof data.isPlantImage === 'boolean' ? data.isPlantImage : true,
          needsExpertReview: Boolean(data.needsExpertReview),
          isDemo: Boolean(data.isSample),
          isSample: Boolean(data.isSample),
          timestamp
        })
      })

      const filtered = farmId ? results.filter(d => d.farmId === farmId).slice(0, limitCount) : results
      console.log(`[Diagnosis] loading history: ${filtered.length} records after farmId filter`)
      return filtered
    } catch (err: any) {
      // Distinguish permission-denied from network/empty errors
      if (err?.code === 'permission-denied') {
        console.error(`[Diagnosis] PERMISSION DENIED reading users/${currentUser.uid}/diagnoses — check deployed Firestore rules`)
        throw new Error('FIRESTORE_PERMISSION_DENIED')
      }
      console.error('[cropDoctorService] Error retrieving diagnoses from Firestore:', err)
      throw err
    }
  },

  /**
   * Retrieves a single diagnosis record by ID from Firestore: `users/{uid}/diagnoses/{diagnosisId}`
   */
  getDiagnosisById: async (diagnosisId: string): Promise<DiagnosisResult | null> => {
    try {
      const currentUser = auth.currentUser
      if (!currentUser || !db || !db.app) {
        try {
          const stored = localStorage.getItem('guest_diagnoses')
          if (stored) {
            const parsed = JSON.parse(stored)
            return parsed.find((d: any) => d.id === diagnosisId) || null
          }
        } catch (e) {}
        return null
      }

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
          observedSymptoms: data.observedSymptoms || data.symptoms || [],
          positiveSigns: data.positiveSigns || [],
          possibleIssues: data.possibleIssues || [],
          analysis: data.analysis || data.explanation || '',
          actions: data.recommendations || data.actions || [],
          immediateActions: data.immediateActions || data.actions || data.recommendations || [],
          recommendations: data.recommendations || data.actions || [],
          treatment: data.treatment || data.recommendations || [],
          prevention: data.prevention || [],
          longTermPrevention: data.longTermPrevention || data.prevention || [],
          whenToRecheck: data.whenToRecheck || 'Within 3-5 days',
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
