import type { Request, Response } from 'express'
import { analyzeCropWithGemini } from '../server/services/diagnosisService'

export default async function handler(req: Request, res: Response) {
  // CORS setup for serverless endpoint
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method Not Allowed' })
    return
  }

  try {
    const { imageBase64, imageUrl, isSample, farmContext } = req.body || {}

    const result = await analyzeCropWithGemini({
      imageBase64,
      imageUrl,
      isSample: Boolean(isSample),
      farmContext
    })

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to process crop diagnosis'
      })
      return
    }

    res.status(200).json({
      success: true,
      data: result.data
    })
  } catch (err: any) {
    console.error('[Serverless /api/diagnose exception]:', err)
    res.status(500).json({
      success: false,
      error: err?.message || 'Internal Server Error'
    })
  }
}
