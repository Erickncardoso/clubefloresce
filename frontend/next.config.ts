import type { NextConfig } from 'next'
import path from 'node:path'

const isDev = process.env.NODE_ENV !== 'production'
// 127.0.0.1 evita que `localhost` caia em ::1 (IPv6) e bata em outro app
// escutando a mesma porta — ex.: outro backend no Mac compartilha :3001 via IPv6.
const devApiOrigin = process.env.NEXT_DEV_API_ORIGIN || 'http://127.0.0.1:3001'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Evita bloquear HMR/chunks se abrir por 127.0.0.1 em vez de localhost
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  // Evita gerar AGENTS.md/CLAUDE.md no build Docker/Coolify
  agentRules: false,
  // Garante alias @/* mesmo se o webpack do Coolify falhar ao ler paths do tsconfig
  turbopack: {
    resolveAlias: {
      '@': path.resolve(__dirname),
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname),
    }
    return config
  },
  async rewrites() {
    // Produção Coolify: reverse-proxy /api → backend. Dev: proxy local.
    if (!isDev) return []
    return [
      {
        source: '/api/:path*',
        destination: `${devApiOrigin}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
