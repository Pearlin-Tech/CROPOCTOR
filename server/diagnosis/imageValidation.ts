/**
 * Server-side image validation for crop diagnosis.
 *
 * Never trust the client-declared MIME type: the format is detected from the file
 * signature and the pixel dimensions are read from the image header. A payload that
 * cannot be decoded this far is rejected before any AI call is made.
 */

export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic'

export interface ValidatedImage {
  base64: string
  mimeType: ImageFormat
  bytes: number
  width: number | null
  height: number | null
}

export type ImageValidationResult =
  | { ok: true; image: ValidatedImage }
  | { ok: false; reason: 'MISSING' | 'TOO_SMALL' | 'TOO_LARGE' | 'UNSUPPORTED_FORMAT' | 'CORRUPT' | 'LOW_RESOLUTION'; message: string }

export const IMAGE_LIMITS = {
  MIN_BYTES: 1024,              // anything smaller cannot hold a usable photo
  MAX_BYTES: 8 * 1024 * 1024,   // decoded size; the client compresses well below this
  MIN_DIMENSION: 160            // shortest side in pixels
}

function detectFormat(buf: Buffer): ImageFormat | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12)
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'heim', 'heis'].includes(brand)) return 'image/heic'
  }
  return null
}

function jpegDimensions(buf: Buffer): { width: number; height: number } | null {
  let i = 2
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null
    const marker = buf[i + 1]
    // Standalone markers without a length field
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue }
    if (marker === 0xff) { i += 1; continue }
    const len = buf.readUInt16BE(i + 2)
    if (len < 2) return null
    // SOF0..SOF15 except DHT (C4), JPG (C8), DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) }
    }
    i += 2 + len
  }
  return null
}

function pngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24 || buf.toString('ascii', 12, 16) !== 'IHDR') return null
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

function webpDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 30) return null
  const chunk = buf.toString('ascii', 12, 16)
  if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff }
  if (chunk === 'VP8L') {
    const b = buf.readUInt32LE(21)
    return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 }
  }
  if (chunk === 'VP8X') return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 }
  return null
}

/** Strips an optional data-URL prefix and returns the raw base64 payload. */
export function stripDataUrl(input: string): string {
  const comma = input.startsWith('data:') ? input.indexOf(',') : -1
  return (comma >= 0 ? input.slice(comma + 1) : input).replace(/\s/g, '')
}

export function validateImageBase64(input: unknown): ImageValidationResult {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return { ok: false, reason: 'MISSING', message: 'No image was provided.' }
  }
  const base64 = stripDataUrl(input)
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return { ok: false, reason: 'CORRUPT', message: 'The image data is corrupted or not valid base64.' }
  }
  const buf = Buffer.from(base64, 'base64')
  if (buf.length < IMAGE_LIMITS.MIN_BYTES) {
    return { ok: false, reason: 'TOO_SMALL', message: 'The image file is too small to analyse.' }
  }
  if (buf.length > IMAGE_LIMITS.MAX_BYTES) {
    return { ok: false, reason: 'TOO_LARGE', message: 'The image is larger than 8 MB. Please use a smaller photo.' }
  }
  const mimeType = detectFormat(buf)
  if (!mimeType) {
    return { ok: false, reason: 'UNSUPPORTED_FORMAT', message: 'Unsupported image format. Please use a JPEG, PNG, WebP or HEIC photo.' }
  }

  // HEIC dimensions live deep inside ISO-BMFF boxes; Gemini accepts HEIC natively,
  // so we only require that the container signature is valid.
  let dims: { width: number; height: number } | null = null
  if (mimeType === 'image/jpeg') dims = jpegDimensions(buf)
  else if (mimeType === 'image/png') dims = pngDimensions(buf)
  else if (mimeType === 'image/webp') dims = webpDimensions(buf)

  // A truncated JPEG still has a valid header; require the end-of-image marker near the end
  // (some cameras append trailer data after it, hence the 64 KB window).
  if (mimeType === 'image/jpeg' && buf.subarray(Math.max(0, buf.length - 65536)).lastIndexOf(Buffer.from([0xff, 0xd9])) === -1) {
    return { ok: false, reason: 'CORRUPT', message: 'The image file is incomplete or corrupted — please retake the photo.' }
  }

  if (mimeType !== 'image/heic') {
    if (!dims || dims.width === 0 || dims.height === 0) {
      return { ok: false, reason: 'CORRUPT', message: 'The image could not be decoded. It may be corrupted — please retake the photo.' }
    }
    if (Math.min(dims.width, dims.height) < IMAGE_LIMITS.MIN_DIMENSION) {
      return { ok: false, reason: 'LOW_RESOLUTION', message: `The image resolution is too low (${dims.width}×${dims.height}). Please take a closer, sharper photo.` }
    }
  }

  return {
    ok: true,
    image: { base64, mimeType, bytes: buf.length, width: dims?.width ?? null, height: dims?.height ?? null }
  }
}
