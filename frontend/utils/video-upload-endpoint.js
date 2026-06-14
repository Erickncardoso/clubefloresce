import { resolveDevBackendApiBase, isDevBackendDirectHostname, isDevEnvironment } from './resolve-api-base.mjs'

/**
 * Upload de vídeo vai direto ao backend em dev para evitar limite/timeout do proxy do Vite
 * e falhas de upload no Safari (iPad/Mac em rede local).
 */
export function resolveVideoUploadEndpoint(apiBase) {
  if (typeof window !== 'undefined' && isDevEnvironment() && isDevBackendDirectHostname(window.location.hostname)) {
    return `${resolveDevBackendApiBase()}/upload/video`
  }

  return `${apiBase}/upload/video`
}
