/**
 * Limpa artefatos de generate/build que quebram o `nuxt dev` do app paciente.
 */
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = join(import.meta.dirname, '..')
const staleDirs = ['.nuxt-mobile/dist', '.output']
const backendOrigin = process.env.NUXT_DEV_API_ORIGIN || 'http://127.0.0.1:3001'

for (const dir of staleDirs) {
  const target = join(root, dir)
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true })
    console.log(`[dev:paciente] removido ${dir}`)
  }
}

async function assertBackendReachable() {
  try {
    const res = await fetch(`${backendOrigin}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '', password: '' }),
    })
    const type = res.headers.get('content-type') || ''
    if (type.includes('text/html') || type.includes('text/plain')) {
      console.error('')
      console.error('[dev:paciente] ERRO: a porta 3001 NÃO é o backend Express.')
      console.error('  Outro app (ex: nuxt dev em cliente/) está ocupando 3001.')
      console.error('  1) Feche outros terminais com nuxt/node')
      console.error('  2) Rode: npm run dev:backend')
      console.error('  3) Rode de novo: npm run dev:paciente')
      console.error('')
      process.exit(1)
    }
  } catch {
    console.error('')
    console.error('[dev:paciente] ERRO: backend não responde em', backendOrigin)
    console.error('  Rode em outro terminal: npm run dev:backend')
    console.error('')
    process.exit(1)
  }
}

await assertBackendReachable()

const prepare = spawnSync(
  'npx',
  ['cross-env', 'NUXT_PUBLIC_MOBILE_APP=true', 'nuxt', 'prepare'],
  { cwd: root, stdio: 'inherit', shell: true },
)
if (prepare.status !== 0) process.exit(prepare.status ?? 1)

const dev = spawnSync(
  'npx',
  ['cross-env', 'NUXT_PUBLIC_MOBILE_APP=true', 'NUXT_PORT=3002', 'nuxt', 'dev'],
  { cwd: root, stdio: 'inherit', shell: true },
)
process.exit(dev.status ?? 0)
