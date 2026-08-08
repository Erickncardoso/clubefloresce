export function parseTranscriptionTimeToSeconds(time: string): number {
  const normalized = String(time || '').trim().replace(',', '.')
  if (!normalized) return 0
  if (/^\d+(\.\d+)?$/.test(normalized)) return Number(normalized)

  const parts = normalized.split(':').map((part) => Number(part))
  if (parts.some((n) => Number.isNaN(n))) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] || 0
}

export type TranscriptionChunk = {
  time: string
  text: string
  seconds: number
}

export function formatTranscriptionDisplayTime(time: string, seconds?: number): string {
  const total = Number.isFinite(seconds) ? Number(seconds) : parseTranscriptionTimeToSeconds(time)
  if (!Number.isFinite(total) || total < 0) return time || '0:00'

  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = Math.floor(total % 60)

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

export function getTranscriptionDisplayLines(transcription: unknown): TranscriptionChunk[] {
  if (!Array.isArray(transcription) || !transcription.length) return []

  return transcription
    .map((line) => {
      if (!line || typeof line !== 'object') return null
      const item = line as Record<string, unknown>
      const text = String(item.text || '').trim()
      if (!text) return null
      const seconds = Number(item.seconds ?? parseTranscriptionTimeToSeconds(String(item.time || '')))
      return {
        time: formatTranscriptionDisplayTime(String(item.time || ''), seconds),
        text,
        seconds,
      }
    })
    .filter((line): line is TranscriptionChunk => Boolean(line))
}

export function getTranscriptionLineState(
  chunk: TranscriptionChunk,
  index: number,
  chunks: TranscriptionChunk[],
  currentTime: number,
): { state: 'upcoming' | 'active' | 'past'; progress: number } {
  const start = Number(chunk.seconds ?? 0)
  const next = chunks[index + 1]
  const end = next ? Number(next.seconds) : start + 5
  const safeEnd = end > start ? end : start + 5

  if (currentTime < start) return { state: 'upcoming', progress: 0 }
  if (currentTime >= safeEnd) return { state: 'past', progress: 1 }
  const duration = Math.max(safeEnd - start, 0.15)
  const progress = Math.min(1, Math.max(0, (currentTime - start) / duration))
  return { state: 'active', progress }
}

/** Separa mantendo espaços — para karaoke palavra a palavra (evita bug do gradient em wrap). */
export function splitTranscriptionWords(text: string): string[] {
  return String(text || '').split(/(\s+)/).filter((part) => part.length > 0)
}

export function isKaraokeWordSpoken(
  wordIndex: number,
  wordCount: number,
  progress: number,
): boolean {
  if (wordCount <= 0) return progress >= 1
  if (progress >= 1) return true
  if (progress <= 0) return false
  return wordIndex < progress * wordCount
}
