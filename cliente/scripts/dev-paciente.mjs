/**
 * Dev do app paciente (:3002) — páginas em cliente/, componentes via alias no nuxt.config.
 * Use --lan para expor na rede local (celular na mesma Wi-Fi).
 */
import { existsSync, rmSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = join(import.meta.dirname, '..')
const frontendRoot = join(root, '..', 'frontend')
const localNuxt = join(root, 'node_modules', 'nuxt', 'bin', 'nuxt.mjs')
const nuxtBin = existsSync(localNuxt) ? localNuxt : join(frontendRoot, 'node_modules', 'nuxt', 'bin', 'nuxt.mjs')
const devPort = Number(process.env.NUXT_PORT || 3002)
const backendOrigin = process.env.NUXT_DEV_API_ORIGIN || 'http://localhost:3001'
const lanMode =
  process.argv.includes('--lan')
  || process.env.NUXT_LAN === 'true'
  || process.env.NUXT_HOST === '0.0.0.0'
const devHost = lanMode ? '0.0.0.0' : (process.env.NUXT_HOST || '127.0.0.1')

function getLanAddresses() {
  const addresses = []
  for (const [iface, nets] of Object.entries(networkInterfaces())) {
    for (const net of nets || []) {
      if (net.family !== 'IPv4' || net.internal) continue
      addresses.push({ iface, address: net.address })
    }
  }
  return addresses
}

function printLanInstructions() {
  const lanAddresses = getLanAddresses()
  console.log('')
  console.log('[cliente:dev] Modo LAN ativo — abra no celular (mesma Wi-Fi):')
  if (lanAddresses.length === 0) {
    console.log(`  http://SEU-IP-LAN:${devPort}`)
    console.log('  (rode ipconfig no PowerShell para ver o IPv4)')
  } else {
    for (const { iface, address } of lanAddresses) {
      console.log(`  http://${address}:${devPort}  (${iface})`)
    }
  }
  console.log('')
  console.log('[cliente:dev] No PC: http://127.0.0.1:' + devPort)
  console.log('[cliente:dev] Backend precisa estar rodando: npm run dev:backend')
  console.log('')
}

function run(args, options = {}) {
  return spawnSync(process.execPath, [nuxtBin, ...args], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      NUXT_PUBLIC_MOBILE_APP: 'true',
      NUXT_PORT: String(devPort),
      NUXT_HOST: devHost,
      ...(lanMode ? { NUXT_PWA_DEV: process.env.NUXT_PWA_DEV || 'true' } : {}),
    },
    ...options,
  })
}

function killPort(port) {
  if (process.platform !== 'win32') return

  const netstat = spawnSync('netstat', ['-ano'], { encoding: 'utf8', shell: true })
  if (netstat.status !== 0) return

  const pids = new Set()
  for (const line of netstat.stdout.split('\n')) {
    if (!line.includes('LISTENING') || !line.includes(`:${port}`)) continue
    const procId = line.trim().split(/\s+/).at(-1)
    if (procId && /^\d+$/.test(procId) && procId !== '0') pids.add(procId)
  }

  for (const procId of pids) {
    console.log(`[cliente:dev] encerrando processo ${procId} na porta ${port}`)
    spawnSync('taskkill', ['/PID', procId, '/F'], { shell: true, stdio: 'inherit' })
  }
}

function cleanArtifacts() {
  for (const rel of ['.output', '.nuxt-mobile']) {
    const target = join(root, rel)
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true })
      console.log(`[cliente:dev] removido ${rel}`)
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
      console.error('[cliente:dev] ERRO: porta 3001 não é o backend. Rode: npm run dev:backend')
      process.exit(1)
    }
  } catch {
    console.error('[cliente:dev] ERRO: backend offline em', backendOrigin)
    process.exit(1)
  }
}

console.log(`[cliente:dev] liberando porta ${devPort}…`)
killPort(devPort)
cleanArtifacts()

await assertBackendReachable()

console.log('[cliente:dev] preparando Nuxt…')
const prepare = run(['prepare'])
if (prepare.status !== 0) process.exit(prepare.status ?? 1)

if (lanMode) {
  printLanInstructions()
  console.log(`[cliente:dev] iniciando em 0.0.0.0:${devPort} (rede local)`)
} else {
  console.log(`[cliente:dev] iniciando em http://127.0.0.1:${devPort}`)
  console.log('[cliente:dev] Celular na mesma Wi-Fi? Use: npm run dev:mobile:lan')
}

const dev = run(['dev', '--host', devHost])
process.exit(dev.status ?? 0)
