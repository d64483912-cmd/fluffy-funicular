/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string>
}

const HISTORY_ENDPOINT = '/offline/chat-history'
const HISTORY_CACHE = 'nelson-chat-history'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ request }) => request.destination === 'document',
  new NetworkFirst({
    cacheName: 'nelson-pages',
    networkTimeoutSeconds: 3,
    plugins: [new ExpirationPlugin({ maxEntries: 20, purgeOnQuotaError: true })],
  })
)

registerRoute(
  ({ request }) => ['style', 'script', 'worker', 'font'].includes(request.destination),
  new StaleWhileRevalidate({
    cacheName: 'nelson-static',
    plugins: [new ExpirationPlugin({ maxEntries: 60, purgeOnQuotaError: true })],
  })
)

registerRoute(
  ({ url }) => url.pathname.startsWith('/api'),
  new NetworkFirst({
    cacheName: 'nelson-api',
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 20, purgeOnQuotaError: true })],
  })
)

registerRoute(
  ({ url }) => url.pathname.startsWith('/icons/') || url.pathname.endsWith('.png'),
  new CacheFirst({
    cacheName: 'nelson-assets',
    plugins: [new ExpirationPlugin({ maxEntries: 20, purgeOnQuotaError: true })],
  })
)

registerRoute(
  ({ url }) => url.pathname === HISTORY_ENDPOINT,
  async () => {
    const cache = await caches.open(HISTORY_CACHE)
    const match = await cache.match(HISTORY_ENDPOINT)
    return (
      match ||
      new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' },
      })
    )
  }
)

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_CHAT_HISTORY') {
    const payload = event.data.payload ?? []
    event.waitUntil(
      caches.open(HISTORY_CACHE).then((cache) =>
        cache.put(
          HISTORY_ENDPOINT,
          new Response(JSON.stringify(payload), {
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )
    )
  }
})
