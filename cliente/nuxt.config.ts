import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { fixWindowsVitePaths } from '../frontend/utils/fix-windows-vite-paths'
import { resolveApiBaseAtBuild } from '../frontend/utils/resolve-api-base.mjs'

const isGenerate =
  process.argv.some((arg) => arg.includes('generate')) ||
  process.env.npm_lifecycle_event?.includes('generate')
const devHost = process.env.NUXT_HOST || '127.0.0.1'
const devPort = Number(process.env.NUXT_PORT || 3002)
const devApiOrigin = process.env.NUXT_DEV_API_ORIGIN || 'http://localhost:3001'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const frontendRoot = fileURLToPath(new URL('../frontend', import.meta.url))

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
  ],

  dir: {
    public: join(frontendRoot, 'public'),
  },

  modules: ['@vite-pwa/nuxt'],
  ssr: false,

  app: {
    head: {
      title: 'Clube Florescer',
      charset: 'utf-8',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/logoflorescer.svg' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/pwa/icon-192.png' },
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
        { name: 'theme-color', content: '#c17b80' },
        {
          name: 'description',
          content: 'App do paciente Clube Florescer — cursos, dieta, Bella IA e check-in.',
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
    '@fontsource/inter/latin-300.css',
    '@fontsource/inter/latin-400.css',
    '@fontsource/inter/latin-500.css',
    '@fontsource/inter/latin-600.css',
    '@fontsource/inter/latin-700.css',
    '@fontsource/inter/latin-800.css',
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

  routeRules: {
    '/onboarding': { redirect: { to: '/inicio', statusCode: 301 } },
  },

  pwa: {
    registerType: 'prompt',
    injectRegister: 'auto',
    includeAssets: ['logoflorescer.svg', 'pwa/apple-touch-icon.png'],
    manifest: {
      id: 'clube-florescer-paciente',
      name: 'Clube Florescer',
      short_name: 'Florescer',
      description: 'App do paciente Clube Florescer — cursos, dieta, Bella IA e check-in.',
      lang: 'pt-BR',
      theme_color: '#c17b80',
      background_color: '#ffffff',
      display: 'standalone',
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
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 300,
    },
    devOptions: {
      enabled: process.env.NUXT_PWA_DEV === 'true',
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

  vite: {
    plugins: [fixWindowsVitePaths()],
    server: {
      origin: `http://${devHost === '0.0.0.0' ? '127.0.0.1' : devHost}:${devPort}`,
      strictPort: true,
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
    resolve: {
      preserveSymlinks: true,
    },
  },

  nitro: isGenerate
    ? {
        preset: 'static',
        prerender: { crawlLinks: true },
      }
    : {},
})
