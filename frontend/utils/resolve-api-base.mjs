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
  const isProductionBuild = nodeEnv === 'production' || isGenerate

  if (mobileApp) {
    if (explicitBase && explicitBase !== DEV_MOBILE_API_BASE && !isProductionBuild) {
      return explicitBase
    }
    return isProductionBuild ? PROD_API_BASE : DEV_MOBILE_API_BASE
  }

  // Painel web no dev: /api via proxy do Nuxt (mesma origem, sem CORS)
  if (!isProductionBuild) {
    return DEV_MOBILE_API_BASE
  }

  if (explicitBase && explicitBase !== DEV_MOBILE_API_BASE && explicitBase !== '/api') {
    return explicitBase
  }

  return PROD_API_BASE
}

/** Ajuste no browser — corrige bundle com /api ou localhost embutidos. */
export function resolveApiBaseAtRuntime(configBase, { mobileApp, hostname } = {}) {
  if (isLocalHostname(hostname)) {
    return DEV_MOBILE_API_BASE
  }

  if (!mobileApp) return configBase

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
  return 'A API está indisponível no momento (servidor offline). Aguarde o redeploy do backend no Coolify ou tente novamente em alguns minutos.'
}

export function isApiConnectionError(err) {
  const message = String(err?.message || '')
  const status = err?.statusCode || err?.response?.status
  if (status === 502 || status === 503 || status === 504) return true
  return /failed to fetch|networkerror|fetch failed|ECONNREFUSED|Load failed|no available server/i.test(message)
    || (!err?.statusCode && !err?.data?.message)
}
