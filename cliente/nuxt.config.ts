import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { fixWindowsVitePaths } from '../frontend2/utils/fix-windows-vite-paths'
import { mirrorPwaDevSwDist, ensurePwaDevSwPlaceholder } from '../frontend2/utils/mirror-pwa-dev-sw'
import { resolveApiBaseAtBuild } from '../frontend2/utils/resolve-api-base.mjs'
import { buildInstagramExternalBrowserInlineScript } from '../frontend2/utils/instagram-external-browser.js'
import {
  PATIENT_APP_SPLASH_BG,
  PATIENT_APP_SPLASH_HTML,
  PATIENT_APP_SPLASH_INLINE_CSS,
  PATIENT_APP_THEME_COLOR,
} from '../frontend2/utils/patient-app-splash.mjs'

const pwaDevEnabled = process.env.NUXT_PWA_DEV === 'true'

const isGenerate =
  process.argv.some((arg) => arg.includes('generate')) ||
  process.env.npm_lifecycle_event?.includes('generate')
const isDev = process.env.NODE_ENV !== 'production' && !isGenerate
const pwaSwEnabled = isGenerate || pwaDevEnabled
const devHost = process.env.NUXT_HOST || '0.0.0.0'
const devPort = Number(process.env.NUXT_CLIENTE_PORT || 3002)
const devApiOrigin = process.env.NUXT_DEV_API_ORIGIN || 'http://127.0.0.1:3001'
const lanMode = process.env.NUXT_LAN === 'true' || devHost === '0.0.0.0'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const frontendRoot = fileURLToPath(new URL('../frontend2', import.meta.url))

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Permissions-Policy': 'camera=*, microphone=*, display-capture=*, picture-in-picture=*',
  'Content-Security-Policy': [
    "default-src 'self'",
    isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://meet.nutrisabellajardim.com.br https: blob:"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://meet.nutrisabellajardim.com.br blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss: blob:",
    "media-src 'self' blob: mediastream: https:",
    "worker-src 'self' blob:",
    "frame-src 'self' https: blob:",
    "child-src 'self' https: blob:",
    "base-uri 'self'",
  ].join('; '),
}

const jitsiVbCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const nitroRouteRules = {
  '/jitsi-vb/**': { headers: { ...securityHeaders, ...jitsiVbCorsHeaders } },
  '/**': { headers: securityHeaders },
}

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
    join(rootDir, 'plugins/instagram-external-browser.client.ts'),
    join(rootDir, 'plugins/incoming-video-call.client.ts'),
    join(frontendRoot, 'plugins/patient-app-splash.client.ts'),
    join(frontendRoot, 'plugins/patient-tab-bar-root.client.ts'),
    join(frontendRoot, 'plugins/pwa-dev-unregister.client.ts'),
    join(frontendRoot, 'plugins/auth-session-bootstrap.client.ts'),
    join(frontendRoot, 'plugins/api-base.client.js'),
    join(frontendRoot, 'plugins/patient-session.client.ts'),
    join(frontendRoot, 'plugins/patient-route.client.ts'),
    join(frontendRoot, 'plugins/patient-navigation-loading.client.ts'),
    join(frontendRoot, 'plugins/patient-meal-plan.client.ts'),
    join(frontendRoot, 'plugins/patient-notifications.client.ts'),
    join(frontendRoot, 'plugins/pwa-standalone.client.ts'),
    join(frontendRoot, 'plugins/ios-pwa-chrome.client.ts'),
    join(frontendRoot, 'plugins/ios-pwa-overlay.client.ts'),
    join(frontendRoot, 'plugins/push-notifications.client.ts'),
    join(frontendRoot, 'plugins/mercadopago.client.ts'),
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
        {
          rel: 'preload',
          href: '/icons/logovetorcarregamento.svg',
          as: 'image',
          type: 'image/svg+xml',
        },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
      meta: [
        {
          name: 'viewport',
          content:
            'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no, interactive-widget=overlays-content',
        },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'theme-color', content: PATIENT_APP_THEME_COLOR },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Florescer' },
        { name: 'application-name', content: 'Clube Florescer' },
        {
          name: 'description',
          content: 'App do paciente Clube Florescer — vídeos, dieta, Bella IA e check-in.',
        },
        {
          'http-equiv': 'Permissions-Policy',
          content: 'camera=*, microphone=*, display-capture=*, picture-in-picture=*',
        },
      ],
      style: [
        {
          key: 'patient-app-splash-inline',
          innerHTML: PATIENT_APP_SPLASH_INLINE_CSS,
          type: 'text/css',
          tagPriority: 'critical',
        },
      ],
      script: [
        {
          key: 'patient-app-splash-bg',
          type: 'text/javascript',
          innerHTML: `document.documentElement.style.backgroundColor='${PATIENT_APP_SPLASH_BG}';document.documentElement.classList.add('cf-mobile-app-splash-pending');`,
          tagPriority: 'critical',
        },
        {
          key: 'instagram-external-browser',
          type: 'text/javascript',
          innerHTML: buildInstagramExternalBrowserInlineScript(),
          tagPriority: 'critical',
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
    '@fontsource/plus-jakarta-sans/400.css',
    '@fontsource/plus-jakarta-sans/500.css',
    '@fontsource/plus-jakarta-sans/600.css',
    '@fontsource/plus-jakarta-sans/700.css',
    '@fontsource/plus-jakarta-sans/800.css',
    join(frontendRoot, 'assets/css/fonts.css'),
    join(frontendRoot, 'assets/css/patient-app.css'),
    join(frontendRoot, 'assets/css/patient-tab-bar.css'),
    join(frontendRoot, 'assets/css/patient-z-layers.css'),
    join(frontendRoot, 'assets/css/patient-quick-fab.css'),
    join(frontendRoot, 'assets/css/patient-screen-dim.css'),
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
    registerType: pwaSwEnabled ? 'prompt' : null,
    injectRegister: pwaSwEnabled ? 'auto' : false,
    includeAssets: ['pwa/icon-source.png', 'pwa/apple-touch-icon.png', 'pwa/icon-192.png', 'pwa/icon-512.png'],
    manifest: {
      id: 'clube-florescer-paciente',
      name: 'Clube Florescer',
      short_name: 'Florescer',
      description: 'App do paciente Clube Florescer — vídeos, dieta, Bella IA e check-in.',
      lang: 'pt-BR',
      display: 'standalone',
      background_color: PATIENT_APP_SPLASH_BG,
      theme_color: PATIENT_APP_THEME_COLOR,
      display_override: ['standalone', 'fullscreen'],
      scope: '/',
      start_url: '/?source=pwa',
      handle_links: 'preferred',
      related_applications: [
        {
          platform: 'webapp',
          url: '/manifest.webmanifest',
          id: 'clube-florescer-paciente',
        },
        {
          platform: 'itunes',
          url: 'https://apps.apple.com/app/id6795381418',
          id: '6795381418',
        },
      ],
      icons: [
        { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/pwa/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^\/api\//],
      globPatterns: ['**/*.{js,css,png,svg,ico,webp,woff2,woff,webmanifest,wasm,tflite}'],
      // Tutorial asset ~2.1MB — acima do limite padrão do Workbox (2 MiB); carrega sob demanda.
      globIgnores: ['**/meal-photo-guide-plate.png'],
      maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      importScripts: ['/push-sw.js'],
    },
    client: {
      installPrompt: false,
      periodicSyncForUpdates: pwaSwEnabled ? 300 : 0,
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
      html.bodyPrepend.push(PATIENT_APP_SPLASH_HTML)

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
      headers: {
        ...securityHeaders,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      },
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
        prerender: {
          crawlLinks: true,
          routes: [
            '/',
            '/register',
            '/esqueci-senha',
            '/redefinir-senha',
            '/abrir',
            '/documento',
          ],
        },
        routeRules: nitroRouteRules,
      }
    : {
        devProxy: {
          '/api': {
            target: devApiOrigin,
            changeOrigin: true,
          },
        },
        routeRules: nitroRouteRules,
      },
})
