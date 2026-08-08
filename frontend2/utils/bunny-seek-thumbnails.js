const SPRITE_COLS = 6
const SPRITE_ROWS = 6
const FRAMES_PER_PAGE = SPRITE_COLS * SPRITE_ROWS
const FRAME_WIDTH = 300

export function getSeekFrameHeight(width, height) {
  if (!width || !height) return 168.75
  return (height / width) * FRAME_WIDTH
}

export function getChapterAtTime(chapters, time) {
  if (!Array.isArray(chapters) || !chapters.length || !Number.isFinite(time)) return null

  let active = null
  for (const chapter of chapters) {
    if (time >= chapter.start) active = chapter
    else break
  }
  return active
}

export function buildSeekSpritePageUrl(metadata, pageNum = 0) {
  const videoId = metadata?.videoId
  const cdnHost = metadata?.cdnHost
  const seekPath = metadata?.seekPath
  const pageFile = `_${pageNum}.jpg`

  if (seekPath) {
    const template = String(seekPath)
      .replace('{videoId}', videoId || '')
      .replace('{videoGuid}', videoId || '')
      .replace(/\{pageNum\}|\{n\}|\$n\$/gi, String(pageNum))

    if (/^https?:\/\//i.test(template)) {
      return template.includes('.jpg') ? template : `${template.replace(/\/$/, '')}/${pageFile}`
    }

    const normalizedPath = template.startsWith('/')
      ? template
      : `/${videoId}/seek/${pageFile}`
    return `https://${cdnHost}${normalizedPath}`.replace(/([^:]\/)\/+/g, '$1')
  }

  const base = metadata?.seekSpriteBaseUrl || `https://${cdnHost}/${videoId}/seek`
  return `${String(base).replace(/\/$/, '')}/${pageFile}`
}

export function getSeekThumbnailAtTime(time, metadata, previewWidth = 160) {
  const length = Number(metadata?.length) || 0
  const videoId = metadata?.videoId
  const cdnHost = metadata?.cdnHost
  let thumbnailCount = Number(metadata?.thumbnailCount) || 0

  if (!length || !videoId || !cdnHost || !Number.isFinite(time)) {
    return null
  }

  if (!thumbnailCount) {
    thumbnailCount = length < 10
      ? Math.max(1, Math.ceil(length))
      : Math.max(1, Math.ceil(length / 2))
  }

  const frameHeight = getSeekFrameHeight(metadata.width, metadata.height)
  const frameDuration = length / thumbnailCount
  const frame = Math.min(
    thumbnailCount - 1,
    Math.max(0, Math.floor(time / frameDuration)),
  )

  const pageNum = Math.floor(frame / FRAMES_PER_PAGE)
  const frameInPage = frame % FRAMES_PER_PAGE
  const frameX = frameInPage % SPRITE_COLS
  const frameY = Math.floor(frameInPage / SPRITE_COLS)
  const spriteUrl = buildSeekSpritePageUrl(metadata, pageNum)

  const sheetWidth = SPRITE_COLS * FRAME_WIDTH
  const sheetHeight = SPRITE_ROWS * frameHeight
  const scale = previewWidth / FRAME_WIDTH
  const previewHeight = Math.round(frameHeight * scale)

  return {
    spriteUrl,
    fallbackUrl: metadata.thumbnailUrl || `https://${cdnHost}/${videoId}/thumbnail.jpg`,
    x: frameX * FRAME_WIDTH,
    y: frameY * frameHeight,
    w: FRAME_WIDTH,
    h: frameHeight,
    sheetWidth,
    sheetHeight,
    previewWidth,
    previewHeight,
    scale,
  }
}

export function buildSeekThumbnailStyle(thumbnail, previewWidth = 160) {
  if (!thumbnail) return null

  const scale = previewWidth / thumbnail.w
  return {
    width: `${previewWidth}px`,
    height: `${Math.round(thumbnail.h * scale)}px`,
    backgroundImage: `url("${thumbnail.spriteUrl}")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: `-${thumbnail.x * scale}px -${thumbnail.y * scale}px`,
    backgroundSize: `${thumbnail.sheetWidth * scale}px ${thumbnail.sheetHeight * scale}px`,
  }
}

export function buildSeekThumbnailImageStyle(thumbnail, previewWidth = 160) {
  if (!thumbnail) return null

  const scale = previewWidth / thumbnail.w
  return {
    width: `${thumbnail.sheetWidth * scale}px`,
    height: `${thumbnail.sheetHeight * scale}px`,
    marginLeft: `-${thumbnail.x * scale}px`,
    marginTop: `-${thumbnail.y * scale}px`,
    maxWidth: 'none',
  }
}
