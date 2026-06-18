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

      const isOpen = overlap > THRESHOLD || shrink > THRESHOLD

      if (isOpen !== keyboardOpen.value) {
        keyboardOpen.value = isOpen
        document.documentElement.classList.toggle('vk-open', isOpen)
      }

      if (!isOpen) {
        baselineHeight = visibleHeight
      }
    }

    vv.addEventListener('resize', sync, { passive: true })
    vv.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('orientationchange', () => {
      baselineHeight = vv.height
      setTimeout(sync, 150)
    }, { passive: true })

    cleanup = () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      document.documentElement.classList.remove('vk-open')
    }
  })

  onBeforeUnmount(() => {
    cleanup?.()
  })

  return { keyboardOpen }
}
