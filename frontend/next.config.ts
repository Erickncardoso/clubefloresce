import type { NextConfig } from 'next'
import path from 'node:path'

const isDev = process.env.NODE_ENV !== 'production'
const devApiOrigin = process.env.NEXT_DEV_API_ORIGIN || 'http://localhost:3001'

const nextConfig: NextConfig = {
  output: 'standalone',
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
