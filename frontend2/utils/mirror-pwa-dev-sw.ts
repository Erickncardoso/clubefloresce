import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, watch, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const PLACEHOLDER_SW = "self.skipWaiting(); self.addEventListener('fetch', () => {});"

function writePlaceholder(file: string) {
  if (existsSync(file)) return
  try {
    mkdirSync(join(file, '..'), { recursive: true })
    writeFileSync(file, PLACEHOLDER_SW, 'utf8')
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException)?.code
    if (code === 'EBUSY' || code === 'EPERM') return
    throw error
  }
}

function swPaths(projectRoot: string, buildDir: string) {
  return {
    root: join(projectRoot, 'dev-sw-dist'),
    rootSw: join(projectRoot, 'dev-sw-dist', 'sw.js'),
    build: join(projectRoot, buildDir, 'dev-sw-dist'),
    buildSw: join(projectRoot, buildDir, 'dev-sw-dist', 'sw.js'),
  }
}

/** Cria placeholders antes do Vite subir — evita ENOENT no Windows. */
export function ensurePwaDevSwPlaceholder(projectRoot: string, buildDir = '.nuxt-mobile') {
  const { rootSw, buildSw } = swPaths(projectRoot, buildDir)
  writePlaceholder(rootSw)
  writePlaceholder(buildSw)
}

/**
 * vite-plugin-pwa gera o SW em `{buildDir}/dev-sw-dist`, mas o Vite em dev
 * ainda tenta ler `{root}/dev-sw-dist/sw.js` no Windows — espelha os arquivos.
 */
export function mirrorPwaDevSwDist(projectRoot: string, buildDir = '.nuxt-mobile') {
  const { rootSw, buildSw } = swPaths(projectRoot, buildDir)
  const src = join(projectRoot, buildDir, 'dev-sw-dist')
  const dest = join(projectRoot, 'dev-sw-dist')

  const sync = () => {
    if (!existsSync(buildSw)) return
    mkdirSync(dest, { recursive: true })
    for (const name of readdirSync(src)) {
      try {
        cpSync(join(src, name), join(dest, name))
      } catch {
        // arquivo pode estar em uso no Windows
      }
    }
  }

  return {
    name: 'mirror-pwa-dev-sw-dist',
    enforce: 'pre' as const,
    apply: 'serve' as const,
    config() {
      ensurePwaDevSwPlaceholder(projectRoot, buildDir)
    },
    buildStart() {
      ensurePwaDevSwPlaceholder(projectRoot, buildDir)
    },
    load(id) {
      const normalized = id.split('?')[0].replace(/\\/g, '/')
      if (!normalized.includes('/dev-sw-dist/sw.js')) return null
      ensurePwaDevSwPlaceholder(projectRoot, buildDir)
      if (existsSync(rootSw)) return readFileSync(rootSw, 'utf8')
      return PLACEHOLDER_SW
    },
    configureServer(server) {
      ensurePwaDevSwPlaceholder(projectRoot, buildDir)
      sync()

      const interval = setInterval(() => {
        if (existsSync(buildSw)) {
          sync()
          clearInterval(interval)
        }
      }, 200)
      setTimeout(() => clearInterval(interval), 30000)

      if (existsSync(src)) {
        watch(src, { recursive: true }, () => sync())
      }

      server.watcher.on('add', (path) => {
        if (path.includes('dev-sw-dist')) sync()
      })
    },
    buildEnd() {
      sync()
    },
  }
}
