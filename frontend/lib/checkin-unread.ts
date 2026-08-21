/** Controle de “respostas novas” de check-in (última visita da nutri à aba Respostas). */

const STORAGE_KEY = 'cf.checkin.responses.lastSeenAt'
export const CHECKIN_UNREAD_EVENT = 'cf:checkin-unread'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getCheckinResponsesLastSeenAt(): string | null {
  if (!canUseStorage()) return null
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)?.trim()
    return value || null
  } catch {
    return null
  }
}

/** Marca o momento em que a nutri viu as respostas (zera badge). */
export function markCheckinResponsesSeen(at = new Date().toISOString()) {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, at)
    window.dispatchEvent(new CustomEvent(CHECKIN_UNREAD_EVENT))
  } catch {
    /* ignore quota / private mode */
  }
}

export function countNewCheckinResponses(
  items: Array<{ updatedAt?: string | null; createdAt?: string | null }>,
  lastSeenAt?: string | null,
) {
  const since = lastSeenAt ?? getCheckinResponsesLastSeenAt()
  if (!since) return items.length
  const sinceMs = new Date(since).getTime()
  if (Number.isNaN(sinceMs)) return items.length
  return items.filter((item) => {
    const raw = item.updatedAt || item.createdAt
    if (!raw) return false
    const ms = new Date(raw).getTime()
    return Number.isFinite(ms) && ms > sinceMs
  }).length
}

export function sortCheckinResponsesNewestFirst<
  T extends { updatedAt?: string | null; createdAt?: string | null },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aMs = new Date(a.updatedAt || a.createdAt || 0).getTime()
    const bMs = new Date(b.updatedAt || b.createdAt || 0).getTime()
    return bMs - aMs
  })
}

export function formatCheckinUnreadBadge(count: number) {
  if (count <= 0) return ''
  return count > 99 ? '99+' : String(count)
}
