// Jhumroo Firebase Cloud Messaging Background Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA_dummy_key_for_fcm_registration",
  authDomain: "jhumroo-e265a.firebaseapp.com",
  projectId: "jhumroo-e265a",
  storageBucket: "jhumroo-e265a.appspot.com",
  messagingSenderId: "175974873085",
  appId: "1:175974873085:web:0f419c8f2ba12a83236789"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Received background message:', payload);

    const data = payload?.data || {};
    const title = payload.notification?.title || data?.title || 'Jhumroo';
    const body = payload.notification?.body || data?.body || '';
    const tag = data?.tag || data?.reelId || data?.commentId || 'jhumroo_notification';

    const notificationOptions = {
        body: body,
        icon: '/favicon.svg',
        data: data || {},
        tag: tag, // Deduplication
        badge: '/favicon.svg',
        vibrate: [200, 100, 200],
    };

    return self.registration.showNotification(title, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const data = event.notification.data;
    const urlToOpen = data?.link || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (urlToOpen.includes(client.url) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
