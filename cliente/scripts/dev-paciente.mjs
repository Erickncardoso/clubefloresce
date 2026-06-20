/**
 * Dev do app paciente (:3002) — páginas em cliente/, componentes via alias no nuxt.config.
 * Por padrão expõe na rede local (celular na mesma Wi-Fi). Use --local só no PC.
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const DEV_SW_PLACEHOLDER = "self.skipWaiting(); self.addEventListener('fetch', () => {});"

function ensureDevServiceWorkerFiles() {
  const targets = [
    join(root, 'dev-sw-dist', 'sw.js'),
    join(root, '.nuxt-mobile', 'dev-sw-dist', 'sw.js'),
  ]
  for (const file of targets) {
    const dir = join(file, '..')
    mkdirSync(dir, { recursive: true })
    if (!existsSync(file)) writeFileSync(file, DEV_SW_PLACEHOLDER, 'utf8')
  }
}

const root = join(import.meta.dirname, '..')
const frontendRoot = join(root, '..', 'frontend')
const localNuxt = join(root, 'node_modules', 'nuxt', 'bin', 'nuxt.mjs')
const nuxtBin = existsSync(localNuxt) ? localNuxt : join(frontendRoot, 'node_modules', 'nuxt', 'bin', 'nuxt.mjs')
const devPort = (() => {
  const portFlagIndex = process.argv.indexOf('--port')
  if (portFlagIndex !== -1 && process.argv[portFlagIndex + 1]) {
    return Number(process.argv[portFlagIndex + 1])
  }
  // Porta fixa do app paciente — ignora NUXT_PORT global do sistema (ex.: 3097)
  return Number(process.env.NUXT_CLIENTE_PORT || 3002)
})()
const backendOrigin = process.env.NUXT_DEV_API_ORIGIN || 'http://127.0.0.1:3001'

const localOnly =
  process.argv.includes('--local')
  || process.env.NUXT_LOCAL === 'true'

const lanMode = !localOnly

const devHost = localOnly
  ? (process.env.NUXT_CLIENTE_HOST || '127.0.0.1')
  : (process.env.NUXT_CLIENTE_HOST || '0.0.0.0')

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
  console.log('[cliente:dev] Abra no celular (mesma Wi-Fi):')
  if (lanAddresses.length === 0) {
    console.log(`  http://SEU-IP-LAN:${devPort}`)
    console.log('  (rode ipconfig no PowerShell para ver o IPv4 da Wi-Fi)')
  } else {
    for (const { iface, address } of lanAddresses) {
      console.log(`  http://${address}:${devPort}  (${iface})`)
    }
  }
  console.log('')
  console.log('[cliente:dev] No PC: http://127.0.0.1:' + devPort)
  console.log('[cliente:dev] Backend: npm run dev:backend (porta 3001)')
  if (process.platform === 'win32') {
    console.log('[cliente:dev] Se o celular não abre, permita Node.js no Firewall do Windows (portas 3001 e 3002).')
  }
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
      NUXT_CLIENTE_PORT: String(devPort),
      NUXT_HOST: devHost,
      NUXT_DEV_API_ORIGIN: backendOrigin,
      ...(lanMode
        ? {
            NUXT_LAN: 'true',
            NUXT_PWA_DEV: process.env.NUXT_PWA_DEV || 'true',
          }
        : {}),
      ...(localOnly ? { NUXT_LOCAL: 'true' } : {}),
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
  for (const rel of ['.output', '.nuxt-mobile', 'dev-sw-dist']) {
    const target = join(root, rel)
    if (existsSync(target)) {
      rmSync(target, { recursive: true, force: true })
      console.log(`[cliente:dev] removido ${rel}`)
    }
  }
}

async function assertBackendReachable() {
  try {
    const res = await fetch(`${backendOrigin}/api/health`, { method: 'GET' })
    if (!res.ok) {
      console.error('[cliente:dev] ERRO: backend respondeu', res.status, 'em', backendOrigin)
      process.exit(1)
    }
  } catch {
    console.error('[cliente:dev] ERRO: backend offline em', backendOrigin)
    console.error('[cliente:dev] Rode primeiro: npm run dev:backend')
    process.exit(1)
  }
}

console.log(`[cliente:dev] liberando porta ${devPort}…`)
killPort(devPort)
cleanArtifacts()
ensureDevServiceWorkerFiles()

await assertBackendReachable()

console.log('[cliente:dev] preparando Nuxt…')
const prepare = run(['prepare'])
if (prepare.status !== 0) process.exit(prepare.status ?? 1)

ensureDevServiceWorkerFiles()

if (lanMode) {
  printLanInstructions()
  console.log(`[cliente:dev] iniciando em 0.0.0.0:${devPort} (rede local + PC)`)
} else {
  console.log(`[cliente:dev] iniciando só no PC: http://127.0.0.1:${devPort}`)
  console.log('[cliente:dev] Celular? Use npm run dev:cliente (padrão) ou npm run dev:mobile:lan')
}

const dev = run(['dev', '--host', devHost])
process.exit(dev.status ?? 0)
