const STORAGE_KEY = 'push_prompt_dismissed'
/** Após "Agora não", não bloquear o app por este período. */
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function isPushPromptDismissed() {
  if (!import.meta.client) return false
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const ts = Number(raw)
    if (!Number.isFinite(ts)) {
      localStorage.removeItem(STORAGE_KEY)
      return false
    }
    if (Date.now() - ts > DISMISS_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function dismissPushPrompt() {
  if (!import.meta.client) return
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    // ignore quota / private mode
  }
}

export function clearPushPromptDismiss() {
  if (!import.meta.client) return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
