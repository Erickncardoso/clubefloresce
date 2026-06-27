import { computed, unref } from 'vue'
import { formatConversationDateLabel, normalizeTimestampToMs, isPinSystemMessageText } from '~/composables/whatsapp/useWhatsappUtils.js'
import { normalizeMessageForDisplay } from '~/composables/whatsapp/useWhatsappMessages.js'

const strTrim = (value) => String(value || '').trim()

export const filterPinSystemTextMessages = (messages = []) =>
  (Array.isArray(messages) ? messages : []).filter((msg) => !isPinSystemMessageText(msg?.text))

const extractRawMessageText = (raw = {}, normalized = {}) => {
  const content = raw?.content
  const contentText =
    content && typeof content === 'object'
      ? strTrim(content.conversation || content.text || content.body || '')
      : strTrim(typeof content === 'string' ? content : '')
  return strTrim(
    normalized.text ||
    raw?.text ||
    raw?.body ||
    raw?.caption ||
    contentText
  )
}

export const formatPinTimelineLabel = (msg, resolveActorName) => {
  const text = extractRawMessageText(msg, msg)
  if (isPinSystemMessageText(text)) return text

  const pinned = msg?.pinEvent?.pinned !== false
  if (msg?.fromMe) {
    return pinned ? 'Você fixou uma mensagem' : 'Você desfixou uma mensagem'
  }
  const name = strTrim(resolveActorName?.(msg) || msg?.senderDisplayName || '') || 'Alguém'
  return pinned ? `${name} fixou uma mensagem` : `${name} desfixou uma mensagem`
}

export const createOptimisticPinTimelineEvent = (pinned, timestamp = Date.now()) => ({
  id: `opt-pin-${timestamp}-${pinned ? 'pin' : 'unpin'}`,
  timestamp,
  label: pinned ? 'Você fixou uma mensagem' : 'Você desfixou uma mensagem',
})

export const mergePinTimelineEvents = (...groups) => {
  const merged = []
  const seen = new Set()

  for (const group of groups) {
    for (const evt of Array.isArray(group) ? group : []) {
      if (!evt?.label) continue
      const ts = Number(evt.timestamp || 0)
      const dedupeKey = strTrim(evt.id) || `${evt.label}-${Math.floor(ts / 15000)}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      merged.push({
        id: strTrim(evt.id) || dedupeKey,
        timestamp: ts || Date.now(),
        label: strTrim(evt.label),
      })
    }
  }

  return merged.sort((a, b) => a.timestamp - b.timestamp)
}

export const collectPinTimelineEvents = (rawMessages = [], resolveActorName = null) => {
  const events = []
  const seen = new Set()

  for (const raw of Array.isArray(rawMessages) ? rawMessages : []) {
    const normalized = normalizeMessageForDisplay(raw)
    if (!normalized) continue
    const text = extractRawMessageText(raw, normalized)
    const isTextPin = isPinSystemMessageText(text)
    const isStructuredPin = Boolean(normalized.isPinEvent)

    if (!isTextPin && !isStructuredPin) continue

    const eventId = strTrim(normalized.id || normalized.messageid || raw?.id || raw?.messageid || '')
    const dedupeKey = eventId || `${normalized.timestamp}-${text || normalized.pinEvent?.targetMessageId}-${normalized.pinEvent?.pinned}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    events.push({
      id: eventId || dedupeKey,
      timestamp: normalized.timestamp || Date.now(),
      label: isTextPin ? text : formatPinTimelineLabel(normalized, resolveActorName),
    })
  }

  return events.sort((a, b) => a.timestamp - b.timestamp)
}

export const buildChatTimelineRows = (messageItems = [], {
  pinEvents = [],
  getItemTimestamp = (item) => item?.timestamp,
  getItemKey = (item, index) => `msg-${item?.id || index}`,
} = {}) => {
  const merged = []

  messageItems.forEach((item, index) => {
    const ts = Number(getItemTimestamp(item) || 0)
    merged.push({
      kind: 'message',
      ts,
      key: getItemKey(item, index),
      data: item,
    })
  })

  for (const evt of pinEvents) {
    merged.push({
      kind: 'system',
      ts: Number(evt.timestamp || 0),
      key: `system-${evt.id}`,
      label: evt.label,
    })
  }

  merged.sort((a, b) => {
    if (a.ts !== b.ts) return a.ts - b.ts
    if (a.kind === b.kind) return 0
    return a.kind === 'system' ? -1 : 1
  })

  const rows = []
  let lastDayKey = ''
  let messageIndex = 0

  for (const item of merged) {
    const dayKey = getDayKey(item.ts)
    if (dayKey && dayKey !== lastDayKey) {
      rows.push({
        kind: 'date',
        key: `date-${dayKey}`,
        label: formatConversationDateLabel(item.ts),
      })
      lastDayKey = dayKey
    }

    if (item.kind === 'system') {
      rows.push({
        kind: 'system',
        key: item.key,
        label: item.label,
      })
      continue
    }

    rows.push({
      kind: 'message',
      key: item.key,
      msg: item.data,
      msgIndex: messageIndex++,
    })
  }

  return rows
}

const getDayKey = (timestamp) => {
  const ms = normalizeTimestampToMs(timestamp)
  if (!ms) return ''
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

export const expandMessagesWithTimeline = (messages = [], pinEvents = []) => {
  const rows = buildChatTimelineRows(messages, {
    pinEvents,
    getItemTimestamp: (item) => item?.timestamp,
    getItemKey: (item, index) => `single-${item?.id || index}`,
  })

  return rows.map((row) => {
    if (row.kind === 'date') {
      return {
        id: row.key,
        __timelineKind: 'date',
        __timelineLabel: row.label,
        timestamp: 0,
      }
    }
    if (row.kind === 'system') {
      return {
        id: row.key,
        __timelineKind: 'system',
        __timelineLabel: row.label,
        timestamp: 0,
      }
    }
    return {
      ...row.msg,
      __timelineMsgIndex: row.msgIndex,
    }
  })
}

export const expandGroupEntriesWithTimeline = (groupedEntries = [], pinEvents = []) => {
  const rows = buildChatTimelineRows(groupedEntries, {
    pinEvents,
    getItemTimestamp: (entry) => entry?.primary?.timestamp,
    getItemKey: (entry) => entry?.key || `group-${entry?.primary?.id}`,
  })

  return rows.map((row) => {
    if (row.kind === 'date') {
      return {
        kind: '__timeline',
        timelineKind: 'date',
        key: row.key,
        label: row.label,
      }
    }
    if (row.kind === 'system') {
      return {
        kind: '__timeline',
        timelineKind: 'system',
        key: row.key,
        label: row.label,
      }
    }
    return row.msg
  })
}

export function useWhatsappChatTimeline(messagesSource, pinEventsSource) {
  const timelineRows = computed(() => {
    const items = Array.isArray(unref(messagesSource)) ? unref(messagesSource) : []
    const pinEvents = Array.isArray(unref(pinEventsSource)) ? unref(pinEventsSource) : []
    return buildChatTimelineRows(items, {
      pinEvents,
      getItemTimestamp: (item) => item?.timestamp,
      getItemKey: (item, index) => `single-${item?.id || index}`,
    })
  })

  return { timelineRows }
}

export function useWhatsappGroupChatTimeline(groupedEntriesSource, pinEventsSource) {
  const timelineRows = computed(() => {
    const entries = Array.isArray(unref(groupedEntriesSource)) ? unref(groupedEntriesSource) : []
    const pinEvents = Array.isArray(unref(pinEventsSource)) ? unref(pinEventsSource) : []
    return buildChatTimelineRows(entries, {
      pinEvents,
      getItemTimestamp: (entry) => entry?.primary?.timestamp,
      getItemKey: (entry) => entry?.key || `group-${entry?.primary?.id}`,
    })
  })

  return { timelineRows }
}
