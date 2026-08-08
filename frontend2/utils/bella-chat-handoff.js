import { getMessageDisplayText, getUserMessageImageUrl } from './bella-message-format'

const STORAGE_KEY = 'bella_chat_handoff_v1'
const MAX_AGE_MS = 30 * 60 * 1000

/** @typedef {{ targetTopic: string, sourceTopic: string, question: string, imageUrl?: string | null, createdAt: number }} BellaChatHandoff */

/**
 * @param {Array<{ role?: string, content?: string, metadata?: object }>} messages
 * @returns {string | null}
 */
export function findRecentUserImageUrl(messages) {
  if (!Array.isArray(messages)) return null
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const url = getUserMessageImageUrl(messages[i])
    if (url?.startsWith('http')) return url
  }
  return null
}

/**
 * @param {Array<{ role?: string, content?: string, metadata?: object }>} messages
 * @returns {string}
 */
export function findLastUserQuestion(messages) {
  if (!Array.isArray(messages)) return ''
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i]
    if (msg?.role !== 'user') continue
    const text = getMessageDisplayText(msg)?.trim()
    if (text) return text
  }
  return ''
}

/**
 * @param {Partial<BellaChatHandoff> & { targetTopic: string, sourceTopic: string }} payload
 */
export function saveBellaChatHandoff(payload) {
  if (!import.meta.client || !payload?.targetTopic) return
  const question = String(payload.question || '').trim()
  if (!question) return

  /** @type {BellaChatHandoff} */
  const handoff = {
    targetTopic: payload.targetTopic,
    sourceTopic: payload.sourceTopic,
    question,
    imageUrl: payload.imageUrl || null,
    createdAt: Date.now(),
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(handoff))
  } catch {
    /* quota / private mode */
  }
}

/**
 * @param {string} targetTopic
 * @returns {BellaChatHandoff | null}
 */
export function consumeBellaChatHandoff(targetTopic) {
  if (!import.meta.client || !targetTopic) return null

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    sessionStorage.removeItem(STORAGE_KEY)

    const parsed = JSON.parse(raw)
    if (!parsed || parsed.targetTopic !== targetTopic) return null
    if (Date.now() - Number(parsed.createdAt || 0) > MAX_AGE_MS) return null

    const question = String(parsed.question || '').trim()
    if (!question) return null

    return {
      targetTopic: parsed.targetTopic,
      sourceTopic: String(parsed.sourceTopic || ''),
      question,
      imageUrl: parsed.imageUrl || null,
      createdAt: Number(parsed.createdAt || Date.now()),
    }
  } catch {
    return null
  }
}

/**
 * @param {Array<{ role?: string, content?: string, metadata?: object }>} messages
 * @param {{ targetTopic: string, sourceTopic: string }} context
 */
export function buildChatHandoffFromMessages(messages, context) {
  return {
    targetTopic: context.targetTopic,
    sourceTopic: context.sourceTopic,
    question: findLastUserQuestion(messages),
    imageUrl: findRecentUserImageUrl(messages),
  }
}
