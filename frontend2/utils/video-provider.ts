import { getBunnyStreamCaptionCandidates, isBunnyStreamVideoUrl } from './bunny-video'
import { getCloudinaryCaptionUrl, isCloudinaryVideoUrl } from './cloudinary-video'

export function isManagedVideoUrl(videoUrl) {
  return isCloudinaryVideoUrl(videoUrl) || isBunnyStreamVideoUrl(videoUrl)
}

export function getVideoProvider(videoUrl) {
  if (isBunnyStreamVideoUrl(videoUrl)) return 'bunny'
  if (isCloudinaryVideoUrl(videoUrl)) return 'cloudinary'
  return 'external'
}

export function getVideoCaptionUrl(videoUrl, lang = 'pt') {
  const candidates = getVideoCaptionCandidates(videoUrl, lang)
  return candidates[0] || ''
}

export function getVideoCaptionCandidates(videoUrl, lang = 'pt') {
  if (!videoUrl) return []
  if (isBunnyStreamVideoUrl(videoUrl)) return getBunnyStreamCaptionCandidates(videoUrl, lang)
  if (isCloudinaryVideoUrl(videoUrl)) {
    const primary = getCloudinaryCaptionUrl(videoUrl, lang === 'pt' ? 'pt-BR' : lang)
    return Array.from(new Set([primary, primary.replace('.pt-BR.vtt', '.vtt')].filter(Boolean)))
  }
  return []
}

export function shouldUseBackendVideoUpload(preparation) {
  if (!preparation) return true
  if (preparation.provider === 'bunny') return true
  return preparation.directUpload === false
}
