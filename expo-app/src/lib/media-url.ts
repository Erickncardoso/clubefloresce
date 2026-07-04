import { getApiBase } from '@/config/env';

export function resolveMediaUrl(url?: string | null): string {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;

  const apiBase = getApiBase().replace(/\/$/, '');
  const path = value.startsWith('/') ? value : `/${value}`;

  if (path.startsWith('/api/')) {
    const origin = apiBase.replace(/\/api$/, '');
    return `${origin}${path}`;
  }

  const origin = apiBase.replace(/\/api\/?$/, '');
  return `${origin}${path}`;
}

export function resolveTileCoverUrl(url?: string | null, width = 390): string {
  const value = resolveMediaUrl(url);
  if (!value) return '';
  if (!/res\.cloudinary\.com\//i.test(value) || !value.includes('/upload/')) {
    return value;
  }
  if (/\/upload\/[^/]*(?:f_|q_|w_|c_|h_)/.test(value)) return value;
  const height = Math.round(width * (4 / 3));
  return value.replace('/upload/', `/upload/f_auto,q_auto,w_${width},h_${height},c_fill/`);
}
