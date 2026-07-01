/**
 * Sincronização inicial pós-conexão (history sync da UAZAPI).
 * Durante este período evitamos polling agressivo que pausa o sync no celular.
 */
import { ref, computed } from 'vue'
import { CHATS_POLL_INTERVAL_MS, getWhatsappApiBase, whatsappFetchInit } from './useWhatsappApi.js'

const LS_CONNECTED_AT = 'wa_connected_at'
const LS_SYNC_DONE_JID = 'wa_initial_sync_done_jid'

const INITIAL_SYNC_MAX_MS = 6 * 60 * 1000
const INITIAL_SYNC_STABLE_MS = 45 * 1000
const INITIAL_SYNC_MIN_MS = 8 * 1000
/** Com conversas já na API, encerra o aviso após poucos segundos. */
const INITIAL_SYNC_CHATS_READY_MS = 4 * 1000
/** Probe só do cache local — não bater na UAZAPI (interrompe sync no celular). */
export const SYNC_PROBE_INTERVAL_MS = 15_000
export const GENTLE_CHATS_POLL_INTERVAL_MS = 20_000
const GENTLE_CHAT_PAGE_LIMIT = 120

export const initialSyncActive = ref(false)
export const initialSyncChatCount = ref(0)

let lastCount = 0
let lastChangeAt = 0
let stableCheckTimer = null
let maxTimeoutTimer = null
let tickTimer = null
let probeInFlight = false

const readSessionJid = () => {
  if (typeof window === 'undefined') return ''
  return String(localStorage.getItem('wa_session_jid') || '').trim()
}

const readSyncDoneJid = () => {
  if (typeof window === 'undefined') return ''
  return String(localStorage.getItem(LS_SYNC_DONE_JID) || '').trim()
}

const markSyncDoneForSession = () => {
  const jid = readSessionJid()
  if (typeof window === 'undefined' || !jid) return
  localStorage.setItem(LS_SYNC_DONE_JID, jid)
}

const isInitialSyncDoneForCurrentSession = () => {
  const jid = readSessionJid()
  if (!jid) return false
  return readSyncDoneJid() === jid
}

const clearSyncDoneMarker = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(LS_SYNC_DONE_JID)
}

const readConnectedAt = () => {
  if (typeof window === 'undefined') return 0
  return Number(localStorage.getItem(LS_CONNECTED_AT) || 0)
}

const writeConnectedAt = (ts = Date.now()) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(LS_CONNECTED_AT, String(ts))
}

const clearTimers = () => {
  if (stableCheckTimer) {
    clearInterval(stableCheckTimer)
    stableCheckTimer = null
  }
  if (maxTimeoutTimer) {
    clearTimeout(maxTimeoutTimer)
    maxTimeoutTimer = null
  }
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}

export const initialSyncElapsedLabel = computed(() => {
  const startedAt = readConnectedAt()
  if (!startedAt || !initialSyncActive.value) return ''
  const secs = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const rem = secs % 60
  return rem ? `${mins}m ${rem}s` : `${mins}m`
})

export function isInitialSyncGentleMode() {
  return initialSyncActive.value
}

export function getGentleChatsPollIntervalMs() {
  return isInitialSyncGentleMode() ? GENTLE_CHATS_POLL_INTERVAL_MS : CHATS_POLL_INTERVAL_MS
}

export function getGentleChatPageLimit() {
  return isInitialSyncGentleMode() ? GENTLE_CHAT_PAGE_LIMIT : 600
}

export function markWhatsappConnectedNow(options = {}) {
  const { force = false, sessionJid = '' } = options
  if (typeof window === 'undefined') return Date.now()

  const prevJid = String(localStorage.getItem('wa_session_jid') || '').trim()
  const nextJid = String(sessionJid || '').trim()
  const jidChanged = Boolean(nextJid && prevJid && nextJid !== prevJid)
  if (jidChanged) clearSyncDoneMarker()
  const storedAt = readConnectedAt()
  const now = Date.now()

  if (force || jidChanged || !storedAt || now - storedAt > INITIAL_SYNC_MAX_MS * 2) {
    writeConnectedAt(now)
  }
  return readConnectedAt() || now
}

export function completeInitialSync(_reason = 'manual') {
  const wasActive = initialSyncActive.value
  markSyncDoneForSession()
  if (!wasActive) return
  initialSyncActive.value = false
  clearTimers()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wa-initial-sync-complete', { detail: { reason: _reason } }))
  }
}

const maybeCompleteInitialSync = () => {
  if (!initialSyncActive.value) return

  const connectedAt = readConnectedAt()
  if (!connectedAt) {
    completeInitialSync('missing-ts')
    return
  }

  const elapsed = Date.now() - connectedAt
  if (elapsed >= INITIAL_SYNC_MAX_MS) {
    completeInitialSync('timeout')
    return
  }

  if (lastCount > 0 && elapsed >= INITIAL_SYNC_CHATS_READY_MS) {
    completeInitialSync('stable')
    return
  }

  if (elapsed < INITIAL_SYNC_MIN_MS) return

  const stableFor = Date.now() - (lastChangeAt || connectedAt)
  if (lastCount > 0 && stableFor >= INITIAL_SYNC_STABLE_MS) {
    completeInitialSync('stable')
  }
}

export function markInitialSyncActivity(_reason = '') {
  if (!initialSyncActive.value) return
  lastChangeAt = Date.now()
}

export function noteInitialSyncChatCount(count) {
  const safe = Math.max(0, Number(count) || 0)
  initialSyncChatCount.value = safe
  if (safe !== lastCount) {
    lastCount = safe
    lastChangeAt = Date.now()
  }
  maybeCompleteInitialSync()
}

const scheduleCompletionChecks = () => {
  clearTimers()

  const connectedAt = readConnectedAt()
  const remaining = Math.max(0, INITIAL_SYNC_MAX_MS - (Date.now() - connectedAt))
  maxTimeoutTimer = setTimeout(() => completeInitialSync('timeout'), remaining + 500)

  stableCheckTimer = setInterval(maybeCompleteInitialSync, 5000)
  tickTimer = setInterval(() => {
    // força recomputar elapsed label
    if (initialSyncActive.value) initialSyncActive.value = true
  }, 15_000)
}

export function beginInitialSyncWatch(options = {}) {
  const { force = false, sessionJid = '' } = options
  const nextJid = String(sessionJid || readSessionJid() || '').trim()
  if (!force && isInitialSyncDoneForCurrentSession()) return

  if (force && nextJid && readSyncDoneJid() !== nextJid) {
    clearSyncDoneMarker()
  }

  markWhatsappConnectedNow(options)
  const alreadyActive = initialSyncActive.value
  initialSyncActive.value = true
  if (!alreadyActive || force) {
    lastCount = 0
    initialSyncChatCount.value = 0
    lastChangeAt = readConnectedAt() || Date.now()
    scheduleCompletionChecks()
  }
}

/** Consulta só o cache local — evita bater na UAZAPI durante o history sync do celular. */
export async function probeInitialSyncProgress() {
  if (!initialSyncActive.value || probeInFlight) return
  if (typeof window === 'undefined') return

  const apiBase = getWhatsappApiBase()
  if (!apiBase) return

  probeInFlight = true
  try {
    const cacheRes = await fetch(`${apiBase}/chats?cache=1`, whatsappFetchInit())
    if (!cacheRes.ok) return
    const cacheData = await cacheRes.json().catch(() => ({}))
    const cacheCount = Array.isArray(cacheData?.chats) ? cacheData.chats.length : 0
    if (cacheCount > 0) noteInitialSyncChatCount(cacheCount)
  } catch {
    /* silencioso */
  } finally {
    probeInFlight = false
  }
}

export function resumeInitialSyncIfNeeded() {
  if (isInitialSyncDoneForCurrentSession()) return false

  const connectedAt = readConnectedAt()
  if (!connectedAt) return false
  const elapsed = Date.now() - connectedAt
  if (elapsed >= INITIAL_SYNC_MAX_MS) {
    initialSyncActive.value = false
    markSyncDoneForSession()
    return false
  }
  initialSyncActive.value = true
  lastChangeAt = connectedAt
  scheduleCompletionChecks()
  return true
}

export function isWithinInitialSyncWindow() {
  const connectedAt = readConnectedAt()
  if (!connectedAt) return false
  return Date.now() - connectedAt < INITIAL_SYNC_MAX_MS
}

export function resetInitialSyncState() {
  completeInitialSync('reset')
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LS_CONNECTED_AT)
    clearSyncDoneMarker()
  }
  lastCount = 0
  lastChangeAt = 0
  initialSyncChatCount.value = 0
}

export function useWhatsappInitialSync() {
  return {
    initialSyncActive,
    initialSyncChatCount,
    initialSyncElapsedLabel,
    isInitialSyncGentleMode,
    getGentleChatsPollIntervalMs,
    getGentleChatPageLimit,
    beginInitialSyncWatch,
    resumeInitialSyncIfNeeded,
    markInitialSyncActivity,
    noteInitialSyncChatCount,
    completeInitialSync,
    resetInitialSyncState,
    markWhatsappConnectedNow,
    probeInitialSyncProgress,
    isWithinInitialSyncWindow,
  }
}
