/** Capa otimizada para cards 3:4 (Cloudinary ou URL direta). */
export function resolveTileCoverUrl(url, width = 390) {
  const value = String(url || '').trim()
  if (!value) return ''

  if (!/res\.cloudinary\.com\//i.test(value) || !value.includes('/upload/')) {
    return value
  }

  if (/\/upload\/[^/]*(?:f_|q_|w_|c_|h_)/.test(value)) {
    return value
  }

  const height = Math.round(width * (4 / 3))
  return value.replace('/upload/', `/upload/f_auto,q_auto,w_${width},h_${height},c_fill/`)
}
