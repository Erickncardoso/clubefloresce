// https://nuxt.com/docs/api/configuration/nuxt-config
import { fixWindowsVitePaths } from './utils/fix-windows-vite-paths'
import { PROD_API_BASE, PROD_WHATSAPP_API_BASE } from './utils/api-env.mjs'
import { resolveApiBaseAtBuild } from './utils/resolve-api-base.mjs'

const isMobileApp = process.env.NUXT_PUBLIC_MOBILE_APP === 'true'
const isGenerate =
  process.argv.some((arg) => arg.includes('generate')) ||
  process.env.npm_lifecycle_event?.includes('generate')
const isDev = process.env.NODE_ENV !== 'production' && !isGenerate
const devHost = process.env.NUXT_HOST || '127.0.0.1'
const devPort = Number(process.env.NUXT_PORT || 3002)
const devApiOrigin = process.env.NUXT_DEV_API_ORIGIN || 'http://127.0.0.1:3001'
const defaultApiBase = resolveApiBaseAtBuild({
  mobileApp: isMobileApp,
  explicitBase: process.env.NUXT_PUBLIC_API_BASE,
  isGenerate,
})
const defaultWhatsappApiBase = process.env.NUXT_PUBLIC_WHATSAPP_API_BASE
  || (isDev ? '/api/whatsapp' : PROD_WHATSAPP_API_BASE)

export default defineNuxtConfig({
  // Web (:3000) e app paciente (:3002) podem rodar ao mesmo tempo sem conflitar cache
  buildDir: isMobileApp ? '.nuxt-mobile' : '.nuxt',
  modules: isMobileApp ? ['@vite-pwa/nuxt'] : [],
  // App paciente é SPA (evita crash do worker Nitro com localStorage/API no SSR).
  ssr: !isMobileApp,
  app: {
    head: {
      title: isMobileApp ? 'Clube Florescer' : 'Florescer',
      link: isMobileApp
        ? [
            { rel: 'icon', type: 'image/svg+xml', href: '/logoflorescer.svg' },
            { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/pwa/icon-192.png' },
            { rel: 'apple-touch-icon', href: '/pwa/apple-touch-icon.png', sizes: '180x180' },
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
    '~/assets/css/fonts.css',
    '~/assets/css/whatsapp-helpers.css',
    '~/assets/css/whatsapp-layout.css',
    '~/assets/css/whatsapp-sidebar.css',
    '~/assets/css/whatsapp-chat-header.css',
    '~/assets/css/whatsapp-reply-bar.css',
    '~/assets/css/whatsapp-footer.css',
    '~/assets/css/whatsapp-modals.css',
    '~/assets/css/whatsapp-bubbles.css',
    ...(isMobileApp ? ['~/assets/css/mobile-app.css', '~/assets/css/patient-app.css'] : []),
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
        pwa: {
          registerType: 'autoUpdate',
          injectRegister: 'auto',
          includeAssets: ['logoflorescer.svg', 'pwa/apple-touch-icon.png'],
          manifest: {
            id: 'clube-florescer-paciente',
            name: 'Clube Florescer',
            short_name: 'Florescer',
            description: 'App do paciente Clube Florescer — cursos, dieta, Bella IA e check-in.',
            lang: 'pt-BR',
            dir: 'ltr',
            theme_color: '#c17b80',
            background_color: '#ffffff',
            display: 'standalone',
            display_override: ['standalone', 'minimal-ui'],
            orientation: 'portrait',
            scope: '/',
            start_url: '/?source=pwa',
            categories: ['health', 'lifestyle', 'medical'],
            icons: [
              {
                src: '/pwa/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/pwa/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/pwa/icon-512-maskable.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              },
            ],
          },
          workbox: {
            navigateFallback: '/',
            globPatterns: ['**/*.{js,css,html,png,svg,ico,webp,woff2,woff}'],
            cleanupOutdatedCaches: true,
            runtimeCaching: [
              {
                urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'cf-api-cache',
                  networkTimeoutSeconds: 10,
                  expiration: {
                    maxEntries: 32,
                    maxAgeSeconds: 60 * 5,
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
            ],
          },
          client: {
            installPrompt: true,
            periodicSyncForUpdates: 3600,
          },
          devOptions: {
            enabled: process.env.NUXT_PWA_DEV === 'true',
            suppressWarnings: true,
            navigateFallback: '/',
            type: 'module',
          },
        },
      }
    : {}),
  ...(isMobileApp
    ? {
        devServer: {
          port: devPort,
          strictPort: true,
          host: devHost,
        },
        features: {
          inlineStyles: true,
        },
        vite: {
          plugins: [fixWindowsVitePaths()],
          server: {
            origin: `http://${devHost === '0.0.0.0' ? '127.0.0.1' : devHost}:${devPort}`,
            strictPort: true,
            hmr: devHost === '0.0.0.0' ? { host: '127.0.0.1', port: devPort } : undefined,
            watch: {
              ignored: ['**/.output/**', '**/.nuxt-mobile/dist/**'],
            },
            proxy: {
              '/api': {
                target: devApiOrigin,
                changeOrigin: true,
              },
            },
          },
        },
      }
    : {}),
  nitro: isMobileApp && isGenerate
    ? { preset: 'static' }
    : isMobileApp
      ? {
          devProxy: {
            '/api': {
              target: `${devApiOrigin}/api`,
              changeOrigin: true,
            },
          },
        }
      : undefined,
})
