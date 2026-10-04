/**
 * Live evaluation harness for the crop diagnosis pipeline (calls the real Gemini API).
 *
 *   npx tsx scripts/eval-diagnosis.ts <manifest.json> [--runs 2] [--model gemini-x]
 *
 * manifest.json: [{ "file": "path/to/img.jpg", "crop": "Groundnut" | null,
 *                   "expect": ["SUCCESS", "INSUFFICIENT_EVIDENCE"], "note": "..." }]
 *
 * Reports, per image and model: outcome status, diagnosis code, certainty, latency, and
 * whether repeated runs agree. This is a smoke/consistency check, NOT an accuracy
 * benchmark — accuracy requires a labelled field test set (see docs/AI_EVALUATION.md).
 */
import '../server/loadEnv.js'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const manifestPath = args.find(a => !a.startsWith('--'))
if (!manifestPath) { console.error('usage: tsx scripts/eval-diagnosis.ts <manifest.json> [--runs N] [--model M]'); process.exit(1) }
const runs = Number(args[args.indexOf('--runs') + 1]) || (args.includes('--runs') ? 1 : 2)
const modelArg = args.includes('--model') ? args[args.indexOf('--model') + 1] : undefined
if (modelArg) process.env.GEMINI_VISION_MODEL = modelArg

// import after env is set so AI_CONFIG picks up the model
const { analyzeCropWithGeminiModule } = await import('../server/services/geminiDiagnosisModule.js')
const { AI_CONFIG } = await import('../server/config/aiConfig.js')

type Item = { file: string; crop: string | null; expect: string[]; note?: string }
const items: Item[] = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const base = path.dirname(path.resolve(manifestPath))

console.log(`model=${AI_CONFIG.VISION_MODEL} runs=${runs} images=${items.length}\n`)
let pass = 0, consistent = 0
for (const item of items) {
  const b64 = fs.readFileSync(path.resolve(base, item.file)).toString('base64')
  const outcomes: string[] = []
  for (let i = 0; i < runs; i++) {
    const t0 = Date.now()
    const r = await analyzeCropWithGeminiModule({ imageBase64: b64, farmContext: item.crop ? { crop: item.crop } : undefined })
    const ms = Date.now() - t0
    const detail = r.status === 'SUCCESS'
      ? `${r.data.diagnosisCode} | ${r.data.certainty} | sev=${r.data.severity} | crop=${r.data.cropName}${r.data.cropMatchesReported === 'no' ? ' (MISMATCH)' : ''}`
      : r.status === 'INSUFFICIENT_EVIDENCE' ? `${r.data.cropName ?? '-'} | ${[...r.data.imageQualityIssues, ...r.data.limitations].slice(0, 1).join('; ')}`
      : (r as any).message
    outcomes.push(r.status === 'SUCCESS' ? `SUCCESS:${r.data.diagnosisCode}` : r.status)
    console.log(`${path.basename(item.file).padEnd(36)} crop=${String(item.crop).padEnd(9)} run${i + 1} ${r.status.padEnd(22)} ${String(ms).padStart(6)}ms  ${detail}`)
  }
  const ok = outcomes.every(o => item.expect.includes(o.split(':')[0]))
  const same = new Set(outcomes).size === 1
  pass += ok ? 1 : 0; consistent += same ? 1 : 0
  console.log(`${''.padEnd(36)} → ${ok ? 'PASS' : 'FAIL'} (expected ${item.expect.join('|')})${same ? '' : '  ⚠ runs disagree'}${item.note ? `  — ${item.note}` : ''}\n`)
}
console.log(`SUMMARY model=${AI_CONFIG.VISION_MODEL}: ${pass}/${items.length} met expectation, ${consistent}/${items.length} consistent across ${runs} runs`)
