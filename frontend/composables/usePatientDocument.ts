/** Decodifica `src` vindo da query da rota `/documento`. */
export function parseDocumentSrcQuery(raw: unknown): string {
  const value = String(raw || '').trim()
  if (!value) return ''

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Monta a URL do documento a partir da query da rota.
 * Corrige URLs antigas em que o `token` vazou para um parâmetro irmão.
 */
export function resolveDocumentSrcFromRoute(
  query: Record<string, unknown>,
  apiBase = '/api',
): string {
  let raw = parseDocumentSrcQuery(query.src)
  if (!raw) return ''

  const orphanToken = query.token
  if (
    typeof orphanToken === 'string'
    && orphanToken.trim()
    && raw.includes('/upload/document')
    && !raw.includes('token=')
  ) {
    raw = `${raw}?token=${encodeURIComponent(orphanToken.trim())}`
  }

  return normalizeDocumentUrl(raw, apiBase)
}

/** Normaliza links de PDF/documento para funcionar no PWA (mesma origem /api). */
export function normalizeDocumentUrl(rawUrl: string, apiBase = '/api'): string {
  const value = String(rawUrl || '').trim()
  if (!value) return ''

  const base = String(apiBase || '/api').replace(/\/$/, '')

  if (value.startsWith(`${base}/upload/document`) || value.startsWith('/api/upload/document')) {
    return value.startsWith('/') ? value : `${base}/upload/document${value.split('/upload/document')[1] || ''}`
  }

  try {
    const parsed = new URL(value, 'http://local.invalid')
    if (parsed.pathname.includes('/upload/document')) {
      const token = parsed.searchParams.get('token')
      if (token) {
        return `${base}/upload/document?token=${encodeURIComponent(token)}`
      }
    }
  } catch {
    /* ignora */
  }

  return value
}

export function usePatientDocument() {
  const config = useRuntimeConfig()
  const router = useRouter()

  function resolveDocumentUrl(rawUrl: string) {
    return normalizeDocumentUrl(rawUrl, config.public.apiBase)
  }

  function openDocument(rawUrl: string, options: { title?: string } = {}) {
    const url = resolveDocumentUrl(rawUrl)
    if (!url) return

    if (config.public.mobileApp) {
      void navigateTo({
        path: '/documento',
        query: {
          // Codifica para não quebrar com `?token=` na query da página.
          src: encodeURIComponent(url),
          title: options.title ? options.title : undefined,
          from: router.currentRoute.value.fullPath,
        },
      })
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return {
    resolveDocumentUrl,
    resolveDocumentSrcFromRoute: (query: Record<string, unknown>) =>
      resolveDocumentSrcFromRoute(query, config.public.apiBase),
    openDocument,
  }
}
