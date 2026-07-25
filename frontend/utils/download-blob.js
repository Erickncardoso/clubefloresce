export function downloadBlob(blob, filename = 'download') {
  if (!blob || typeof window === 'undefined') return
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadTextFile(text, filename = 'transcricao.txt') {
  const value = String(text || '')
  if (!value.trim()) return
  downloadBlob(new Blob([value], { type: 'text/plain;charset=utf-8' }), filename)
}
