/**
 * Diagnosis pipeline tests — image validation, Gemini error classification, schema
 * validation and outcome classification. Gemini is replaced by an injected fetch.
 *
 * Run with: npm test
 */
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { validateImageBase64 } from '../diagnosis/imageValidation.js'
import { analyzeCropWithGeminiModule, parseModelOutput, STATUS_HTTP, type ModelOutput } from '../services/geminiDiagnosisModule.js'
import { getTaxonomyForCrop } from '../config/cropTaxonomy.js'

const JPEG = fs.readFileSync(path.join(process.cwd(), 'public/images/disease_leaf_1787238259522.jpg'))
const JPEG_B64 = JPEG.toString('base64')

function makePng(width: number, height: number): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (buf: Buffer) => {
    let c = 0xffffffff
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td))
    return Buffer.concat([len, td, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8-bit RGB
  // Noisy pixels so the file is comfortably above the minimum byte size
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 2654435761) >>> 24
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
  ])
}

const validModel = (over: Partial<ModelOutput> = {}): ModelOutput => ({
  isPlantImage: true,
  observedCrop: 'Groundnut',
  cropMatchesReported: 'yes',
  imageQuality: 'good',
  imageQualityIssues: [],
  diagnosisCode: 'early leaf spot',
  diagnosisName: 'Early leaf spot',
  certainty: 'moderate',
  severity: 'mild',
  visibleSymptoms: ['Circular brown spots on upper leaf surface'],
  supportingEvidence: ['Circular brown lesions 2–5 mm with yellow halos'],
  contradictingEvidence: [],
  alternativeDiagnoses: ['Late leaf spot — lesions are similar in colour'],
  limitations: ['Only the upper leaf surface is visible'],
  summary: 'Brown circular lesions with halos are typical of early leaf spot.',
  ...over
})

/** Fake fetch returning a Gemini-shaped response (or an error) */
function geminiFetch(responses: Array<{ status: number; body?: any; throws?: Error; headers?: Record<string, string> }>) {
  const calls: any[] = []
  const impl = (async (url: string, init: any) => {
    calls.push({ url, init })
    const r = responses[Math.min(calls.length - 1, responses.length - 1)]
    if (r.throws) throw r.throws
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status, headers: r.headers })
  }) as unknown as typeof fetch
  return { impl, calls }
}
const ok = (obj: unknown) => ({ status: 200, body: { candidates: [{ content: { parts: [{ text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] }, finishReason: 'STOP' }] } })
const noSleep = { sleep: async () => {} }
const ctx = { crop: 'Groundnut' }

before(() => { process.env.GEMINI_API_KEY = 'test-key-not-real' })

// ── Image validation ─────────────────────────────────────────────────────────

describe('image validation', () => {
  it('accepts a real JPEG and reads its dimensions', () => {
    const r = validateImageBase64(JPEG_B64)
    assert.equal(r.ok, true)
    if (r.ok) {
      assert.equal(r.image.mimeType, 'image/jpeg')
      assert.ok((r.image.width ?? 0) > 0 && (r.image.height ?? 0) > 0)
    }
  })
  it('accepts a data-URL prefixed image', () => {
    assert.equal(validateImageBase64(`data:image/jpeg;base64,${JPEG_B64}`).ok, true)
  })
  it('accepts a PNG and reads its dimensions', () => {
    const r = validateImageBase64(makePng(400, 300).toString('base64'))
    assert.equal(r.ok, true)
    if (r.ok) assert.deepEqual([r.image.width, r.image.height], [400, 300])
  })
  it('rejects a missing image', () => {
    const r = validateImageBase64(undefined)
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.reason, 'MISSING')
  })
  it('rejects a non-image file', () => {
    const r = validateImageBase64(Buffer.from('%PDF-1.7 '.repeat(400)).toString('base64'))
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.reason, 'UNSUPPORTED_FORMAT')
  })
  it('rejects a truncated (corrupt) JPEG', () => {
    const r = validateImageBase64(JPEG.subarray(0, Math.floor(JPEG.length / 2)).toString('base64'))
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.reason, 'CORRUPT')
  })
  it('rejects invalid base64', () => {
    const r = validateImageBase64('not*valid*base64!!'.repeat(100))
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.reason, 'CORRUPT')
  })
  it('rejects a low-resolution image', () => {
    const r = validateImageBase64(makePng(100, 100).toString('base64'))
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.reason, 'LOW_RESOLUTION')
  })
  it('rejects an oversized image', () => {
    const big = Buffer.concat([JPEG.subarray(0, 20), Buffer.alloc(9 * 1024 * 1024)])
    const r = validateImageBase64(big.toString('base64'))
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.reason, 'TOO_LARGE')
  })
})

// ── Pipeline outcomes ────────────────────────────────────────────────────────

describe('analyzeCropWithGeminiModule', () => {
  it('SUCCESS: valid diagnosis uses knowledge-base guidance and no numeric confidence', async () => {
    const { impl, calls } = geminiFetch([ok(validModel())])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64, farmContext: ctx }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'SUCCESS')
    assert.equal(calls.length, 1)
    // the API key travels in a header, not the URL
    assert.ok(!calls[0].url.includes('key='))
    assert.equal(calls[0].init.headers['x-goog-api-key'], 'test-key-not-real')
    // the real image bytes are sent
    const sent = JSON.parse(calls[0].init.body)
    assert.equal(sent.contents[0].parts[0].inlineData.data, JPEG_B64)
    assert.equal(sent.generationConfig.temperature, 0)
    if (r.status === 'SUCCESS') {
      assert.equal(r.data.diseaseName, 'Early leaf spot')
      assert.equal(r.data.severity, 'mild')
      assert.equal(r.data.certainty, 'moderate')
      assert.equal((r.data as any).confidence, undefined)
      assert.ok(r.data.treatment.every(t => !/\d+\s*(g|ml|kg)\b/i.test(t)), 'treatment must not contain model-invented doses')
      assert.equal(r.data.needsExpertReview, true)
      assert.equal(r.data.provenance.model.length > 0, true)
    }
  })

  it('NOT_A_PLANT: non-plant image is rejected and carries no diagnosis', async () => {
    const { impl } = geminiFetch([ok(validModel({ isPlantImage: false }))])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64 }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'NOT_A_PLANT')
    assert.equal(r.success, false)
    assert.equal(STATUS_HTTP.NOT_A_PLANT, 422)
  })

  it('INSUFFICIENT_EVIDENCE: no disease, no treatment, verification guidance only', async () => {
    const { impl } = geminiFetch([ok(validModel({ diagnosisCode: 'insufficient evidence', certainty: 'insufficient_evidence' }))])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64, farmContext: ctx }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'INSUFFICIENT_EVIDENCE')
    if (r.status === 'INSUFFICIENT_EVIDENCE') {
      const d: any = r.data
      assert.equal(d.diseaseName, undefined)
      assert.equal(d.treatment, undefined)
      assert.equal(d.severity, undefined)
      assert.ok(d.guidance.length > 0)
      assert.ok(!JSON.stringify(d).match(/conazole|mancozeb|g\/l/i))
    }
  })

  it('INSUFFICIENT_EVIDENCE: unusable image quality overrides a claimed disease', async () => {
    const { impl } = geminiFetch([ok(validModel({ imageQuality: 'unusable', certainty: 'high' }))])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64, farmContext: ctx }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'INSUFFICIENT_EVIDENCE')
  })

  it('INSUFFICIENT_EVIDENCE: a disease claim without supporting evidence is not a diagnosis', async () => {
    const { impl } = geminiFetch([ok(validModel({ supportingEvidence: [] }))])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64, farmContext: ctx }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'INSUFFICIENT_EVIDENCE')
  })

  it('low certainty → conservative, non-specific treatment', async () => {
    const { impl } = geminiFetch([ok(validModel({ certainty: 'low' }))])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64, farmContext: ctx }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'SUCCESS')
    if (r.status === 'SUCCESS') assert.match(r.data.treatment.join(' '), /Do not apply pesticides until the problem is confirmed/)
  })

  it('healthy plant → severity healthy, no treatment, no expert-review flag', async () => {
    const { impl } = geminiFetch([ok(validModel({ diagnosisCode: 'healthy', diagnosisName: 'Healthy', severity: 'mild', supportingEvidence: [] }))])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64, farmContext: ctx }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'SUCCESS')
    if (r.status === 'SUCCESS') {
      assert.equal(r.data.severity, 'healthy')
      assert.deepEqual(r.data.treatment, [])
      assert.equal(r.data.needsExpertReview, false)
    }
  })

  it('crop mismatch is reported as a limitation and needs expert review', async () => {
    const { impl } = geminiFetch([ok(validModel({ cropMatchesReported: 'no', observedCrop: 'Tomato', diagnosisCode: 'early leaf spot' }))])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64, farmContext: ctx }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'SUCCESS')
    if (r.status === 'SUCCESS') {
      assert.equal(r.data.cropName, 'Tomato')
      assert.match(r.data.limitations[0], /Tomato.*Groundnut/)
    }
  })

  it('RATE_LIMITED: 429 is retried on the SAME model, then surfaces as RATE_LIMITED', async () => {
    const { impl, calls } = geminiFetch([{ status: 429, body: { error: { message: 'Resource exhausted' } }, headers: { 'retry-after': '30' } }])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64 }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'RATE_LIMITED')
    assert.equal(r.success, false)
    if (!r.success) assert.equal(r.retryAfterSeconds, 30)
    assert.equal(calls.length, 3)
    assert.equal(new Set(calls.map(c => c.url)).size, 1, 'must not cascade to other models')
  })

  it('AI_SERVICE_UNAVAILABLE: 503 never produces a diagnosis', async () => {
    const { impl } = geminiFetch([{ status: 503, body: { error: { message: 'The model is overloaded' } } }])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64, farmContext: ctx }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'AI_SERVICE_UNAVAILABLE')
    assert.equal(r.success, false)
    assert.equal((r as any).data, undefined)
  })

  it('transient 503 followed by success recovers on the same model', async () => {
    const { impl, calls } = geminiFetch([{ status: 503 }, ok(validModel())])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64, farmContext: ctx }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'SUCCESS')
    assert.equal(calls.length, 2)
    if (r.status === 'SUCCESS') assert.equal(r.data.provenance.attempts, 2)
  })

  it('TIMEOUT: aborted request maps to TIMEOUT', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
    const { impl } = geminiFetch([{ status: 0, throws: abort }])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64 }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'TIMEOUT')
  })

  it('NETWORK_ERROR: fetch failure maps to NETWORK_ERROR', async () => {
    const { impl } = geminiFetch([{ status: 0, throws: new TypeError('fetch failed') }])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64 }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'NETWORK_ERROR')
  })

  it('AUTHENTICATION_ERROR: invalid API key is not retried', async () => {
    const { impl, calls } = geminiFetch([{ status: 400, body: { error: { message: 'API key not valid', details: [{ reason: 'API_KEY_INVALID' }] } } }])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64 }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'AUTHENTICATION_ERROR')
    assert.equal(calls.length, 1)
  })

  it('INVALID_REQUEST: plain 400 is not retried', async () => {
    const { impl, calls } = geminiFetch([{ status: 400, body: { error: { message: 'Unable to process input image' } } }])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64 }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'INVALID_REQUEST')
    assert.equal(calls.length, 1)
  })

  it('INVALID_AI_RESPONSE: non-JSON text', async () => {
    const { impl } = geminiFetch([ok('I think this is leaf rust.')])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64 }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'INVALID_AI_RESPONSE')
  })

  it('INVALID_AI_RESPONSE: JSON that violates the schema', async () => {
    const { impl } = geminiFetch([ok({ ...validModel(), certainty: 'very sure', severity: 42 })])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64 }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'INVALID_AI_RESPONSE')
  })

  it('INVALID_AI_RESPONSE: empty candidate (e.g. safety block)', async () => {
    const { impl } = geminiFetch([{ status: 200, body: { candidates: [{ finishReason: 'SAFETY' }] } }])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64 }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'INVALID_AI_RESPONSE')
  })

  it('INVALID_REQUEST: invalid image never reaches the AI', async () => {
    const { impl, calls } = geminiFetch([ok(validModel())])
    const r = await analyzeCropWithGeminiModule({ imageBase64: Buffer.from('hello').toString('base64') }, { fetchImpl: impl, ...noSleep })
    assert.equal(r.status, 'INVALID_REQUEST')
    assert.equal(calls.length, 0)
  })

  it('missing GEMINI_API_KEY fails closed without calling the AI', async () => {
    const saved = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY
    const { impl, calls } = geminiFetch([ok(validModel())])
    const r = await analyzeCropWithGeminiModule({ imageBase64: JPEG_B64 }, { fetchImpl: impl, ...noSleep })
    process.env.GEMINI_API_KEY = saved
    assert.equal(r.status, 'AUTHENTICATION_ERROR')
    assert.equal(calls.length, 0)
  })
})

describe('parseModelOutput', () => {
  const tax = getTaxonomyForCrop('Groundnut')
  it('rejects a diagnosis code outside the crop taxonomy', () => {
    assert.equal(parseModelOutput(JSON.stringify(validModel({ diagnosisCode: 'late blight' })), tax), null)
  })
  it('accepts fenced JSON', () => {
    assert.ok(parseModelOutput('```json\n' + JSON.stringify(validModel()) + '\n```', tax))
  })
})
