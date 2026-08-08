const BUNNY_STREAM_HOST_PATTERN = /\.b-cdn\.net\//i
const BUNNY_HLS_PATTERN = /\/playlist\.m3u8(?:\?|$)/i
const BUNNY_MP4_PATTERN = /\/play_\d+p\.mp4(?:\?|$)/i
const BUNNY_STORAGE_HOST_PATTERN = /\.b-cdn\.net\//i

export function isBunnyStreamVideoUrl(videoUrl) {
  if (!videoUrl) return false
  if (!BUNNY_STREAM_HOST_PATTERN.test(videoUrl)) return false
  return BUNNY_HLS_PATTERN.test(videoUrl) || BUNNY_MP4_PATTERN.test(videoUrl)
}

export function isBunnyStorageFileUrl(fileUrl) {
  if (!fileUrl) return false
  return BUNNY_STORAGE_HOST_PATTERN.test(fileUrl) && !BUNNY_HLS_PATTERN.test(fileUrl) && !BUNNY_MP4_PATTERN.test(fileUrl)
}

export function parseBunnyStreamVideoId(videoUrl) {
  if (!videoUrl || !BUNNY_STREAM_HOST_PATTERN.test(videoUrl)) return null
  try {
    const pathname = new URL(videoUrl).pathname
    const parts = pathname.split('/').filter(Boolean)
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

export function getBunnyStreamHlsUrl(videoUrl) {
  if (!videoUrl) return ''
  if (BUNNY_HLS_PATTERN.test(videoUrl)) return videoUrl

  const videoId = parseBunnyStreamVideoId(videoUrl)
    || videoUrl.replace(/^https?:\/\//, '').split('/').filter(Boolean)[0]
  if (!videoId) return videoUrl

  try {
    const host = new URL(videoUrl).host
    return `https://${host}/${videoId}/playlist.m3u8`
  } catch {
    return videoUrl
  }
}

export function getBunnyStreamCaptionUrl(videoUrl, preferredLang = 'pt') {
  const candidates = getBunnyStreamCaptionCandidates(videoUrl, preferredLang)
  return candidates[0] || ''
}

export function getBunnyStreamCaptionCandidates(videoUrl, preferredLang = 'pt') {
  const videoId = parseBunnyStreamVideoId(videoUrl)
  if (!videoId) return []

  try {
    const host = new URL(videoUrl).host
    const normalized = String(preferredLang || 'pt').trim().toLowerCase()
    const preferred = normalized === 'pt' || normalized === 'pt-br' ? ['pt-br', 'pt', 'por'] : [normalized]
    const fallbacks = ['pt-br', 'pt', 'por', 'en']
    const langs = Array.from(new Set([...preferred, ...fallbacks]))
    return langs.map((lang) => `https://${host}/${videoId}/captions/${lang}.vtt`)
  } catch {
    return []
  }
}

export function getBunnyStreamMp4Url(videoUrl, height = 720) {
  const videoId = parseBunnyStreamVideoId(videoUrl)
  if (!videoId) return videoUrl
  try {
    const host = new URL(videoUrl).host
    return `https://${host}/${videoId}/play_${height}p.mp4`
  } catch {
    return videoUrl
  }
}
