import { parseTranscriptionTimeToSeconds } from './cloudinary-video'

export type CaptionCue = {
  start: number
  end: number
  text: string
}

function parseVttTimestamp(value: string): number {
  const normalized = String(value || '').trim().replace(',', '.').split(/\s+/)[0]
  const parts = normalized.split(':').map((part) => Number(part))
  if (parts.some((n) => Number.isNaN(n))) return 0
  if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2]
  if (parts.length === 2) return (parts[0] * 60) + parts[1]
  return parts[0] || 0
}

export function parseVttToCaptionCues(vtt: string): CaptionCue[] {
  const normalized = String(vtt || '').replace(/\r/g, '').trim()
  if (!normalized) return []

  const blocks = normalized.split(/\n{2,}/)
  const cues: CaptionCue[] = []

  for (const block of blocks) {
    const rows = block.split('\n').map((row) => row.trim()).filter(Boolean)
    const timeRowIndex = rows.findIndex((row) => /-->/i.test(row))
    if (timeRowIndex === -1) continue

    const [startRaw, endRaw] = rows[timeRowIndex].split('-->').map((part) => part.trim())
    const start = parseVttTimestamp(startRaw)
    const end = parseVttTimestamp(endRaw)
    const text = rows
      .slice(timeRowIndex + 1)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .trim()

    if (!text || !Number.isFinite(start)) continue

    cues.push({
      start,
      end: Number.isFinite(end) && end > start ? end : start + 2,
      text,
    })
  }

  return cues
}

export function getActiveCaptionCue(
  cues: CaptionCue[],
  currentTime: number,
): CaptionCue | null {
  if (!Array.isArray(cues) || !cues.length || !Number.isFinite(currentTime)) return null

  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index]
    const next = cues[index + 1]
    const end = next?.start ?? cue.end ?? cue.start + 4
    if (currentTime >= cue.start && currentTime < end) return cue
  }

  return null
}

export function transcriptionToCaptionCues(transcription: unknown): CaptionCue[] {
  const lines = getTranscriptionDisplayLines(transcription)
  if (!lines.length) return []

  return lines.map((line, index) => {
    const next = lines[index + 1]
    return {
      start: line.seconds,
      end: next ? next.seconds : line.seconds + 5,
      text: line.text.trim(),
    }
  }).filter((cue) => cue.text)
}

export type TranscriptionChunk = {
  time: string
  text: string
  seconds: number
}

export function getTranscriptionDisplayLines(
  transcription: unknown,
): TranscriptionChunk[] {
  if (!Array.isArray(transcription) || !transcription.length) return []

  return transcription
    .map((line) => {
      if (!line || typeof line !== 'object') return null
      const item = line as Record<string, unknown>
      const text = String(item.text || '').trim()
      if (!text) return null
      const seconds = Number(
        item.seconds ?? parseTranscriptionTimeToSeconds(String(item.time || '')),
      )
      return {
        time: formatTranscriptionDisplayTime(String(item.time || ''), seconds),
        text,
        seconds,
      }
    })
    .filter((line): line is TranscriptionChunk => Boolean(line))
}

export function formatTranscriptionDisplayTime(time: string, seconds?: number): string {
  const total = Number.isFinite(seconds)
    ? Number(seconds)
    : parseTranscriptionTimeToSeconds(time)
  if (!Number.isFinite(total) || total < 0) return time || '0:00'

  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = Math.floor(total % 60)

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

export function flattenTranscriptionChunks(
  transcription: unknown,
): TranscriptionChunk[] {
  if (!Array.isArray(transcription) || !transcription.length) return []

  const lines = transcription
    .map((line) => {
      if (!line || typeof line !== 'object') return null
      const item = line as Record<string, unknown>
      const text = String(item.text || '').trim()
      if (!text) return null
      const seconds = Number(
        item.seconds ?? parseTranscriptionTimeToSeconds(String(item.time || '')),
      )
      return {
        time: String(item.time || ''),
        text: /[,.!?;:\s]$/.test(text) ? text : `${text} `,
        seconds,
      }
    })
    .filter((line): line is TranscriptionChunk => Boolean(line))

  if (!lines.length) return []

  const avgLength = lines.reduce((sum, line) => sum + line.text.length, 0) / lines.length
  if (lines.length >= 12 && avgLength <= 24) {
    return lines
  }

  const expanded: TranscriptionChunk[] = []
  for (const line of lines) {
    const parts = line.text.trim().split(/\s+/).filter(Boolean)
    if (parts.length <= 1) {
      expanded.push(line)
      continue
    }
    for (const part of parts) {
      expanded.push({
        time: line.time,
        text: /[,.!?;:]$/.test(part) ? `${part} ` : `${part} `,
        seconds: line.seconds,
      })
    }
  }

  return expanded
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

  if (currentTime < start) {
    return { state: 'upcoming', progress: 0 }
  }
  if (currentTime >= safeEnd) {
    return { state: 'past', progress: 1 }
  }

  const duration = Math.max(safeEnd - start, 0.15)
  return {
    state: 'active',
    progress: Math.min(1, Math.max(0, (currentTime - start) / duration)),
  }
}

export function isTranscriptionChunkActive(
  chunk: TranscriptionChunk,
  index: number,
  chunks: TranscriptionChunk[],
  currentTime: number,
): boolean {
  const start = Number(chunk.seconds ?? 0)
  const next = chunks[index + 1]
  const end = next ? Number(next.seconds ?? start + 1) : Number.POSITIVE_INFINITY
  return currentTime >= start && currentTime < end
}
