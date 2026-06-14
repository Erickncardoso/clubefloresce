import { PROD_API_BASE } from './api-env.mjs'

export const DEV_MOBILE_API_BASE = '/api'

export const PROD_APP_HOSTNAMES = [
  'app.nutrisabellajardim.com.br',
  'www.app.nutrisabellajardim.com.br',
]

export function isLocalHostname(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

export function isPrivateLanHostname(hostname) {
  if (!hostname) return false
  return /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)
}

export function isProdAppHostname(hostname) {
  return PROD_APP_HOSTNAMES.includes(hostname)
}

/** URL de upload/API — sempre mesma origem (/api), funciona de qualquer rede ou país. */
export function resolveUploadApiUrl(path, apiBase = DEV_MOBILE_API_BASE) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const base = String(apiBase || DEV_MOBILE_API_BASE).replace(/\/$/, '')
  return `${base}${normalized}`
}

/** @deprecated Use resolveUploadApiUrl */
export function resolveDirectApiUrl(path, apiBase) {
  return resolveUploadApiUrl(path, apiBase)
}

export function normalizeUploadError(error, { fallback = 'Não foi possível enviar o arquivo. Tente novamente.' } = {}) {
  const raw = error?.data?.message || error?.data?.error || error?.message || String(error || '')
  if (/ECONNRESET|ECONNREFUSED|EPIPE|ETIMEDOUT|socket hang up|aborted/i.test(raw)) {
    return 'Conexão interrompida durante o envio. Tente novamente.'
  }
  if (/file size too large|104857600|too large/i.test(raw)) {
    return 'Arquivo muito grande. Reduza o tamanho ou tente novamente.'
  }
  if (/failed to fetch|networkerror|load failed|fetch failed|network error|cors/i.test(raw)) {
    return 'Falha de rede ao enviar o arquivo. Verifique sua conexão e tente novamente.'
  }
  return raw || fallback
}

export function normalizeVideoUploadError(error) {
  return normalizeUploadError(error, { fallback: 'Não foi possível enviar o vídeo. Tente novamente.' })
}

export function normalizeFileUploadError(error) {
  return normalizeUploadError(error, { fallback: 'Não foi possível enviar o arquivo. Tente novamente.' })
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
    if (!isProductionBuild) {
      if (explicitBase && explicitBase !== DEV_MOBILE_API_BASE) return explicitBase
      return DEV_MOBILE_API_BASE
    }
    if (explicitBase === PROD_API_BASE) return DEV_MOBILE_API_BASE
    if (explicitBase && explicitBase !== DEV_MOBILE_API_BASE) return explicitBase
    return DEV_MOBILE_API_BASE
  }

  if (!isProductionBuild) {
    return DEV_MOBILE_API_BASE
  }

  if (explicitBase && explicitBase !== DEV_MOBILE_API_BASE && explicitBase !== '/api' && explicitBase !== PROD_API_BASE) {
    return explicitBase
  }

  return DEV_MOBILE_API_BASE
}

/** No browser: sempre /api na mesma origem (proxy Nuxt/nginx → backend). */
export function resolveApiBaseAtRuntime(configBase, { mobileApp, hostname } = {}) {
  if (!mobileApp) {
    return DEV_MOBILE_API_BASE
  }

  if (isProdAppHostname(hostname) || configBase === DEV_MOBILE_API_BASE) {
    return DEV_MOBILE_API_BASE
  }

  if (
    !configBase
    || configBase === PROD_API_BASE
    || String(configBase).includes('apiclube.')
    || String(configBase).includes('localhost')
  ) {
    return DEV_MOBILE_API_BASE
  }

  return configBase
}

export function apiConnectionErrorMessage() {
  return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
}

export function isApiConnectionError(err) {
  const message = String(err?.message || '')
  const status = err?.statusCode || err?.response?.status
  if (status === 502 || status === 503 || status === 504) return true
  return /failed to fetch|networkerror|fetch failed|ECONNREFUSED|Load failed|no available server/i.test(message)
    || (!err?.statusCode && !err?.data?.message)
}
