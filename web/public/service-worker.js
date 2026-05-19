const CRABWATCH_NOTIFICATIONS = 'crabwatch-notifications'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CRABWATCH_NOTIFICATIONS).then(async (cache) => {
      const urlsToCache = ['/favicon.ico']

      await Promise.allSettled(
        urlsToCache.map(async (url) => {
          const response = await fetch(url, { cache: 'no-cache' })
          if (response.ok) {
            await cache.put(url, response)
          }
        })
      )
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
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

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = {
      title: 'CrabWatch',
      body: event.data.text(),
    }
  }

  const options = {
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

self.addEventListener('notificationclick', (event) => {
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
