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

// Track recently shown notification tags to prevent duplicates within 5 seconds
const recentNotifications = new Map();

// Handle background messages
// NOTE: Firebase only calls onBackgroundMessage when the page is NOT focused.
// When the page IS focused, Firebase delivers the message to the foreground
// onMessage handler in the app instead. So this handler is background-only.
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Received background message:', payload);

    const data = payload?.data || {};
    const title = payload.notification?.title || data?.title || 'Jhumroo';
    const body = payload.notification?.body || data?.body || '';

    // Build a dedup key consistent with the foreground handler
    const type = data?.type || 'unknown';
    const senderId = data?.senderId || '';
    const reelId = data?.reelId || '';
    const commentId = data?.commentId || '';
    const tag = data?.tag || `${type}_${senderId}_${reelId}_${commentId}` || 'jhumroo_notification';

    // Deduplication: suppress if same tag was shown within the last 5 seconds
    const now = Date.now();
    const lastShown = recentNotifications.get(tag);
    if (lastShown && (now - lastShown) < 5000) {
        console.log('[SW] Suppressing duplicate background notification:', tag);
        return;
    }
    recentNotifications.set(tag, now);

    // Cleanup old entries to prevent memory growth
    if (recentNotifications.size > 50) {
        const cutoff = now - 10000;
        for (const [key, time] of recentNotifications.entries()) {
            if (time < cutoff) recentNotifications.delete(key);
        }
    }

    const notificationOptions = {
        body: body,
        icon: '/favicon.svg',
        data: data || {},
        tag: tag, // Deduplication at browser level - same tag replaces previous
        badge: '/favicon.svg',
        vibrate: [200, 100, 200],
        renotify: false, // Don't re-alert if same tag already shown
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
