#!/usr/bin/env node
/**
 * Reproduces how Vercel runs api/index.ts: each .ts file is transpiled to an ES module
 * without bundling, then loaded by plain Node (no tsx). This catches the failures that
 * only appear in production — extensionless relative imports, directory imports, value
 * imports of TypeScript-only types — and then hits /api/health on the loaded app.
 *
 *   npm run verify:api-esm
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = process.cwd()
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'cropoctor-api-esm-'))
const tsconfig = path.join(out, 'tsconfig.json')
fs.writeFileSync(tsconfig, JSON.stringify({
  extends: path.join(root, 'tsconfig.server.json'),
  compilerOptions: { noEmit: false, outDir: out, rootDir: root, declaration: false, sourceMap: false, typeRoots: [path.join(root, 'node_modules/@types')] },
  files: [path.join(root, 'api/index.ts'), path.join(root, 'server/types/earthengine.d.ts')]
}))

try {
  execFileSync(path.join(root, 'node_modules/.bin/tsc'), ['-p', tsconfig], { stdio: 'inherit' })
  fs.copyFileSync(path.join(root, 'package.json'), path.join(out, 'package.json')) // "type": "module"
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(out, 'node_modules'))

  process.env.VERCEL = '1' // disables app.listen in api/index.ts
  const mod = await import(path.join(out, 'api/index.js'))
  const app = mod.default
  if (typeof app !== 'function') throw new Error('api/index.ts default export is not an Express app')

  const server = app.listen(0)
  await new Promise(r => server.once('listening', r))
  const { port } = server.address()
  const res = await fetch(`http://127.0.0.1:${port}/api/health`)
  const body = await res.json()
  server.close()
  if (res.status !== 200 || body.status !== 'ok') throw new Error(`/api/health returned ${res.status}`)
  console.log(`✔ api/index.ts loads as plain ESM and /api/health returns 200 (models: ${JSON.stringify(body.models)})`)
  process.exit(0)
} catch (err) {
  console.error('✖ API failed to load the way Vercel runs it:', err?.code || '', err?.message || err)
  process.exit(1)
} finally {
  fs.rmSync(out, { recursive: true, force: true })
}
