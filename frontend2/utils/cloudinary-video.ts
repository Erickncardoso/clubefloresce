const CLOUDINARY_HOST = 'res.cloudinary.com'

export type CloudinaryVideoRef = {
  cloudName: string
  publicId: string
  version?: number
  extension: string
}

export type VideoQualityPreset = 'auto' | '480p' | '720p' | '1080p'

const QUALITY_TRANSFORMS: Record<Exclude<VideoQualityPreset, 'auto'>, string> = {
  '480p': 'h_480,c_limit,q_auto:eco',
  '720p': 'h_720,c_limit,q_auto:good',
  '1080p': 'h_1080,c_limit,q_auto:best',
}

const QUALITY_HEIGHTS: Record<Exclude<VideoQualityPreset, 'auto'>, number> = {
  '480p': 480,
  '720p': 720,
  '1080p': 1080,
}

function isLikelyTransformSegment(segment: string): boolean {
  if (!segment || segment.includes('.')) return false
  if (/^v\d+$/.test(segment)) return false
  if (segment.includes(',')) return true
  return /^[a-z]{1,3}_[\w.-]+$/i.test(segment)
}

export function parseCloudinaryVideoUrl(videoUrl: string): CloudinaryVideoRef | null {
  if (!videoUrl || !videoUrl.includes(CLOUDINARY_HOST)) return null

  try {
    const url = new URL(videoUrl)
    const parts = url.pathname.split('/').filter(Boolean)
    const uploadIdx = parts.indexOf('upload')
    if (uploadIdx < 2) return null

    const cloudName = parts[uploadIdx - 2]
    let cursor = uploadIdx + 1
    let version: number | undefined

    while (cursor < parts.length) {
      const segment = parts[cursor]
      if (/^v\d+$/.test(segment)) {
        version = Number(segment.slice(1))
        cursor += 1
        break
      }
      if (isLikelyTransformSegment(segment)) {
        cursor += 1
        continue
      }
      break
    }

    const publicIdWithExt = parts.slice(cursor).join('/')
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '')
    const extension = publicIdWithExt.match(/\.([a-z0-9]+)$/i)?.[1] || 'mp4'
    if (!cloudName || !publicId) return null

    return { cloudName, publicId, version, extension }
  } catch {
    return null
  }
}

function buildCloudinaryVideoUrl(ref: CloudinaryVideoRef, transform?: string): string {
  const versionSegment = ref.version ? `v${ref.version}/` : ''
  const transformSegment = transform ? `${transform}/` : ''
  return `https://${CLOUDINARY_HOST}/${ref.cloudName}/video/upload/${transformSegment}${versionSegment}${ref.publicId}.${ref.extension}`
}

export function getBaseCloudinaryVideoUrl(videoUrl: string): string {
  const ref = parseCloudinaryVideoUrl(videoUrl)
  if (!ref) return videoUrl
  return buildCloudinaryVideoUrl(ref)
}

function buildRawUrl(ref: CloudinaryVideoRef, suffix: string): string {
  const versionSegment = ref.version ? `v${ref.version}/` : ''
  return `https://${CLOUDINARY_HOST}/${ref.cloudName}/raw/upload/${versionSegment}${ref.publicId}${suffix}`
}

export function getCloudinaryCaptionUrl(videoUrl: string, lang = 'pt-BR'): string {
  const ref = parseCloudinaryVideoUrl(videoUrl)
  if (!ref) return ''
  return buildRawUrl(ref, `.${lang}.vtt`)
}

export function isCloudinaryVideoUrl(videoUrl: string): boolean {
  return Boolean(parseCloudinaryVideoUrl(videoUrl))
}

/** Aplica transformação de altura no vídeo Cloudinary (qualidade). */
export function applyCloudinaryVideoQuality(
  videoUrl: string,
  quality: VideoQualityPreset,
): string {
  if (!isCloudinaryVideoUrl(videoUrl)) return videoUrl

  const ref = parseCloudinaryVideoUrl(videoUrl)
  if (!ref) return videoUrl

  if (quality === 'auto') return buildCloudinaryVideoUrl(ref)
  return buildCloudinaryVideoUrl(ref, QUALITY_TRANSFORMS[quality])
}

/** URL HLS adaptativa do Cloudinary (troca de qualidade sem recarregar o vídeo). */
export function getCloudinaryHlsUrl(videoUrl: string): string {
  const ref = parseCloudinaryVideoUrl(videoUrl)
  if (!ref) return ''
  const versionSegment = ref.version ? `v${ref.version}/` : ''
  return `https://${CLOUDINARY_HOST}/${ref.cloudName}/video/upload/sp_auto/${versionSegment}${ref.publicId}.m3u8`
}

export function getQualityTargetHeight(quality: VideoQualityPreset): number | null {
  if (quality === 'auto') return null
  return QUALITY_HEIGHTS[quality]
}

export function parseTranscriptionTimeToSeconds(time: string): number {
  const parts = String(time || '').split(':').map((p) => Number(p))
  if (parts.some((n) => Number.isNaN(n))) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] || 0
}

export function heightToQualityLabel(height: number): string {
  if (!Number.isFinite(height) || height <= 0) return '480p'
  if (height >= 1080) return '1080p'
  if (height >= 720) return '720p'
  if (height >= 480) return '480p'
  return `${height}p`
}
