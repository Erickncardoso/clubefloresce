export type LessonNote = {
  id: string
  seconds: number
  time: string
  text: string
  createdAt: number
}

export function formatNoteTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

function notesStorageKey(lessonId: string): string {
  return `aula_notes_${lessonId}`
}

export function loadLessonNotes(lessonId: string): LessonNote[] {
  if (!import.meta.client || !lessonId) return []

  const raw = localStorage.getItem(notesStorageKey(lessonId))
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => normalizeLessonNote(item))
      .filter((note): note is LessonNote => Boolean(note))
      .sort((a, b) => a.seconds - b.seconds || a.createdAt - b.createdAt)
  } catch {
    return []
  }
}

export function saveLessonNotes(lessonId: string, notes: LessonNote[]): void {
  if (!import.meta.client || !lessonId) return
  localStorage.setItem(notesStorageKey(lessonId), JSON.stringify(notes))
}

export function createLessonNote(seconds: number, text: string): LessonNote {
  const trimmed = text.trim()
  return {
    id: globalThis.crypto?.randomUUID?.() || `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    seconds,
    time: formatNoteTime(seconds),
    text: trimmed,
    createdAt: Date.now(),
  }
}

function normalizeLessonNote(value: unknown): LessonNote | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const text = String(item.text || '').trim()
  if (!text) return null
  const seconds = Number(item.seconds ?? 0)
  return {
    id: String(item.id || `note-${Date.now()}`),
    seconds: Number.isFinite(seconds) ? seconds : 0,
    time: String(item.time || formatNoteTime(seconds)),
    text,
    createdAt: Number(item.createdAt || Date.now()),
  }
}
