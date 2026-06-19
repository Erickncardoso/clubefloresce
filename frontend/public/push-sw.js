/* eslint-disable no-restricted-globals */
/** Handler de push — carregado pelo Workbox via importScripts. */

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Clube Florescer'
  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa/icon-192.png',
    badge: '/pwa/icon-192.png',
    tag: data.tag || 'clube-florescer',
    renotify: true,
    data: {
      url: data.url || '/perfil/notificacoes',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification?.data?.url || '/perfil/notificacoes'
  const absoluteUrl = new URL(targetUrl, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'PUSH_NAVIGATE', url: targetUrl })
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteUrl)
      }
      return undefined
    }),
  )
})
