import { DEV_MOBILE_API_BASE } from './resolve-api-base.mjs'

/** Endpoint de upload de vídeo — mesma origem (/api), qualquer rede ou país. */
export function resolveVideoUploadEndpoint(apiBase) {
  const base = String(apiBase || DEV_MOBILE_API_BASE).replace(/\/$/, '')
  return `${base}/upload/video`
}
