/* eslint-disable no-restricted-globals */
/** Handler de push — carregado pelo Workbox via importScripts. */

function parsePushPayload(event) {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  return data
}

function hasVisibleAppClient(clients) {
  return clients.some(
    (client) => client.visibilityState === 'visible' && client.url.startsWith(self.location.origin),
  )
}

function notifyVisibleClients(clients, data) {
  clients.forEach((client) => {
    if (client.visibilityState !== 'visible') return
    if (!client.url.startsWith(self.location.origin)) return
    client.postMessage({ type: 'PUSH_RECEIVED', payload: data })
  })
}

self.addEventListener('push', (event) => {
  const data = parsePushPayload(event)

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (hasVisibleAppClient(clients)) {
        notifyVisibleClients(clients, data)
        return undefined
      }

      const title = data.title || 'Clube Florescer'
      const options = {
        body: data.body || '',
        icon: data.icon || '/pwa/icon-192.png',
        badge: '/pwa/icon-192.png',
        tag: data.tag || 'clube-florescer',
        renotify: false,
        data: {
          url: data.url || '/perfil/notificacoes',
        },
      }

      return self.registration.showNotification(title, options)
    }),
  )
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
