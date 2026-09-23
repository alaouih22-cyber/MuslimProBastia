importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCHVgzE-tYoKlQlJRHgUHtEP-Q0NCEG6WQ",
  authDomain: "muslimprobastia-d5d41.firebaseapp.com",
  projectId: "muslimprobastia-d5d41",
  storageBucket: "muslimprobastia-d5d41.firebasestorage.app",
  messagingSenderId: "854739829236",
  appId: "1:854739829236:web:2ad83ad9c0cdec635ff9a1"
});

const messaging = firebase.messaging();

const ATHAN_AUDIO_URL = 'https://ia800203.us.archive.org/8/items/AdhanMorocco/Adhan%20Morocco.mp3';

function getAppIcon() {
    return (self.location && self.location.origin) ? (self.location.origin + '/icon.png') : 'icon.png';
}

function broadcastPlayAthan(title, body) {
    return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
            client.postMessage({
                type: 'PLAY_ATHAN',
                title: title,
                body: body,
                sound: ATHAN_AUDIO_URL
            });
        });
    });
}

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Ricevuto messaggio in background FCM:', payload);
    const title = payload.notification?.title || payload.data?.title || 'Muslim Pro Bastia';
    const body = payload.notification?.body || payload.data?.body || 'È arrivato il momento della preghiera.';
    const iconUrl = getAppIcon();
    const options = {
        body: body,
        icon: iconUrl,
        badge: iconUrl,
        image: iconUrl,
        sound: ATHAN_AUDIO_URL,
        silent: false,
        vibrate: [500, 110, 500, 110, 1000],
        tag: 'prayer-adhan-alert',
        renotify: true,
        data: {
            url: './index.html?playAthan=1'
        }
    };

    broadcastPlayAthan(title, body);
    self.registration.showNotification(title, options);
});

self.addEventListener('push', (event) => {
    if (event.data) {
        try {
            const json = event.data.json();
            if (json.data && (json.data.firebaseMessageId || json.from)) {
                return; 
            }
        } catch (e) {}
    }

    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Muslim Pro Bastia';
    const body = data.body || 'È arrivato il momento della preghiera.';
    const iconUrl = getAppIcon();
    const options = {
        body: body,
        icon: iconUrl,
        badge: iconUrl,
        image: iconUrl,
        sound: ATHAN_AUDIO_URL,
        silent: false,
        vibrate: [500, 110, 500, 110, 1000],
        tag: 'prayer-adhan-alert',
        renotify: true,
        data: {
            url: './index.html?playAthan=1'
        }
    };

    event.waitUntil(
        Promise.all([
            broadcastPlayAthan(title, body),
            self.registration.showNotification(title, options)
        ])
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    client.focus();
                    client.postMessage({ type: 'PLAY_ATHAN' });
                    return;
                }
            }
            if (clients.openWindow) return clients.openWindow('./index.html?playAthan=1');
        })
    );
});
