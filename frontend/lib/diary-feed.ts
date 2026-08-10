import { apiFetch } from '@/lib/api'

export type DiaryAuthor = {
  id: string
  name: string
  avatar?: string | null
  role?: string
}

export type DiaryComment = {
  id: string
  content: string
  createdAt: string
  author?: DiaryAuthor
}

export type DiaryFeedEntry = {
  id: string
  mealLabel?: string | null
  mealType?: string
  imageUrl: string
  createdAt: string
  caloriesKcal?: number
  patient?: { id: string; name: string; avatar?: string | null }
  likesCount: number
  likedByMe: boolean
  commentsCount: number
  commentsPreview?: DiaryComment[]
  newComment?: string
}

export type DiaryFeedPage = {
  entries: DiaryFeedEntry[]
  hasMore: boolean
  nextSkip: number | null
}

function normalizeEntry(e: DiaryFeedEntry): DiaryFeedEntry {
  return {
    ...e,
    likesCount: e.likesCount ?? 0,
    likedByMe: Boolean(e.likedByMe),
    commentsCount: e.commentsCount ?? 0,
    commentsPreview: e.commentsPreview || [],
    newComment: '',
  }
}

export async function fetchDiaryFeed(limit = 10, skip = 0): Promise<DiaryFeedPage> {
  const data = await apiFetch<{
    entries?: DiaryFeedEntry[]
    hasMore?: boolean
    nextSkip?: number | null
  }>(`/food-diary/admin/feed?limit=${limit}&skip=${skip}`)
  const entries = (data.entries || []).map(normalizeEntry)
  return {
    entries,
    hasMore: Boolean(data.hasMore),
    nextSkip: data.nextSkip ?? null,
  }
}

export async function toggleDiaryLike(entryId: string) {
  return apiFetch<{ likedByMe: boolean; likesCount: number }>(
    `/food-diary/admin/entries/${encodeURIComponent(entryId)}/like`,
    { method: 'POST' },
  )
}

export async function fetchDiaryComments(entryId: string) {
  const data = await apiFetch<{ comments?: DiaryComment[] }>(
    `/food-diary/admin/entries/${encodeURIComponent(entryId)}/comments`,
  )
  return data.comments || []
}

export async function addDiaryComment(entryId: string, content: string) {
  return apiFetch<DiaryComment>(
    `/food-diary/admin/entries/${encodeURIComponent(entryId)}/comments`,
    { method: 'POST', body: JSON.stringify({ content }) },
  )
}

export async function updateDiaryComment(commentId: string, content: string) {
  return apiFetch<DiaryComment>(
    `/food-diary/admin/comments/${encodeURIComponent(commentId)}`,
    { method: 'PATCH', body: JSON.stringify({ content }) },
  )
}

export async function deleteDiaryComment(commentId: string) {
  return apiFetch<{ ok: boolean; entryId: string }>(
    `/food-diary/admin/comments/${encodeURIComponent(commentId)}`,
    { method: 'DELETE' },
  )
}

/** Hoje 18:10 · Ontem 09:30 · terça 14:00 · 09/03 14:00 */
export function formatDiaryCommentWhen(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((startToday.getTime() - startDay.getTime()) / 86400000)

  if (diffDays === 0) return `Hoje ${time}`
  if (diffDays === 1) return `Ontem ${time}`
  if (diffDays >= 2 && diffDays < 7) {
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' })
    const label = weekday.charAt(0).toUpperCase() + weekday.slice(1)
    return `${label} ${time}`
  }

  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${day} ${time}`
}
