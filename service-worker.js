const CACHE_NAME =
    'cbt-geo8tangsel-v3';


const APP_FILES = [

    './',

    './index.html',

    './app.js',

    './manifest.json'

];


// ============================================================
// INSTALL
// ============================================================

self.addEventListener(
    'install',
    event => {

        self.skipWaiting();

        event.waitUntil(

            caches
                .open(CACHE_NAME)
                .then(
                    cache =>
                        cache.addAll(
                            APP_FILES
                        )
                )

        );

    }
);


// ============================================================
// ACTIVATE
// ============================================================

self.addEventListener(
    'activate',
    event => {

        event.waitUntil(

            caches
                .keys()
                .then(
                    keys =>

                        Promise.all(

                            keys
                                .filter(
                                    key =>
                                        key !==
                                        CACHE_NAME
                                )
                                .map(
                                    key =>
                                        caches.delete(
                                            key
                                        )
                                )

                        )

                )
                .then(
                    () =>
                        self.clients.claim()
                )

        );

    }
);


// ============================================================
// FETCH
// ============================================================

self.addEventListener(
    'fetch',
    event => {

        const request =
            event.request;


        const url =
            new URL(
                request.url
            );


        /*
         * Jangan mengganggu Google Apps Script.
         */
        if (
            url.origin !==
            self.location.origin
        ) {

            return;

        }


        if (
            request.method !==
            'GET'
        ) {

            return;

        }


        /*
         * Untuk file aplikasi:
         * NETWORK FIRST
         *
         * sehingga update GitHub
         * segera bisa digunakan.
         */

        event.respondWith(

            fetch(request)
                .then(
                    response => {

                        const copy =
                            response.clone();


                        caches
                            .open(
                                CACHE_NAME
                            )
                            .then(
                                cache =>
                                    cache.put(
                                        request,
                                        copy
                                    )
                            );


                        return response;

                    }
                )
                .catch(
                    () =>
                        caches.match(
                            request
                        )
                )

        );

    }
);
