export function notifyTranscriptionReady({ title, body, tag }) {
  if (!import.meta.client || typeof Notification === 'undefined') return
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, { body, tag, silent: false })
    } catch {
      /* ignore */
    }
    return
  }
  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        try {
          new Notification(title, { body, tag, silent: false })
        } catch {
          /* ignore */
        }
      }
    }).catch(() => {})
  }
}
