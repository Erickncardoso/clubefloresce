import { PROD_API_BASE } from './api-env.mjs'

export const DEV_MOBILE_API_BASE = '/api'
export const DEV_PANEL_API_BASE = 'http://localhost:3001/api'

export function isLocalHostname(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

/** Resolução no build (nuxt.config / Docker generate). */
export function resolveApiBaseAtBuild({
  mobileApp = false,
  explicitBase,
  nodeEnv = process.env.NODE_ENV,
  isGenerate = false,
} = {}) {
  if (explicitBase && explicitBase !== DEV_MOBILE_API_BASE) {
    return explicitBase
  }

  const isProductionBuild = nodeEnv === 'production' || isGenerate

  if (mobileApp) {
    return isProductionBuild ? PROD_API_BASE : DEV_MOBILE_API_BASE
  }

  return isProductionBuild ? PROD_API_BASE : DEV_PANEL_API_BASE
}

/** Ajuste no browser — corrige bundle com /api ou localhost embutidos. */
export function resolveApiBaseAtRuntime(configBase, { mobileApp, hostname } = {}) {
  if (!mobileApp) return configBase

  if (isLocalHostname(hostname)) {
    return DEV_MOBILE_API_BASE
  }

  if (!configBase || configBase === DEV_MOBILE_API_BASE || String(configBase).includes('localhost')) {
    return PROD_API_BASE
  }

  return configBase
}

export function apiConnectionErrorMessage({ hostname, dev = false } = {}) {
  const local = dev || isLocalHostname(hostname)
  if (local) {
    return 'Não foi possível conectar à API. Confira se o backend está rodando com npm run dev:backend (porta 3001).'
  }
  return 'Não foi possível conectar à API. Tente novamente em alguns instantes.'
}

export function isApiConnectionError(err) {
  const message = String(err?.message || '')
  return /failed to fetch|networkerror|fetch failed|ECONNREFUSED|Load failed/i.test(message)
    || !err?.statusCode
}
