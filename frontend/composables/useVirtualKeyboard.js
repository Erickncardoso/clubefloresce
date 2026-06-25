export function useVirtualKeyboard() {
  const keyboardOpen = ref(false)

  if (!import.meta.client) return { keyboardOpen }

  const THRESHOLD = 120
  let cleanup = null

  onMounted(() => {
    const vv = window.visualViewport
    if (!vv) return

    let baselineHeight = vv.height

    function sync() {
      const visibleHeight = vv.height
      const offsetTop = vv.offsetTop || 0
      const layoutHeight = window.innerHeight
      const overlap = layoutHeight - visibleHeight - offsetTop
      const shrink = baselineHeight - visibleHeight
      const inputFocused = isTextInputFocused()

      const isOpen = inputFocused && (overlap > THRESHOLD || shrink > THRESHOLD)

      if (isOpen !== keyboardOpen.value) {
        keyboardOpen.value = isOpen
        document.documentElement.classList.toggle('vk-open', isOpen)
      }

      if (!isOpen) {
        baselineHeight = visibleHeight
      }
    }

    function isTextInputFocused() {
      const active = document.activeElement
      if (!(active instanceof HTMLElement)) return false
      if (active.isContentEditable) return true

      const tag = active.tagName
      if (tag === 'TEXTAREA') return true
      if (tag !== 'INPUT') return false

      const type = (active.getAttribute('type') || 'text').toLowerCase()
      return !['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'hidden', 'range', 'color'].includes(type)
    }

    vv.addEventListener('resize', sync, { passive: true })
    window.addEventListener('orientationchange', () => {
      baselineHeight = vv.height
      setTimeout(sync, 150)
    }, { passive: true })

    cleanup = () => {
      vv.removeEventListener('resize', sync)
      document.documentElement.classList.remove('vk-open')
    }
  })

  onBeforeUnmount(() => {
    cleanup?.()
  })

  return { keyboardOpen }
}
