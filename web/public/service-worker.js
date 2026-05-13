const CRABWATCH_NOTIFICATIONS = 'crabwatch-notifications'

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CRABWATCH_NOTIFICATIONS).then((cache) => {
      return cache.addAll([
        '/favicon.ico',
        '/dashboard',
      ])
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CRABWATCH_NOTIFICATIONS)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let data: { title: string; body: string; type?: string; species?: string; zone?: string }
  try {
    data = event.data.json()
  } catch {
    data = {
      title: 'CrabWatch',
      body: event.data.text(),
    }
  }

  const options: NotificationOptions = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: data.type === 'observation_approved' ? '/dashboard' : '/',
      type: data.type,
      species: data.species,
      zone: data.zone,
    },
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', (event: NotificationClickEvent) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => client.url.includes(url))
      if (existingClient) {
        return existingClient.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
