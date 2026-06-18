export function useVirtualKeyboard() {
  const keyboardOpen = ref(false)

  if (!import.meta.client) return { keyboardOpen }

  const THRESHOLD = 150
  let cleanup = null

  onMounted(() => {
    const vv = window.visualViewport
    if (!vv) return

    const initialHeight = window.innerHeight

    function onResize() {
      const diff = initialHeight - vv.height
      const isOpen = diff > THRESHOLD
      if (isOpen !== keyboardOpen.value) {
        keyboardOpen.value = isOpen
        document.documentElement.classList.toggle('vk-open', isOpen)
      }
    }

    vv.addEventListener('resize', onResize, { passive: true })
    cleanup = () => {
      vv.removeEventListener('resize', onResize)
      document.documentElement.classList.remove('vk-open')
    }
  })

  onBeforeUnmount(() => {
    cleanup?.()
  })

  return { keyboardOpen }
}
