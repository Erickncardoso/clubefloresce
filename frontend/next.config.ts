import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'
const devApiOrigin = process.env.NEXT_DEV_API_ORIGIN || 'http://localhost:3001'

const nextConfig: NextConfig = {
  output: 'standalone',
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
