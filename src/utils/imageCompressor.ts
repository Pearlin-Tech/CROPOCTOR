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
  quality: ImageQualityMetrics
}

export interface ImageQualityMetrics {
  /** mean luminance 0–255 */
  brightness: number
  /** variance of the Laplacian on a ≤256px greyscale copy; low = blurry */
  sharpness: number
}

/** Thresholds calibrated on sharp (≈1000–2400), blurred (≈2) and very dark (mean ≈9) photos. */
export const QUALITY_LIMITS = { MIN_BRIGHTNESS: 35, MAX_BRIGHTNESS: 250, MIN_SHARPNESS: 15 }

export function measureImageQuality(source: CanvasImageSource, width: number, height: number): ImageQualityMetrics {
  const scale = Math.min(1, 256 / Math.max(width, height))
  const w = Math.max(3, Math.round(width * scale))
  const h = Math.max(3, Math.round(height * scale))
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { brightness: 128, sharpness: Infinity }
  ctx.drawImage(source, 0, 0, w, h)
  const px = ctx.getImageData(0, 0, w, h).data
  const g = new Float32Array(w * h)
  let sum = 0
  for (let i = 0; i < w * h; i++) {
    g[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]
    sum += g[i]
  }
  let lapSum = 0, lapSq = 0, n = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const v = g[i - 1] + g[i + 1] + g[i - w] + g[i + w] - 4 * g[i]
      lapSum += v; lapSq += v * v; n++
    }
  }
  const mean = lapSum / n
  return { brightness: sum / (w * h), sharpness: lapSq / n - mean * mean }
}

/** Returns a reason code and English description, or null if the photo is usable. */
export function describeQualityProblem(q: ImageQualityMetrics): { reason: 'TOO_DARK' | 'OVEREXPOSED' | 'BLURRY'; message: string } | null {
  if (q.brightness < QUALITY_LIMITS.MIN_BRIGHTNESS) return { reason: 'TOO_DARK', message: 'This photo is too dark to analyse. Please retake it in daylight.' }
  if (q.brightness > QUALITY_LIMITS.MAX_BRIGHTNESS) return { reason: 'OVEREXPOSED', message: 'This photo is overexposed. Please retake it without direct glare or flash.' }
  if (q.sharpness < QUALITY_LIMITS.MIN_SHARPNESS) return { reason: 'BLURRY', message: 'This photo is too blurry to analyse. Hold the camera steady and tap the leaf to focus.' }
  return null
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
      const qualityMetrics = measureImageQuality(canvas, targetWidth, targetHeight)

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
        format,
        quality: qualityMetrics
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
  quality?: ImageQualityMetrics
}> {
  try {
    const res = await compressImage(file, 1024, 0.78)
    return {
      compressedBase64: res.compressedBase64,
      thumbnailBase64: res.thumbnailBase64,
      compressedSizeBytes: res.compressedSizeBytes,
      isFallback: false,
      quality: res.quality
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
