import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { fixWindowsVitePaths } from '../frontend/utils/fix-windows-vite-paths'
import { mirrorPwaDevSwDist, ensurePwaDevSwPlaceholder } from '../frontend/utils/mirror-pwa-dev-sw'
import { resolveApiBaseAtBuild } from '../frontend/utils/resolve-api-base.mjs'

const pwaDevEnabled = process.env.NUXT_PWA_DEV === 'true'

const isGenerate =
  process.argv.some((arg) => arg.includes('generate')) ||
  process.env.npm_lifecycle_event?.includes('generate')
const devHost = process.env.NUXT_HOST || '0.0.0.0'
const devPort = Number(process.env.NUXT_CLIENTE_PORT || 3002)
const devApiOrigin = process.env.NUXT_DEV_API_ORIGIN || 'http://127.0.0.1:3001'
const lanMode = process.env.NUXT_LAN === 'true' || devHost === '0.0.0.0'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const frontendRoot = fileURLToPath(new URL('../frontend', import.meta.url))

if (!isGenerate) {
  ensurePwaDevSwPlaceholder(rootDir, '.nuxt-mobile')
}

// App paciente — páginas em cliente/; componentes via alias (sem extends, evita conflito SSR)
export default defineNuxtConfig({
  rootDir,
  srcDir: '.',

  buildDir: join(rootDir, '.nuxt-mobile'),

  alias: {
    '~': frontendRoot,
    '@': frontendRoot,
    '~~': frontendRoot,
    '@@': frontendRoot,
  },

  components: [
    // pathPrefix: true → home/NutritionPanel.vue vira HomeNutritionPanel
    { path: join(frontendRoot, 'components'), pathPrefix: true, extensions: ['.vue'] },
  ],

  imports: {
    dirs: [
      join(frontendRoot, 'composables'),
      join(frontendRoot, 'utils'),
    ],
  },

  plugins: [
    join(frontendRoot, 'plugins/api-base.client.js'),
    join(frontendRoot, 'plugins/patient-session.client.ts'),
    join(frontendRoot, 'plugins/patient-route.client.ts'),
    join(frontendRoot, 'plugins/patient-navigation-loading.client.ts'),
    join(frontendRoot, 'plugins/patient-meal-plan.client.ts'),
    join(frontendRoot, 'plugins/patient-notifications.client.ts'),
    join(frontendRoot, 'plugins/pwa-standalone.client.ts'),
    join(frontendRoot, 'plugins/push-notifications.client.ts'),
  ],

  dir: {
    public: join(frontendRoot, 'public'),
  },

  modules: ['@vite-pwa/nuxt'],
  ssr: false,

  app: {
    pageTransition: false,
    head: {
      title: 'Clube Florescer',
      charset: 'utf-8',
      link: [
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/pwa/icon-192.png' },
        { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/pwa/icon-512.png' },
        { rel: 'apple-touch-icon', href: '/pwa/apple-touch-icon.png', sizes: '180x180' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1',
        },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Florescer' },
        { name: 'application-name', content: 'Clube Florescer' },
        { name: 'theme-color', content: '#8B967C' },
        {
          name: 'description',
          content: 'App do paciente Clube Florescer — vídeos, dieta, Bella IA e check-in.',
        },
      ],
    },
  },

  devtools: { enabled: false },
  compatibilityDate: '2024-04-03',
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag === 'em-emoji-picker',
    },
  },

  css: [
    '@fontsource/plus-jakarta-sans/latin-400.css',
    '@fontsource/plus-jakarta-sans/latin-500.css',
    '@fontsource/plus-jakarta-sans/latin-600.css',
    '@fontsource/plus-jakarta-sans/latin-700.css',
    '@fontsource/plus-jakarta-sans/latin-800.css',
    join(frontendRoot, 'assets/css/fonts.css'),
    join(frontendRoot, 'assets/css/patient-app.css'),
    join(frontendRoot, 'assets/css/mobile-app.css'),
    join(frontendRoot, 'assets/css/course-video-player.css'),
    join(frontendRoot, 'assets/css/lesson-player-page.css'),
  ],

  runtimeConfig: {
    public: {
      mobileApp: true,
      apiBase: resolveApiBaseAtBuild({
        mobileApp: true,
        explicitBase: process.env.NUXT_PUBLIC_API_BASE,
        isGenerate,
      }),
    },
  },

  pwa: {
    registerType: 'prompt',
    injectRegister: 'auto',
    includeAssets: ['pwa/icon-source.png', 'pwa/apple-touch-icon.png', 'pwa/icon-192.png', 'pwa/icon-512.png'],
    manifest: {
      id: 'clube-florescer-paciente',
      name: 'Clube Florescer',
      short_name: 'Florescer',
      description: 'App do paciente Clube Florescer — vídeos, dieta, Bella IA e check-in.',
      lang: 'pt-BR',
      theme_color: '#8B967C',
      background_color: '#eef0eb',
      display: 'standalone',
      display_override: ['standalone', 'fullscreen'],
      scope: '/',
      start_url: '/?source=pwa',
      icons: [
        { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/pwa/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^\/api\//],
      globPatterns: ['**/*.{js,css,png,svg,ico,webp,woff2,woff,webmanifest}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      importScripts: ['/push-sw.js'],
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 300,
    },
    devOptions: {
      enabled: pwaDevEnabled,
      suppressWarnings: true,
      navigateFallback: '/',
      type: 'module',
    },
  },

  devServer: {
    port: devPort,
    strictPort: true,
    host: devHost,
  },

  features: {
    inlineStyles: true,
  },

  experimental: {
    appManifest: false,
  },

  hooks: {
    'render:html'(html: { head: string[]; body: string[]; bodyAppend: string[]; bodyPrepend: string[] }) {
      if (process.platform !== 'win32') return
      for (const bucket of [html.head, html.body, html.bodyAppend, html.bodyPrepend]) {
        for (let i = 0; i < bucket.length; i += 1) {
          bucket[i] = bucket[i].replace(/\/_nuxt\/C:(?=\/)/g, '/_nuxt/@fs/C:')
        }
      }
    },
    'nitro:init'(nitro) {
      if (process.platform !== 'win32') return
      nitro.hooks.hook('render:response', (response) => {
        const contentType = String(response.headers?.['content-type'] || '')
        if (!contentType.includes('text/html')) return
        if (typeof response.body === 'string') {
          response.body = response.body.replace(/\/_nuxt\/C:(?=\/)/g, '/_nuxt/@fs/C:')
        }
      })
    },
  },

  vite: {
    plugins: [fixWindowsVitePaths(), mirrorPwaDevSwDist(rootDir, '.nuxt-mobile')],
    build: {
      sourcemap: false,
      reportCompressedSize: false,
    },
    optimizeDeps: {
      include: ['pdfjs-dist'],
    },
    server: {
      strictPort: true,
      allowedHosts: true,
      ...(lanMode
        ? {
            // Celular na LAN usa o IP da máquina — não fixar origin em 127.0.0.1
            hmr: {
              port: devPort,
              clientPort: devPort,
            },
          }
        : {
            origin: `http://${devHost}:${devPort}`,
          }),
      fs: {
        allow: [rootDir, frontendRoot],
      },
      proxy: {
        '/api': {
          target: devApiOrigin,
          changeOrigin: true,
          timeout: 30 * 60 * 1000,
          proxyTimeout: 30 * 60 * 1000,
        },
      },
    },
  },

  nitro: isGenerate
    ? {
        preset: 'static',
        prerender: { crawlLinks: true },
      }
    : {
        devProxy: {
          '/api': {
            target: devApiOrigin,
            changeOrigin: true,
          },
        },
      },
})
