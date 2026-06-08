import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const frontendRoot = fileURLToPath(new URL('../frontend', import.meta.url))

// App do cliente — código-fonte no frontend, build/cache no cliente/
export default defineNuxtConfig({
  extends: [frontendRoot],

  rootDir,
  srcDir: frontendRoot,

  buildDir: join(rootDir, '.nuxt-mobile'),

  dir: {
    public: join(frontendRoot, 'public'),
  },

  devServer: {
    port: 3002,
    strictPort: true,
    host: '127.0.0.1',
  },

  vite: {
    server: {
      fs: {
        allow: [rootDir, frontendRoot],
      },
      proxy: {
        '/api': {
          target: process.env.NUXT_DEV_API_ORIGIN || 'http://127.0.0.1:3001',
          changeOrigin: true,
        },
      },
    },
    resolve: {
      preserveSymlinks: true,
    },
  },

  runtimeConfig: {
    public: {
      mobileApp: true,
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
      whatsappApiBase: process.env.NUXT_PUBLIC_WHATSAPP_API_BASE || '/api/whatsapp',
    },
  },
})
