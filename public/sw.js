/**
 * Service Worker for WorldHuman Studio App
 * Provides offline caching and network resilience
 */

const CACHE_NAME = 'whstudio-app-v1';
const STATIC_CACHE_NAME = 'whstudio-static-v1';
const API_CACHE_NAME = 'whstudio-api-v1';

// Cache duration in milliseconds
const CACHE_DURATION = {
  STATIC: 24 * 60 * 60 * 1000, // 24 hours
  API: 5 * 60 * 1000, // 5 minutes
  IMAGES: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/icon.svg',
  '/favicon.ico',
  '/manifest.json',
  '/_next/static/css/app/layout.css',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/main.js',
  '/_next/static/chunks/pages/_app.js',
];

// API endpoints to cache
const CACHEABLE_API_ROUTES = [
  '/api/tasks',
  '/api/tasks/categories',
  '/api/submissions',
  '/api/auth/session',
];

// Network-first strategies for real-time data
const NETWORK_FIRST_ROUTES = [
  '/api/tasks/next',
  '/api/tasks/assign',
  '/api/payments',
  '/api/auth/profile',
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => {
          return new Request(url, { cache: 'reload' });
        }));
      }),

      // Cache API endpoints
      caches.open(API_CACHE_NAME).then((cache) => {
        console.log('[SW] Pre-caching API endpoints');
        return Promise.allSettled(
          CACHEABLE_API_ROUTES.map(route => {
            return fetch(route)
              .then(response => {
                if (response.ok) {
                  return cache.put(route, response.clone());
                }
              })
              .catch(error => {
                console.warn(`[SW] Failed to pre-cache ${route}:`, error);
              });
          })
        );
      }),
    ]).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting();
    })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== STATIC_CACHE_NAME &&
            cacheName !== API_CACHE_NAME
          ) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

/**
 * Fetch event - handle network requests with caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external URLs
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Handle pages
  event.respondWith(handlePageRequest(request));
});

/**
 * Handle API requests with appropriate caching strategy
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  try {
    // Network-first for real-time data
    if (NETWORK_FIRST_ROUTES.some(route => pathname.startsWith(route))) {
      return await networkFirstWithTimeout(request, API_CACHE_NAME, 3000);
    }

    // Cache-first for relatively static data
    if (CACHEABLE_API_ROUTES.some(route => pathname.startsWith(route))) {
      return await cacheFirstWithUpdate(request, API_CACHE_NAME);
    }

    // Network-only for sensitive operations
    return await networkWithFallback(request);
  } catch (error) {
    console.error('[SW] API request failed:', error);

    // Return cached fallback if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response
    return new Response(
      JSON.stringify({
        error: 'Network unavailable',
        message: 'Please check your connection and try again',
        offline: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle static assets with cache-first strategy
 */
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cached = await cache.match(request);

  if (cached && !isExpired(cached, CACHE_DURATION.STATIC)) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      // Add timestamp header for cache expiration
      const responseWithTimestamp = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'sw-cached-at': Date.now().toString(),
        },
      });

      cache.put(request, responseWithTimestamp.clone());
      return responseWithTimestamp;
    }
  } catch (error) {
    console.warn('[SW] Network failed for static asset:', error);
  }

  // Return cached version if network fails
  return cached || new Response('Not found', { status: 404 });
}

/**
 * Handle page requests
 */
async function handlePageRequest(request) {
  try {
    // Try network first for pages
    const response = await fetch(request);

    if (response.ok) {
      // Cache successful page responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    }
  } catch (error) {
    console.warn('[SW] Network failed for page:', error);
  }

  // Fallback to cache
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  // Fallback to offline page
  const offlinePage = await caches.match('/offline');
  return offlinePage || new Response('Offline', { status: 503 });
}

/**
 * Network-first strategy with timeout
 */
async function networkFirstWithTimeout(request, cacheName, timeout = 3000) {
  const cache = await caches.open(cacheName);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(request, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      // Add timestamp for cache expiration
      const responseWithTimestamp = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'sw-cached-at': Date.now().toString(),
        },
      });

      cache.put(request, responseWithTimestamp.clone());
      return responseWithTimestamp;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('[SW] Request timeout, falling back to cache');
    } else {
      console.warn('[SW] Network error:', error);
    }
  }

  // Fallback to cache
  const cached = await cache.match(request);
  return cached || Promise.reject(new Error('No cached response available'));
}

/**
 * Cache-first strategy with background update
 */
async function cacheFirstWithUpdate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Return cached response if available and not expired
  if (cached && !isExpired(cached, CACHE_DURATION.API)) {
    // Background update
    updateCacheInBackground(request, cache);
    return cached;
  }

  // Fetch fresh data
  try {
    const response = await fetch(request);
    if (response.ok) {
      const responseWithTimestamp = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'sw-cached-at': Date.now().toString(),
        },
      });

      cache.put(request, responseWithTimestamp.clone());
      return responseWithTimestamp;
    }
  } catch (error) {
    console.warn('[SW] Fetch failed:', error);
  }

  // Return stale cache if network fails
  return cached || Promise.reject(new Error('No response available'));
}

/**
 * Network-only with fallback
 */
async function networkWithFallback(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Return error response for failed network requests
    return new Response(
      JSON.stringify({
        error: 'Network error',
        message: 'Request failed. Please try again.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Update cache in background
 */
function updateCacheInBackground(request, cache) {
  fetch(request)
    .then(response => {
      if (response.ok) {
        const responseWithTimestamp = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            ...Object.fromEntries(response.headers.entries()),
            'sw-cached-at': Date.now().toString(),
          },
        });
        cache.put(request, responseWithTimestamp);
      }
    })
    .catch(error => {
      console.warn('[SW] Background update failed:', error);
    });
}

/**
 * Check if cached response is expired
 */
function isExpired(response, maxAge) {
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return true;

  const age = Date.now() - parseInt(cachedAt, 10);
  return age > maxAge;
}

/**
 * Check if URL is a static asset
 */
function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.ttf')
  );
}

/**
 * Message handling for cache updates
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_UPDATE') {
    const { url } = event.data;
    if (url) {
      // Force update specific URL in cache
      caches.open(API_CACHE_NAME).then(cache => {
        cache.delete(url);
        fetch(url).then(response => {
          if (response.ok) {
            cache.put(url, response);
          }
        });
      });
    }
  }
});

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(handleBackgroundSync());
  }
});

/**
 * Handle background sync
 */
async function handleBackgroundSync() {
  // Implementation for syncing offline actions when back online
  // This would integrate with the offline storage utilities
  console.log('[SW] Performing background sync...');

  try {
    // Check for queued actions in IndexedDB
    // Sync any pending task submissions, payments, etc.
    // This will be implemented with the offline storage utilities
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}