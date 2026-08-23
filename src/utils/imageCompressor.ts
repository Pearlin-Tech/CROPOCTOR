/**
 * In-Browser Canvas Image Compressor
 * Resizes and compresses crop leaf photos in browser memory before sending base64 payloads to diagnostic APIs.
 * Compliant with Firebase Free Spark plan (Zero Cloud Storage uploads).
 */

export interface CompressionResult {
  compressedBase64: string // Base64 data URI for temporary diagnosis request
  thumbnailBase64: string  // Low-res thumbnail data URI (~5-10 KB) for Firestore display
  originalSizeBytes: number
  compressedSizeBytes: number
  width: number
  height: number
  format: 'image/jpeg' | 'image/webp'
}

/**
 * Resizes and compresses an image File or Blob using native HTML5 Canvas.
 * @param file Input image File or Blob
 * @param maxDimension Maximum dimension (width/height) in pixels (default: 1024px)
 * @param quality Quality ratio 0.0 - 1.0 (default: 0.78 for optimal agronomic leaf detail)
 */
export async function compressImage(
  file: File | Blob,
  maxDimension = 1024,
  quality = 0.78
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const originalWidth = img.width
      const originalHeight = img.height

      // Scale down preserving aspect ratio
      let targetWidth = originalWidth
      let targetHeight = originalHeight

      if (targetWidth > maxDimension || targetHeight > maxDimension) {
        if (targetWidth > targetHeight) {
          targetHeight = Math.round((targetHeight * maxDimension) / targetWidth)
          targetWidth = maxDimension
        } else {
          targetWidth = Math.round((targetWidth * maxDimension) / targetHeight)
          targetHeight = maxDimension
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = targetWidth
      canvas.height = targetHeight
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'))
        return
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

      // Test WEBP support, fallback to JPEG
      let format: 'image/jpeg' | 'image/webp' = 'image/jpeg'
      let compressedBase64 = canvas.toDataURL('image/jpeg', quality)

      try {
        const webpCandidate = canvas.toDataURL('image/webp', quality)
        if (webpCandidate.startsWith('data:image/webp')) {
          compressedBase64 = webpCandidate
          format = 'image/webp'
        }
      } catch {
        // Fallback to JPEG
      }

      // Generate miniature thumbnail (max 180px)
      const thumbCanvas = document.createElement('canvas')
      const thumbMax = 180
      let thumbW = targetWidth
      let thumbH = targetHeight

      if (thumbW > thumbMax || thumbH > thumbMax) {
        if (thumbW > thumbH) {
          thumbH = Math.round((thumbH * thumbMax) / thumbW)
          thumbW = thumbMax
        } else {
          thumbW = Math.round((thumbW * thumbMax) / thumbH)
          thumbH = thumbMax
        }
      }

      thumbCanvas.width = thumbW
      thumbCanvas.height = thumbH
      const thumbCtx = thumbCanvas.getContext('2d')
      if (thumbCtx) {
        thumbCtx.imageSmoothingEnabled = true
        thumbCtx.imageSmoothingQuality = 'medium'
        thumbCtx.drawImage(canvas, 0, 0, thumbW, thumbH)
      }

      const thumbnailBase64 = thumbCanvas.toDataURL('image/jpeg', 0.55)

      // Calculate approximate byte size of compressed base64
      const base64Body = compressedBase64.split(',')[1] || ''
      const compressedSizeBytes = Math.round(base64Body.length * 0.75)

      resolve({
        compressedBase64,
        thumbnailBase64,
        originalSizeBytes: file.size,
        compressedSizeBytes,
        width: targetWidth,
        height: targetHeight,
        format
      })
    }

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image into browser memory'))
    }

    img.src = objectUrl
  })
}

/**
 * Safely compresses image with fallback to raw FileReader if Canvas compression fails.
 */
export async function compressImageWithFallback(file: File | Blob): Promise<{
  compressedBase64: string
  thumbnailBase64: string
  compressedSizeBytes: number
  isFallback: boolean
}> {
  try {
    const res = await compressImage(file, 1024, 0.78)
    return {
      compressedBase64: res.compressedBase64,
      thumbnailBase64: res.thumbnailBase64,
      compressedSizeBytes: res.compressedSizeBytes,
      isFallback: false
    }
  } catch (err) {
    console.warn('[imageCompressor] Compression failed, operating in fallback mode:', err)
    
    // Convert to uncompressed base64 via FileReader
    const rawBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (e) => reject(e)
      reader.readAsDataURL(file)
    })

    return {
      compressedBase64: rawBase64,
      thumbnailBase64: rawBase64,
      compressedSizeBytes: file.size,
      isFallback: true
    }
  }
}
