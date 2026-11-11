/* J-CARS service worker: ljuska aplikacije (rad nakon instalacije) i push obavijesti. */

const SHELL_CACHE = 'jcars-shell-v1'
const ASSET_CACHE = 'jcars-assets-v1'
const CACHES = [SHELL_CACHE, ASSET_CACHE]
const SHELL_URLS = ['/', '/manifest.webmanifest', '/logo.svg', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      // Pojedinačno – jedna neuspjela datoteka ne smije spriječiti instalaciju.
      await Promise.all(SHELL_URLS.map((url) => cache.add(url).catch(() => undefined)))
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter((name) => name.startsWith('jcars-') && !CACHES.includes(name)).map((name) => caches.delete(name)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // Supabase, /api i sve tuđe adrese idu uvijek na mrežu – podaci moraju biti svježi.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // Stranice: prvo mreža (uvijek najnovija verzija), bez mreže spremljena ljuska.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          if (response.ok) {
            const cache = await caches.open(SHELL_CACHE)
            await cache.put('/', response.clone())
          }
          return response
        } catch {
          const cached = await caches.match('/')
          return (
            cached ??
            new Response('<!doctype html><meta charset="utf-8"><title>J-CARS</title><p style="font-family:sans-serif;padding:2rem">Nema internetske veze. Pokušajte ponovno kad veza bude dostupna.</p>', {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
              status: 503,
            })
          )
        }
      })(),
    )
    return
  }

  // Datoteke s hashom u imenu (/assets/…) i ikone se ne mijenjaju – prvo iz spremišta.
  if (url.pathname.startsWith('/assets/') || /\.(png|svg|webmanifest|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) {
          const cache = await caches.open(ASSET_CACHE)
          await cache.put(request, response.clone())
        }
        return response
      })(),
    )
  }
})

// ---------------------------------------------------------------------------
// Push obavijesti

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'J-CARS', {
      body: data.body || '',
      // PNG – Android ne prikazuje SVG ikone u obavijestima.
      icon: '/icons/icon-192.png',
      tag: data.tag || 'jcars',
      renotify: true,
      lang: 'hr',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      // Ako je aplikacija već otvorena, prebaci se na nju i otvori traženu stranicu.
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          await client.focus()
          if ('navigate' in client) await client.navigate(target)
          return
        }
      }
      await self.clients.openWindow(target)
    })(),
  )
})
