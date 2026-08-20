export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  metadata?: Record<string, unknown> | null;
};

function getSwapMessageMeta(msg?: ChatMessage | null) {
  return msg?.metadata && typeof msg.metadata === 'object' ? msg.metadata : null;
}

export function hasActiveSwapSelection(msg?: ChatMessage | null) {
  const meta = getSwapMessageMeta(msg);
  return Boolean(
    meta?.pendingSwapSelection
    && Array.isArray(meta.swapOptions)
    && (meta.swapOptions as unknown[]).length > 0,
  );
}

export function hasActiveSwapMode(msg?: ChatMessage | null) {
  const meta = getSwapMessageMeta(msg);
  return Boolean(meta?.pendingSwapMode && meta.swapMealId && meta.swapFoodKey);
}

export function findActiveSwapMessage(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const msg = messages[index];
    if (msg?.role !== 'assistant') continue;
    if (isCompletedSwapMessage(msg)) return null;
    if (hasActiveSwapSelection(msg) || hasActiveSwapMode(msg)) return msg;
  }
  return null;
}

export function getSwapOptions(msg?: ChatMessage | null) {
  const meta = getSwapMessageMeta(msg);
  if (!Array.isArray(meta?.swapOptions)) return [];
  return (meta.swapOptions as Array<{ id?: string; label?: string }>)
    .map((option) => ({
      id: String(option?.id || '').trim(),
      label: String(option?.label || '').trim(),
    }))
    .filter((option) => option.id && option.label);
}

export function isCompletedSwapMessage(msg?: ChatMessage | null) {
  const meta = getSwapMessageMeta(msg);
  if (!meta || meta.topic !== 'swap') return false;
  if (hasActiveSwapSelection(msg) || hasActiveSwapMode(msg)) return false;
  if (meta.swapCompleted) return true;
  const content = String(msg?.content || '');
  return content.includes('**Substituição no plano**') || content.includes('**Entra**');
}

export function findLatestCompletedSwapMessage(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const msg = messages[index];
    if (msg?.role === 'assistant' && isCompletedSwapMessage(msg)) return msg;
  }
  return null;
}
