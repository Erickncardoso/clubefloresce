import { ref, nextTick } from 'vue'

export const emojiMartReady = ref(false)

let initPromise = null

export const ensureEmojiMartReady = () => {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (emojiMartReady.value) return Promise.resolve(true)
  if (!initPromise) {
    initPromise = (async () => {
      const [{ init }, emojiDataModule] = await Promise.all([
        import('emoji-mart'),
        import('@emoji-mart/data'),
      ])
      const emojiData = emojiDataModule.default || emojiDataModule
      await init({ data: emojiData })
      emojiMartReady.value = true
      return true
    })().catch((error) => {
      console.error('Erro ao inicializar emoji-mart', error)
      initPromise = null
      return false
    })
  }
  return initPromise
}

const pickFromSkins = (value) => String(value?.skins?.[0]?.native || '').trim()

const unifiedToNative = (value) =>
  String(value || '')
    .split('-')
    .map((hex) => Number.parseInt(hex, 16))
    .filter((code) => Number.isFinite(code))
    .map((code) => String.fromCodePoint(code))
    .join('')

export const extractEmojiNativeFromEvent = (event) => {
  const detail = event?.detail || event || {}
  return String(
    detail?.native ||
    detail?.emoji?.native ||
    pickFromSkins(detail?.emoji) ||
    (typeof detail?.emoji === 'string' ? detail.emoji : '') ||
    pickFromSkins(detail) ||
    unifiedToNative(detail?.unified || detail?.emoji?.unified || '') ||
    ''
  ).trim()
}

export const extractEmojiNativeFromPickerClick = (event) => {
  const path = Array.isArray(event?.composedPath?.()) ? event.composedPath() : []
  for (const node of path) {
    if (!node || typeof node !== 'object') continue
    const native = node?.getAttribute?.('native')
    if (native) return String(native).trim()
    const emoji = node?.getAttribute?.('emoji')
    if (emoji) return String(emoji).trim()
  }
  return ''
}

export const insertEmojiIntoTextField = async ({
  inputEl,
  currentValue,
  emojiNative,
  onUpdate,
}) => {
  const value = String(currentValue || '')
  const start = inputEl?.selectionStart ?? value.length
  const end = inputEl?.selectionEnd ?? start
  const nextValue = `${value.slice(0, start)}${emojiNative}${value.slice(end)}`
  onUpdate(nextValue)
  await nextTick()
  const cursor = start + emojiNative.length
  inputEl?.focus?.()
  if (typeof inputEl?.setSelectionRange === 'function') {
    inputEl.setSelectionRange(cursor, cursor)
  }
}

export function useEmojiMart() {
  return {
    emojiMartReady,
    ensureEmojiMartReady,
    extractEmojiNativeFromEvent,
    extractEmojiNativeFromPickerClick,
    insertEmojiIntoTextField,
  }
}
