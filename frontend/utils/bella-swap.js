export function getSwapMessageMeta(msg) {
  return msg?.metadata && typeof msg.metadata === 'object' ? msg.metadata : null
}

export function hasActiveSwapSelection(msg) {
  const meta = getSwapMessageMeta(msg)
  return Boolean(
    meta?.pendingSwapSelection
    && Array.isArray(meta.swapOptions)
    && meta.swapOptions.length > 0,
  )
}

export function hasActiveSwapMode(msg) {
  const meta = getSwapMessageMeta(msg)
  return Boolean(meta?.pendingSwapMode && meta.swapMealId && meta.swapFoodKey)
}

export function findActiveSwapMessage(messages) {
  if (!Array.isArray(messages)) return null
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const msg = messages[index]
    if (msg?.role !== 'assistant') continue
    if (hasActiveSwapSelection(msg) || hasActiveSwapMode(msg)) return msg
  }
  return null
}

export function getSwapOptions(msg) {
  const meta = getSwapMessageMeta(msg)
  if (!Array.isArray(meta?.swapOptions)) return []
  return meta.swapOptions
    .map((option) => ({
      id: String(option?.id || '').trim(),
      label: String(option?.label || '').trim(),
    }))
    .filter((option) => option.id && option.label)
}
