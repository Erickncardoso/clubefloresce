/** Helpers de playback — Bunny Stream / Cloudinary / HLS (espelho do Nuxt). */

const BUNNY_HOST = /\.b-cdn\.net\//i
const BUNNY_HLS = /\/playlist\.m3u8(?:\?|$)/i
const BUNNY_MP4 = /\/play_\d+p\.mp4(?:\?|$)/i
const CLOUDINARY_HOST = 'res.cloudinary.com'

export function isBunnyStreamVideoUrl(videoUrl = '') {
  if (!videoUrl || !BUNNY_HOST.test(videoUrl)) return false
  return BUNNY_HLS.test(videoUrl) || BUNNY_MP4.test(videoUrl)
}

export function parseBunnyStreamVideoId(videoUrl: string): string | null {
  if (!videoUrl || !BUNNY_HOST.test(videoUrl)) return null
  try {
    const parts = new URL(videoUrl).pathname.split('/').filter(Boolean)
    if (!parts.length) return null
    const last = parts[parts.length - 1]
    if (last === 'playlist.m3u8' || /^play_\d+p\.mp4$/i.test(last)) {
      return parts[parts.length - 2] || null
    }
    return parts[0] || null
  } catch {
    return null
  }
}

export function getBunnyStreamHlsUrl(videoUrl: string) {
  if (!videoUrl) return ''
  if (BUNNY_HLS.test(videoUrl)) return videoUrl
  const videoId = parseBunnyStreamVideoId(videoUrl)
  if (!videoId) return videoUrl
  try {
    return `https://${new URL(videoUrl).host}/${videoId}/playlist.m3u8`
  } catch {
    return videoUrl
  }
}

export function getBunnyStreamMp4Url(videoUrl: string, height = 720) {
  const videoId = parseBunnyStreamVideoId(videoUrl)
  if (!videoId) return videoUrl
  try {
    return `https://${new URL(videoUrl).host}/${videoId}/play_${height}p.mp4`
  } catch {
    return videoUrl
  }
}

export function isCloudinaryVideoUrl(videoUrl = '') {
  return Boolean(videoUrl && videoUrl.includes(CLOUDINARY_HOST) && /\/video\//i.test(videoUrl))
}

function isLikelyTransformSegment(segment: string) {
  if (!segment || segment.includes('.')) return false
  if (/^v\d+$/.test(segment)) return false
  if (segment.includes(',')) return true
  return /^[a-z]{1,3}_[\w.-]+$/i.test(segment)
}

export function getBaseCloudinaryVideoUrl(videoUrl: string) {
  if (!isCloudinaryVideoUrl(videoUrl)) return videoUrl
  try {
    const url = new URL(videoUrl)
    const parts = url.pathname.split('/').filter(Boolean)
    const uploadIdx = parts.indexOf('upload')
    if (uploadIdx < 2) return videoUrl
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
    if (!cloudName || !publicId) return videoUrl
    const versionSegment = version ? `v${version}/` : ''
    return `https://${CLOUDINARY_HOST}/${cloudName}/video/upload/${versionSegment}${publicId}.${extension}`
  } catch {
    return videoUrl
  }
}

export function getCloudinaryHlsUrl(videoUrl: string) {
  if (!isCloudinaryVideoUrl(videoUrl)) return ''
  try {
    const base = getBaseCloudinaryVideoUrl(videoUrl)
    return base.replace(/\.[a-z0-9]+$/i, '.m3u8').replace(
      /\/video\/upload\//,
      '/video/upload/sp_auto/',
    )
  } catch {
    return ''
  }
}

export function isHlsUrl(videoUrl = '') {
  return /\.m3u8(?:\?|$)/i.test(videoUrl)
}

const DEFAULT_BUNNY_LIBRARY_ID = '683348'

export function getBunnyStreamLibraryId() {
  return (
    process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID?.trim() || DEFAULT_BUNNY_LIBRARY_ID
  )
}

/** Player oficial Bunny — evita 403 do CDN por referer (ex.: localhost:3003 bloqueado). */
export function buildBunnyStreamEmbedUrl(libraryId: string, videoId: string) {
  const lib = String(libraryId || '').trim()
  const id = String(videoId || '').trim()
  if (!lib || !id) return ''
  return `https://iframe.mediadelivery.net/embed/${lib}/${id}?autoplay=false&preload=true&playerjs=true`
}

export function getBunnyEmbedUrl(videoUrl: string) {
  if (!isBunnyStreamVideoUrl(videoUrl) && !/\.b-cdn\.net\//i.test(videoUrl)) return ''
  const videoId = parseBunnyStreamVideoId(videoUrl)
  if (!videoId) return ''
  return buildBunnyStreamEmbedUrl(getBunnyStreamLibraryId(), videoId)
}

export type PlayableVideoSource = {
  kind: 'bunny-embed' | 'hls' | 'mp4' | 'empty'
  src: string
  fallbackSrc?: string
  useHls: boolean
}

/**
 * Resolve fonte tocável no browser.
 * Bunny Stream: proxy HLS no Next (CDN bloqueia referers não liberados, ex. :3003).
 */
export function resolvePlayableVideoSource(videoUrl: string): PlayableVideoSource {
  const raw = String(videoUrl || '').trim()
  if (!raw) return { kind: 'empty', src: '', useHls: false }

  if (isBunnyStreamVideoUrl(raw) || (/\.b-cdn\.net\//i.test(raw) && isHlsUrl(raw))) {
    const videoId = parseBunnyStreamVideoId(raw)
    if (videoId) {
      return {
        kind: 'hls',
        src: `/bunny-cdn/${videoId}/playlist.m3u8`,
        useHls: true,
      }
    }
  }

  if (isCloudinaryVideoUrl(raw)) {
    const mp4 = getBaseCloudinaryVideoUrl(raw)
    if (isHlsUrl(raw)) {
      return { kind: 'hls', src: raw, fallbackSrc: mp4, useHls: true }
    }
    return { kind: 'mp4', src: mp4, useHls: false }
  }

  if (isHlsUrl(raw)) {
    return { kind: 'hls', src: raw, useHls: true }
  }

  return { kind: 'mp4', src: raw, useHls: false }
}
