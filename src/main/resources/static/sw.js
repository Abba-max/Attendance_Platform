const CACHE_VERSION = 'v1';
const STATIC_CACHE_NAME = `attendee-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `attendee-dynamic-${CACHE_VERSION}`;

// Resources to pre-cache immediately upon installation
const PRECACHE_ASSETS = [
    '/offline.html',
    '/image/logo.png',
    '/css/main.css',
    '/css/Login.css',
    '/css/Classes.css',
    '/js/Login.js',
    '/js/libs/sockjs.min.js',
    '/js/libs/stomp.min.js',
    '/js/libs/tom-select.complete.min.js',
    '/css/libs/tom-select.default.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&display=swap'
];

// Install Event - Pre-cache critical application shell assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Pre-caching core application shell...');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => self.skipWaiting()) // Force activation of the new worker immediately
    );
});

// Activate Event - Prune stale cache versions
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheKeys => {
            return Promise.all(
                cacheKeys.map(key => {
                    if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
                        console.log('[Service Worker] Removing deprecated cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Automatically claim all clients without page reloads
    );
});

// Fetch Event - Route requests using customized strategies
self.addEventListener('fetch', event => {
    // Skip non-GET requests (POST, PUT, DELETE shouldn't be handled by cache)
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Skip WebSockets, DevServer hot reloads, or Spring Actuator/H2-Console
    if (url.pathname.includes('/ws') || url.pathname.includes('/stomp') || url.pathname.includes('/h2-console')) {
        return;
    }

    // Navigation Requests (HTML pages like /login, /dashboards/*)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cache the successful dynamic page response for offline fallback browsing
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // If offline, attempt to serve the cached page, otherwise serve offline.html
                    return caches.match(event.request)
                        .then(cachedResponse => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            return caches.match('/offline.html');
                        });
                })
        );
        return;
    }

    // Static Assets Requests (CSS, JS, Fonts, Images) - Cache-First Strategy
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Serve immediately from cache, and optionally refresh in the background (Stale-While-Revalidate)
                    fetch(event.request).then(networkResponse => {
                        if (networkResponse.status === 200) {
                            caches.open(STATIC_CACHE_NAME).then(cache => {
                                cache.put(event.request, networkResponse);
                            });
                        }
                    }).catch(() => {/* ignore background update failures */});
                    
                    return cachedResponse;
                }

                // If not cached, fetch from network and add to appropriate cache
                return fetch(event.request)
                    .then(networkResponse => {
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            // If third-party resource (like google fonts/CDN), cache it but don't check basic type
                            if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
                                const responseClone = networkResponse.clone();
                                caches.open(STATIC_CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                            }
                            return networkResponse;
                        }

                        const responseClone = networkResponse.clone();
                        // Cache JS/CSS/Images inside Static Cache
                        const isAsset = url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/i);
                        if (isAsset) {
                            caches.open(STATIC_CACHE_NAME).then(cache => {
                                cache.put(event.request, responseClone);
                            });
                        }
                        // Cache dynamically generated reports for offline viewing
                        else if (url.pathname.includes('/pdf') || url.pathname.includes('/excel')) {
                            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                                cache.put(event.request, responseClone);
                            });
                        }

                        return networkResponse;
                    });
            })
    );
});

// Listener for skipWaiting trigger from client updates
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});

// IndexedDB Helper for Background Sync
function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('attendee-offline-db', 1);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('timetable-requests')) {
                db.createObjectStore('timetable-requests', { autoIncrement: true, keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function getOfflineTimetables() {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction('timetable-requests', 'readonly');
            const store = tx.objectStore('timetable-requests');
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    });
}

function removeOfflineTimetable(id) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction('timetable-requests', 'readwrite');
            const store = tx.objectStore('timetable-requests');
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    });
}

// Background Sync Event Listener
self.addEventListener('sync', event => {
    if (event.tag === 'sync-timetable') {
        console.log('[Service Worker] Background Sync: sync-timetable triggered');
        event.waitUntil(
            getOfflineTimetables().then(requests => {
                return Promise.all(requests.map(req => {
                    return fetch('/api/timetablecontent', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(req.payload)
                    }).then(res => {
                        if (res.ok) {
                            // Successfully synced, remove from IndexedDB
                            return removeOfflineTimetable(req.id).then(() => {
                                self.registration.showNotification('Attendee', {
                                    body: 'Your offline timetable has been successfully synced to the server!',
                                    icon: '/image/logo.png',
                                    vibrate: [200, 100, 200]
                                });
                            });
                        } else {
                            throw new Error('Server returned an error during sync');
                        }
                    });
                }));
            })
        );
    }
});
