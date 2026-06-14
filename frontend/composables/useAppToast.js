export function useAppToast() {
  const toast = useState('app-toast', () => null)
  let hideTimer = null

  function showToast({
    type = 'success',
    title = '',
    message = '',
    detail = '',
    duration = 4500,
  } = {}) {
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }

    toast.value = {
      id: Date.now(),
      type,
      title,
      message,
      detail,
    }

    if (duration > 0) {
      hideTimer = setTimeout(() => {
        toast.value = null
        hideTimer = null
      }, duration)
    }
  }

  function hideToast() {
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
    toast.value = null
  }

  return {
    toast,
    showToast,
    hideToast,
  }
}
