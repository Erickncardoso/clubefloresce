// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  compatibilityDate: '2024-04-03',
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag === 'em-emoji-picker'
    }
  },
  css: [
    '~/assets/css/whatsapp-helpers.css',
    '~/assets/css/whatsapp-layout.css',
    '~/assets/css/whatsapp-sidebar.css',
    '~/assets/css/whatsapp-chat-header.css',
    '~/assets/css/whatsapp-reply-bar.css',
    '~/assets/css/whatsapp-footer.css',
    '~/assets/css/whatsapp-modals.css',
    '~/assets/css/whatsapp-bubbles.css',
  ],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3001/api',
      whatsappApiBase: process.env.NUXT_PUBLIC_WHATSAPP_API_BASE || 'http://localhost:3001/api/whatsapp'
    }
  },
  sourcemap: {
    server: false,
    client: false
  },
  experimental: {
    // Evita erro de resolução "#app-manifest" no Vite em dev (Nuxt 3.21+)
    appManifest: false
  }
})
