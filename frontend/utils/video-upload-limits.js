const MB = 1024 * 1024

/** Limite do plano Cloudinary para upload direto (100 MB). */
export const CLOUDINARY_VIDEO_MAX_BYTES = 100 * MB

/** Acima disso envia ao servidor para comprimir antes do Cloudinary. */
export const VIDEO_COMPRESS_THRESHOLD_BYTES = 95 * MB

export function needsServerCompression(file) {
  return Boolean(file?.size && file.size > VIDEO_COMPRESS_THRESHOLD_BYTES)
}

export function isCloudinarySizeError(error) {
  const message = String(error?.message || '')
  return /file size too large|104857600|maximum is/i.test(message)
}
