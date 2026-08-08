export type LessonNote = {
  id: string
  text: string
  seconds: number
  createdAt: string
}

const KEY_PREFIX = 'cf:lesson-notes:'

export function loadLessonNotes(lessonId: string): LessonNote[] {
  if (typeof window === 'undefined' || !lessonId) return []
  try {
    const raw = window.localStorage.getItem(`${KEY_PREFIX}${lessonId}`)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveLessonNotes(lessonId: string, notes: LessonNote[]) {
  if (typeof window === 'undefined' || !lessonId) return
  window.localStorage.setItem(`${KEY_PREFIX}${lessonId}`, JSON.stringify(notes))
}
