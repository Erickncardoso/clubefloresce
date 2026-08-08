/**
 * Gera miniatura JPEG a partir do primeiro frame útil do vídeo.
 */
export function captureVideoThumbnail(file, seekRatio = 0.08) {
  if (!import.meta.client || !file) return Promise.resolve(null)

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.src = objectUrl

    let settled = false
    const finish = (thumbUrl) => {
      if (settled) return
      settled = true
      URL.revokeObjectURL(objectUrl)
      video.removeAttribute('src')
      video.load()
      resolve(thumbUrl)
    }

    const timeout = setTimeout(() => finish(null), 12000)

    video.addEventListener('loadedmetadata', () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      const seek = duration > 0 ? Math.min(Math.max(duration * seekRatio, 0.1), duration - 0.1) : 0.1
      video.currentTime = seek
    }, { once: true })

    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas')
        const width = video.videoWidth || 320
        const height = video.videoHeight || 180
        const targetW = 128
        const targetH = Math.round((height / width) * targetW) || 72
        canvas.width = targetW
        canvas.height = targetH
        canvas.getContext('2d')?.drawImage(video, 0, 0, targetW, targetH)
        canvas.toBlob((blob) => {
          clearTimeout(timeout)
          finish(blob ? URL.createObjectURL(blob) : null)
        }, 'image/jpeg', 0.84)
      } catch {
        clearTimeout(timeout)
        finish(null)
      }
    }, { once: true })

    video.addEventListener('error', () => {
      clearTimeout(timeout)
      finish(null)
    }, { once: true })
  })
}

export function revokeThumbnailUrl(url) {
  if (url && String(url).startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}
