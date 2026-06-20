// Nuxt compartilhado — admin (:3000) ou paciente via cliente/ (:3002) com NUXT_PUBLIC_MOBILE_APP=true
import { fileURLToPath } from 'node:url'
import { fixWindowsVitePaths } from './utils/fix-windows-vite-paths'
import { ensurePwaDevSwPlaceholder, mirrorPwaDevSwDist } from './utils/mirror-pwa-dev-sw'
import { PROD_API_ORIGIN, PROD_WHATSAPP_API_BASE } from './utils/api-env.mjs'
import { resolveApiBaseAtBuild } from './utils/resolve-api-base.mjs'

const frontendRoot = fileURLToPath(new URL('.', import.meta.url))

const isMobileApp = process.env.NUXT_PUBLIC_MOBILE_APP === 'true'
const isGenerate =
  process.argv.some((arg) => arg.includes('generate')) ||
  process.env.npm_lifecycle_event?.includes('generate')
const isDev = process.env.NODE_ENV !== 'production' && !isGenerate
const devHost = process.env.NUXT_HOST || '0.0.0.0'
const devPort = Number(process.env.NUXT_PORT || (isMobileApp ? 3002 : 3000))
const devApiOrigin = process.env.NUXT_DEV_API_ORIGIN || 'http://localhost:3001'
const defaultApiBase = resolveApiBaseAtBuild({
  mobileApp: isMobileApp,
  explicitBase: process.env.NUXT_PUBLIC_API_BASE,
  isGenerate,
})
const defaultWhatsappApiBase = process.env.NUXT_PUBLIC_WHATSAPP_API_BASE
  || (isDev ? '/api/whatsapp' : PROD_WHATSAPP_API_BASE)

if (isMobileApp && isDev) {
  ensurePwaDevSwPlaceholder(frontendRoot, '.nuxt-mobile')
}

export default defineNuxtConfig({
  buildDir: isMobileApp ? '.nuxt-mobile' : '.nuxt',
  modules: isMobileApp ? ['@vite-pwa/nuxt'] : [],
  ssr: !isMobileApp,
  app: {
    head: {
      title: isMobileApp ? 'Clube Florescer' : 'Florescer',
      charset: 'utf-8',
      link: isMobileApp
        ? [
            { rel: 'icon', type: 'image/svg+xml', href: '/logoflorescer.svg' },
            { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/pwa/icon-192.png' },
            { rel: 'apple-touch-icon', href: '/pwa/apple-touch-icon.png', sizes: '180x180' },
            { rel: 'manifest', href: '/manifest.webmanifest' },
          ]
        : [{ rel: 'icon', type: 'image/svg+xml', href: '/logoflorescer.svg' }],
      meta: isMobileApp
        ? [
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
          ]
        : [],
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
    '~/assets/css/fonts.css',
    '~/assets/css/whatsapp-helpers.css',
    '~/assets/css/whatsapp-layout.css',
    '~/assets/css/whatsapp-sidebar.css',
    '~/assets/css/whatsapp-chat-header.css',
    '~/assets/css/whatsapp-reply-bar.css',
    '~/assets/css/whatsapp-footer.css',
    '~/assets/css/whatsapp-modals.css',
    '~/assets/css/whatsapp-bubbles.css',
    '~/assets/css/patient-app.css',
    '~/assets/css/course-video-player.css',
    '~/assets/css/lesson-player-page.css',
    ...(isMobileApp ? [] : ['~/assets/css/admin-pages.css', '~/assets/css/admin-rounding.css']),
    ...(isMobileApp ? ['~/assets/css/mobile-app.css'] : []),
  ],
  runtimeConfig: {
    public: {
      mobileApp: isMobileApp,
      apiBase: defaultApiBase,
      ...(isMobileApp
        ? {}
        : { whatsappApiBase: process.env.NUXT_PUBLIC_WHATSAPP_API_BASE || defaultWhatsappApiBase }),
    },
  },
  sourcemap: {
    server: false,
    client: false,
  },
  experimental: {
    appManifest: false,
  },
  ...(isMobileApp
    ? {
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
        features: {
          inlineStyles: true,
        },
      }
    : {}),
  devServer: {
    port: devPort,
    strictPort: true,
    host: devHost,
  },
  vite: {
    ...(isMobileApp
      ? { plugins: [fixWindowsVitePaths(), mirrorPwaDevSwDist(frontendRoot, '.nuxt-mobile')] }
      : {}),
    server: {
      ...(isMobileApp
        ? {
            origin: `http://${devHost === '0.0.0.0' ? '127.0.0.1' : devHost}:${devPort}`,
            strictPort: true,
            hmr: devHost === '0.0.0.0' ? { host: '127.0.0.1', port: devPort } : undefined,
          }
        : {}),
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
  nitro: isMobileApp && isGenerate
    ? {
        preset: 'static',
        prerender: { crawlLinks: true },
      }
    : {
        ...(!isMobileApp && !isDev
          ? {
              routeRules: {
                '/api/**': {
                  proxy: `${PROD_API_ORIGIN}/api/**`,
                },
              },
            }
          : {}),
        ...(isDev
          ? {
              devProxy: {
                '/api': {
                  target: `${devApiOrigin}/api`,
                  changeOrigin: true,
                  timeout: 30 * 60 * 1000,
                  proxyTimeout: 30 * 60 * 1000,
                },
              },
            }
          : {}),
      },
})
