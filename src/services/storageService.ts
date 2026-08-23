export type ImageSource = 'camera' | 'upload' | 'sample'

export interface StorageUploadMetadata {
  diagnosisId: string
  storagePath: string | null
  downloadUrl: string | null
  fileType: string
  fileSize: number
  source: ImageSource
  error: string | null
}

/**
 * Validates image file before client-side compression (MIME type check and max size).
 */
export function validateImageFile(file: File | Blob, maxSizeMB = 10): { valid: boolean; error: string | null } {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB selected).` }
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const fileType = file.type?.toLowerCase() || ''
  
  if (fileType && !allowedTypes.some(t => fileType.includes(t.replace('image/', '')))) {
    return { valid: false, error: 'Invalid format. Please select a JPG, JPEG, PNG, or WEBP image file.' }
  }

  return { valid: true, error: null }
}

/**
 * Helper to fetch sample image as Blob for demonstration
 */
export async function fetchSampleImageBlob(sampleUrl: string): Promise<Blob | null> {
  try {
    const res = await fetch(sampleUrl)
    if (!res.ok) return null
    return await res.blob()
  } catch (e) {
    console.warn('[storageService] Unable to fetch sample image blob:', e)
    return null
  }
}
