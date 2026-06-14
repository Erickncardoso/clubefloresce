import { DEV_PANEL_API_BASE } from './resolve-api-base.mjs'

/**
 * Upload de vídeo vai direto ao backend em dev para evitar limite/timeout do proxy do Vite
 * em arquivos grandes (100MB+).
 */
export function resolveVideoUploadEndpoint(apiBase) {
  if (import.meta.client) {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
      return `${DEV_PANEL_API_BASE}/upload/video`
    }
  }

  return `${apiBase}/upload/video`
}
