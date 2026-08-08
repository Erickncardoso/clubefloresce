const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|avi|mkv|m4v)$/i
const VIDEO_MIMES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/x-matroska',
  'video/m4v',
])

/** Limite de envio de PDF para ebooks — alinhado ao Cloudinary Advanced (40 MB). */
export const EBOOK_PDF_MAX_BYTES = 40 * 1024 * 1024
export const EBOOK_PDF_MAX_LABEL = '40 MB'
export const EBOOK_PDF_UPLOAD_HINT = `Tamanho máximo: ${EBOOK_PDF_MAX_LABEL}`

const PDF_EXTENSIONS = /\.pdf$/i

export function isPdfFile(file) {
  if (!file) return false
  const name = String(file.name || '').toLowerCase()
  const type = String(file.type || '').toLowerCase()
  return type === 'application/pdf' || PDF_EXTENSIONS.test(name)
}

export function isVideoFile(file) {
  if (!file) return false
  const name = String(file.name || '').toLowerCase()
  const type = String(file.type || '').toLowerCase()
  if (isPdfFile(file)) return false
  if (VIDEO_MIMES.has(type) || type.startsWith('video/')) return true
  return VIDEO_EXTENSIONS.test(name)
}
