import type { Request, Response } from 'express'
import { analyzeCropWithGeminiModule } from '../server/services/geminiDiagnosisModule'

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
]

/**
 * Vercel Serverless Function Endpoint: POST /api/analyze-crop
 * Securely proxies crop diagnostic image analysis to Gemini 2.5 Flash Vision API.
 * Keeps GEMINI_API_KEY isolated on the server side.
 */
export default async function handler(req: Request, res: Response) {
  // CORS setup for serverless execution
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // 1. Validate HTTP Method
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Please send a POST request.'
    })
    return
  }

  try {
    const { imageBase64, mimeType, imageUrl, isSample, farmContext } = req.body || {}

    // 2. Validate Presence of Image Data
    if (!imageBase64 && !imageUrl && !isSample) {
      res.status(400).json({
        success: false,
        error: 'An image (imageBase64, imageUrl, or sample mode) is required for crop diagnosis.'
      })
      return
    }

    // 3. Validate MIME Type if imageBase64 is provided
    if (imageBase64 && mimeType) {
      const normalizedMime = String(mimeType).toLowerCase()
      const isAllowed = ALLOWED_MIME_TYPES.some(t => normalizedMime.includes(t.replace('image/', '')))
      if (!isAllowed) {
        res.status(400).json({
          success: false,
          error: 'Unsupported image format. Please select a JPEG, PNG, or WebP photo.'
        })
        return
      }
    }

    // 4. Validate Payload Size (< 15MB)
    if (imageBase64 && String(imageBase64).length > 15 * 1024 * 1024) {
      res.status(413).json({
        success: false,
        error: 'Payload Too Large. Please select an image under 15MB.'
      })
      return
    }

    // 5. Execute Gemini Diagnosis via isolated service module
    const result = await analyzeCropWithGeminiModule({
      imageBase64,
      mimeType: mimeType || 'image/jpeg',
      imageUrl,
      isSample: Boolean(isSample),
      farmContext
    })

    if (!result.success || !result.data) {
      res.status(400).json({
        success: false,
        error: result.error || 'Unable to process crop image diagnosis.'
      })
      return
    }

    // 6. Return Structured Diagnosis JSON (without leaking any keys or stack traces)
    res.status(200).json({
      success: true,
      data: result.data
    })
  } catch (err: any) {
    // Log detailed server error internally; never expose stack trace or keys to client
    console.error('[Serverless /api/analyze-crop exception]:', err?.message || err)
    
    res.status(500).json({
      success: false,
      error: 'An internal server error occurred while processing the diagnostic request.'
    })
  }
}
