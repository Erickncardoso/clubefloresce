import { parseTranscriptionTimeToSeconds } from './cloudinary-video'

export type TranscriptionChunk = {
  time: string
  text: string
  seconds: number
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
