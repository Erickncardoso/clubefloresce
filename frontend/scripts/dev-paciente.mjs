/**
 * Dev do app paciente (:3002) — limpa cache, libera porta e sobe um único Nuxt.
 */
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = join(import.meta.dirname, '..')
const devPort = Number(process.env.NUXT_PORT || 3002)
const backendOrigin = process.env.NUXT_DEV_API_ORIGIN || 'http://127.0.0.1:3001'

function run(cmd, args, options = {}) {
  return spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true, ...options })
}

function killPort(port) {
  if (process.platform !== 'win32') return

  const netstat = spawnSync('netstat', ['-ano'], { encoding: 'utf8', shell: true })
  if (netstat.status !== 0) return

  const pids = new Set()
  for (const line of netstat.stdout.split('\n')) {
    if (!line.includes('LISTENING') || !line.includes(`:${port}`)) continue
    const pid = line.trim().split(/\s+/).at(-1)
    if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid)
  }

  for (const pid of pids) {
    console.log(`[dev:paciente] encerrando processo ${pid} na porta ${port}`)
    run('taskkill', ['/PID', pid, '/F'])
  }
}

function cleanMobileArtifacts() {
  for (const dir of ['.nuxt-mobile', '.output']) {
    const target = join(root, dir)
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true })
      console.log(`[dev:paciente] removido ${dir}`)
    }
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

console.log(`[dev:paciente] liberando porta ${devPort}…`)
killPort(devPort)
cleanMobileArtifacts()

await assertBackendReachable()

console.log('[dev:paciente] preparando .nuxt-mobile…')
const prepare = run('npx', [
  'cross-env',
  'NUXT_PUBLIC_MOBILE_APP=true',
  'nuxt',
  'prepare',
])
if (prepare.status !== 0) process.exit(prepare.status ?? 1)

console.log(`[dev:paciente] iniciando em http://127.0.0.1:${devPort}`)
const dev = run('npx', [
  'cross-env',
  'NUXT_PUBLIC_MOBILE_APP=true',
  `NUXT_PORT=${devPort}`,
  'nuxt',
  'dev',
  '--host',
  '127.0.0.1',
])
process.exit(dev.status ?? 0)
