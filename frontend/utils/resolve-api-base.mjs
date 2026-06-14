import { PROD_API_BASE } from './api-env.mjs'

export const DEV_MOBILE_API_BASE = '/api'
export const DEV_PANEL_API_BASE = 'http://localhost:3001/api'

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

export function isDevBackendDirectHostname(hostname) {
  return isLocalHostname(hostname) || isPrivateLanHostname(hostname)
}

/** Evita import.meta.dev em .mjs — o vite:client-inject quebra o parse e derruba o worker Nitro. */
export function isDevEnvironment() {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV !== 'production'
  }

  const { hostname, port } = window.location
  if (!isDevBackendDirectHostname(hostname)) return false
  return port === '3000' || port === '3002' || port === ''
}

/** Base da API do backend em dev — direto na porta 3001 (evita proxy do Nuxt/Safari). */
export function resolveDevBackendApiBase() {
  if (typeof window === 'undefined') return DEV_PANEL_API_BASE
  const hostname = window.location.hostname
  const protocol = window.location.protocol
  if (isLocalHostname(hostname)) return DEV_PANEL_API_BASE
  if (isPrivateLanHostname(hostname)) return `${protocol}//${hostname}:3001/api`
  return DEV_PANEL_API_BASE
}

export function isProdAppHostname(hostname) {
  return PROD_APP_HOSTNAMES.includes(hostname)
}

/** Em dev, chama o backend direto (porta 3001) e evita timeout/reset do proxy do Nuxt/Safari. */
export function resolveDirectApiUrl(path, apiBase = DEV_MOBILE_API_BASE) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (typeof window !== 'undefined' && isDevEnvironment() && isDevBackendDirectHostname(window.location.hostname)) {
    return `${resolveDevBackendApiBase()}${normalized}`
  }
  const base = String(apiBase || DEV_MOBILE_API_BASE).replace(/\/$/, '')
  return `${base}${normalized}`
}

export function normalizeUploadError(error) {
  const raw = error?.data?.message || error?.message || String(error || '')
  if (/ECONNRESET|ECONNREFUSED|EPIPE|ETIMEDOUT|socket hang up|aborted/i.test(raw)) {
    return 'Conexão interrompida durante o envio. Confira se o backend está rodando (porta 3001) e tente novamente.'
  }
  if (/file size too large|104857600|too large/i.test(raw)) {
    return 'Vídeo muito grande (limite 100 MB no Cloudinary). O servidor vai comprimir automaticamente — tente novamente.'
  }
  if (/failed to fetch|networkerror|load failed|fetch failed|network error|cors/i.test(raw)) {
    return 'Falha de rede ao enviar o arquivo. No iPad/Mac, use o mesmo Wi‑Fi do computador e tente novamente.'
  }
  return raw || 'Erro no upload do vídeo.'
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
    // Produção: /api na mesma origem (nginx faz proxy → apiclube, sem CORS)
    if (explicitBase === PROD_API_BASE) return DEV_MOBILE_API_BASE
    if (explicitBase && explicitBase !== DEV_MOBILE_API_BASE) return explicitBase
    return DEV_MOBILE_API_BASE
  }

  // Painel web: /api via proxy do Nuxt (dev e produção — uploads grandes sem limite de body no browser→apiclube)
  if (!isProductionBuild) {
    return DEV_MOBILE_API_BASE
  }

  if (explicitBase && explicitBase !== DEV_MOBILE_API_BASE && explicitBase !== '/api' && explicitBase !== PROD_API_BASE) {
    return explicitBase
  }

  return DEV_MOBILE_API_BASE
}

/** Ajuste no browser — corrige bundle com /api ou localhost embutidos. */
export function resolveApiBaseAtRuntime(configBase, { mobileApp, hostname } = {}) {
  if (isLocalHostname(hostname)) {
    return DEV_MOBILE_API_BASE
  }

  if (!mobileApp) {
    if (
      configBase === PROD_API_BASE
      || String(configBase).includes('apiclube.')
    ) {
      return DEV_MOBILE_API_BASE
    }
    return configBase
  }

  // App paciente: preferir /api (proxy nginx) — evita CORS com apiclube
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

export function apiConnectionErrorMessage({ hostname, dev = false } = {}) {
  const local = dev || isLocalHostname(hostname) || isPrivateLanHostname(hostname)
  if (local) {
    return 'Não foi possível conectar à API. Confira se o backend está rodando com npm run dev:backend (porta 3001) e se o iPad/Mac está no mesmo Wi‑Fi.'
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
