const thumbCache = new Map()

export const buildPdfFirstPageThumbnail = async (pdfUrl) => {
  if (typeof window === 'undefined') return ''
  const sourceUrl = String(pdfUrl || '').trim()
  if (!sourceUrl) return ''
  if (thumbCache.has(sourceUrl)) return thumbCache.get(sourceUrl) || ''

  try {
    const [{ getDocument, GlobalWorkerOptions }, workerModule] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    ])
    GlobalWorkerOptions.workerSrc = workerModule.default
    const response = await fetch(sourceUrl)
    if (!response.ok) throw new Error('pdf_fetch_failed')
    const data = await response.arrayBuffer()
    const loadingTask = getDocument({ data: new Uint8Array(data) })
    const pdf = await loadingTask.promise
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 1 })
    const maxWidth = 620
    const targetScale = viewport.width > 0 ? Math.min(2, maxWidth / viewport.width) : 1
    const scaledViewport = page.getViewport({ scale: targetScale })

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) {
      thumbCache.set(sourceUrl, '')
      return ''
    }
    canvas.width = Math.max(1, Math.floor(scaledViewport.width))
    canvas.height = Math.max(1, Math.floor(scaledViewport.height))

    await page.render({ canvasContext: context, viewport: scaledViewport }).promise
    const thumbnail = canvas.toDataURL('image/jpeg', 0.84)
    thumbCache.set(sourceUrl, thumbnail)
    try { pdf.destroy() } catch {}
    return thumbnail
  } catch {
    thumbCache.set(sourceUrl, '')
    return ''
  }
}
