const CACHE_NAME = "ordini-tiscali-v1";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js"
];


// =====================================================
// INSTALLAZIONE
// =====================================================

self.addEventListener("install", event => {

    console.log("SERVICE WORKER: installazione");

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(cache => {

                return cache.addAll(FILES_TO_CACHE);

            })

    );

    self.skipWaiting();

});


// =====================================================
// ATTIVAZIONE
// =====================================================

self.addEventListener("activate", event => {

    console.log("SERVICE WORKER: attivato");

    event.waitUntil(

        caches.keys().then(keys => {

            return Promise.all(

                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))

            );

        })

    );

    self.clients.claim();

});


// =====================================================
// RICHIESTE
// =====================================================

self.addEventListener("fetch", event => {

    const request = event.request;

    // Non intercettiamo richieste non GET
    if (request.method !== "GET") {
        return;
    }

    // Per API / backend lasciamo lavorare normalmente la rete
    if (
        request.url.includes("/api/") ||
        request.url.includes("/ordine/") ||
        request.url.includes("/login") ||
        request.url.includes("/punti-vendita") ||
        request.url.includes("/prodotti") ||
        request.url.includes("/upload-excel")
    ) {
        return;
    }


    event.respondWith(

        fetch(request)
            .then(response => {

                // Salviamo una copia aggiornata
                const responseClone = response.clone();

                caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(request, responseClone);
                    });

                return response;

            })
            .catch(() => {

                // Se siamo offline, proviamo dalla cache
                return caches.match(request);

            })

    );

});