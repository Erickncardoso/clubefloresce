export const RESTAURANT_INTENT_OPTIONS = [
  { id: 'plan_fit', label: 'Encaixar na dieta' },
  { id: 'free_meal', label: 'Refeição livre consciente' },
]

export function getRestaurantMessageMeta(msg) {
  return msg?.metadata && typeof msg.metadata === 'object' ? msg.metadata : null
}

export function hasActiveRestaurantIntent(msg) {
  const meta = getRestaurantMessageMeta(msg)
  return Boolean(meta?.pendingRestaurantIntent && meta?.relatedUserMessageId)
}

export function findActiveRestaurantIntentMessage(messages) {
  if (!Array.isArray(messages)) return null
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const msg = messages[index]
    if (msg?.role !== 'assistant') continue
    if (hasActiveRestaurantIntent(msg)) return msg
  }
  return null
}

export function getRestaurantIntentRelatedUserMessageId(msg) {
  const meta = getRestaurantMessageMeta(msg)
  const id = meta?.relatedUserMessageId
  return typeof id === 'string' && id.trim() ? id.trim() : null
}
