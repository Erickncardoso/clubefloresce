import { getApiBase } from '@/config/env';

export function parseDocumentSrcQuery(raw: unknown): string {
  const value = String(raw || '').trim();
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeDocumentUrl(rawUrl: string, apiBase = getApiBase()): string {
  const value = String(rawUrl || '').trim();
  if (!value) return '';

  const base = String(apiBase || '/api').replace(/\/$/, '');

  if (value.startsWith(`${base}/upload/document`) || value.startsWith('/api/upload/document')) {
    return value.startsWith('/') ? value : `${base}/upload/document${value.split('/upload/document')[1] || ''}`;
  }

  try {
    const parsed = new URL(value, 'http://local.invalid');
    if (parsed.pathname.includes('/upload/document')) {
      const token = parsed.searchParams.get('token');
      if (token) return `${base}/upload/document?token=${encodeURIComponent(token)}`;
    }
  } catch {
    /* ignore */
  }

  return value;
}

export function resolveDocumentSrcFromRoute(
  query: Record<string, unknown>,
  apiBase = getApiBase(),
): string {
  let raw = parseDocumentSrcQuery(query.src);
  if (!raw) return '';

  const orphanToken = query.token;
  if (
    typeof orphanToken === 'string'
    && orphanToken.trim()
    && raw.includes('/upload/document')
    && !raw.includes('token=')
  ) {
    raw = `${raw}?token=${encodeURIComponent(orphanToken.trim())}`;
  }

  return normalizeDocumentUrl(raw, apiBase);
}

export function toAbsoluteDocumentUrl(src: string): string {
  if (src.startsWith('http')) return src;
  const base = getApiBase();
  const origin = base.replace(/\/api\/?$/, '');
  if (src.startsWith('/api/')) return `${origin}${src}`;
  if (src.startsWith('/')) return `${base}${src}`;
  return src;
}
