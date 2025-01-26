// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

// Firebase configuration
firebase.initializeApp({
    apiKey: "AIzaSyDGpAHia_wEmrhnmYjrPf1n1TrAzwEMiAI",
    authDomain: "messageemeapp.firebaseapp.com",
    projectId: "messageemeapp",
    storageBucket: "messageemeapp.appspot.com",
    messagingSenderId: "255034474844",
    appId: "1:255034474844:web:5e3b7a6bc4b2fb94cc4199"
});

const messaging = firebase.messaging();

// Enhanced notification handling
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);

    // Create notification options with enhanced features
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon || '/pngwing.com.png',
        badge: '/pngwing.com.png',
        tag: payload.data?.notificationId || 'default',
        data: payload.data,
        requireInteraction: true, // Keep notification until user interacts
        actions: [
            {
                action: 'view',
                title: 'عرض'
            },
            {
                action: 'close',
                title: 'إغلاق'
            }
        ],
        vibrate: [200, 100, 200], // Vibration pattern
        silent: false // Allow sound
    };

    return self.registration.showNotification(
        payload.notification.title,
        notificationOptions
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    event.notification.close();

    // Handle action buttons
    if (event.action === 'view') {
        // Open or focus app window
        const urlToOpen = new URL('/', self.location.origin).href;

        event.waitUntil(
            clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            })
            .then((windowClients) => {
                // Focus existing window if open
                for (let client of windowClients) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window if closed
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
        );
    }
});

// Cache configuration with versioning
const CACHE_VERSION = 'v1.0.1';
const CACHE_NAME = `taxi-app-cache-${CACHE_VERSION}`;

// Assets to cache
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/style.css',
    '/app.js',
    '/offline.html',
    '/pngwing.com.png',
    '/default-image.png'
];

const EXTERNAL_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.rtl.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js'
];

// Enhanced install event handler with better error handling
self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            try {
                const cache = await caches.open(CACHE_NAME);
                
                // Cache static assets with progress tracking
                console.log('Caching static assets...');
                let completed = 0;
                const total = STATIC_ASSETS.length;

                await Promise.all(
                    STATIC_ASSETS.map(async (url) => {
                        try {
                            await cache.add(url);
                            completed++;
                            console.log(`Cached ${completed}/${total}: ${url}`);
                        } catch (error) {
                            console.warn(`Failed to cache: ${url}`, error);
                        }
                    })
                );

                // Cache external assets with no-cors mode
                console.log('Caching external assets...');
                await Promise.all(
                    EXTERNAL_ASSETS.map(async (url) => {
                        try {
                            const response = await fetch(url, { 
                                mode: 'no-cors',
                                credentials: 'omit',
                                cache: 'no-cache'
                            });
                            await cache.put(url, response);
                            console.log(`Successfully cached external asset: ${url}`);
                        } catch (error) {
                            console.warn(`Failed to cache external asset: ${url}`, error);
                        }
                    })
                );

                console.log('Cache installation complete');
            } catch (error) {
                console.error('Cache installation failed:', error);
            }
        })()
    );
    self.skipWaiting();
});

// Enhanced activate event handler with proper cache cleanup
self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            try {
                // Clean up old caches
                const cacheKeys = await caches.keys();
                const outdatedCaches = cacheKeys.filter(key => 
                    key.startsWith('taxi-app-cache-') && key !== CACHE_NAME
                );

                await Promise.all(
                    outdatedCaches.map(key => {
                        console.log(`Deleting outdated cache: ${key}`);
                        return caches.delete(key);
                    })
                );

                // Take control of all clients
                await clients.claim();
                console.log('Service Worker activated and controlling all clients');
            } catch (error) {
                console.error('Activation error:', error);
            }
        })()
    );
});

// Enhanced fetch event handler with improved offline support
self.addEventListener('fetch', (event) => {
    event.respondWith(
        (async () => {
            try {
                // Try cache first
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) {
                    return cachedResponse;
                }

                // If not in cache, try network
                try {
                    const networkResponse = await fetch(event.request);
                    
                    // Cache successful same-origin responses
                    if (networkResponse.ok && event.request.url.startsWith(self.location.origin)) {
                        const cache = await caches.open(CACHE_NAME);
                        cache.put(event.request, networkResponse.clone());
                    }
                    
                    return networkResponse;
                } catch (fetchError) {
                    // Handle offline scenarios
                    console.log('Fetch failed, serving offline content:', fetchError);
                    
                    if (event.request.destination === 'image') {
                        return caches.match('/default-image.png');
                    }
                    
                    if (event.request.mode === 'navigate') {
                        return caches.match('/offline.html');
                    }
                    
                    throw fetchError;
                }
            } catch (error) {
                console.error('Fetch handler error:', error);
                throw error;
            }
        })()
    );
});

// Enhanced FCM token handling
messaging.getToken({ 
    vapidKey: 'BI9cpoewcZa1ftyZ_bGjO0GYa4_cT0HNja4YFd6FwLwHg5c0gQ5iSj_MJZRhMxKdgJ0-d-_rEXcpSQ_cx7GqCSc' 
}).then((token) => {
    if (token) {
        console.log('FCM Token obtained:', token);
        // Store token in IndexedDB for persistence
        return saveTokenToIndexedDB(token);
    } else {
        console.warn('No FCM token available');
    }
}).catch((err) => {
    console.error('Failed to get FCM token:', err);
});

// Helper function to store token in IndexedDB
async function saveTokenToIndexedDB(token) {
    try {
        const db = await openDB('fcm-store', 1, {
            upgrade(db) {
                db.createObjectStore('tokens');
            }
        });
        await db.put('tokens', token, 'current');
        console.log('Token saved to IndexedDB');
    } catch (error) {
        console.error('Error saving token to IndexedDB:', error);
    }
}

// نظام الإشعارات المحسن
class NotificationSystem {
    constructor() {
        this.container = this.createContainer();
        this.notifications = new Set();
        this.initialize();
    }

    // تهيئة نظام الإشعارات
    initialize() {
        this.checkNotificationSupport()
            .then(() => this.requestPermission())
            .catch(error => {
                console.error('Notification initialization error:', error);
            });
    }

    // إنشاء حاوية الإشعارات
    createContainer() {
        const container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    // التحقق من دعم الإشعارات
    async checkNotificationSupport() {
        if (!('Notification' in window)) {
            throw new Error('المتصفح لا يدعم الإشعارات');
        }
    }

    // طلب إذن الإشعارات
    async requestPermission() {
        if (Notification.permission === 'default') {
            this.showPermissionDialog();
        } else if (Notification.permission === 'granted') {
            this.show('مرحباً بك!', 'تم تفعيل الإشعارات بنجاح', 'success');
        }
    }

    // عرض نافذة طلب الإذن
    showPermissionDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'permission-dialog';
        dialog.innerHTML = `
            <div class="permission-dialog-icon">
                <i class="fas fa-bell"></i>
            </div>
            <h3 class="permission-dialog-title">تفعيل الإشعارات</h3>
            <p class="permission-dialog-message">
                نود إرسال إشعارات لإبقائك على اطلاع بآخر التحديثات والعروض.
                هل تود تفعيل الإشعارات؟
            </p>
            <div class="permission-dialog-buttons">
                <button class="permission-button allow">نعم، تفعيل الإشعارات</button>
                <button class="permission-button deny">لا، شكراً</button>
            </div>
        `;

        document.body.appendChild(dialog);

        dialog.querySelector('.allow').addEventListener('click', async () => {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.show('تم!', 'تم تفعيل الإشعارات بنجاح', 'success');
            }
            dialog.remove();
        });

        dialog.querySelector('.deny').addEventListener('click', () => {
            dialog.remove();
            this.show('تم الإلغاء', 'يمكنك تفعيل الإشعارات لاحقاً من الإعدادات', 'info');
        });
    }

    // عرض إشعار
    show(title, message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
                ${this.getIconForType(type)}
            </div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">&times;</button>
            <div class="notification-progress"></div>
        `;

        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.close(notification));

        this.container.appendChild(notification);
        this.notifications.add(notification);

        setTimeout(() => this.close(notification), duration);

        return notification;
    }

    // إغلاق إشعار
    close(notification) {
        if (!this.notifications.has(notification)) return;
        
        notification.style.animation = 'slideOut 0.5s ease forwards';
        
        setTimeout(() => {
            notification.remove();
            this.notifications.delete(notification);
        }, 500);
    }

    // الحصول على أيقونة الإشعار حسب النوع
    getIconForType(type) {
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-times-circle"></i>',
            warning: '<i class="fas fa-exclamation-circle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        return icons[type] || icons.info;
    }
}

// إنشاء نسخة عامة من نظام الإشعارات
const notificationSystem = new NotificationSystem();

// دالة مختصرة لعرض الإشعارات
function showNotification(title, message, type = 'info') {
    notificationSystem.show(title, message, type);
}

// مثال على الاستخدام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // إشعار ترحيبي
    setTimeout(() => {
        showNotification(
            'مرحباً بك في تاكسي العراق!',
            'نحن سعداء بانضمامك إلينا',
            'info'
        );
    }, 1000);
    
    // التحقق من حالة الاتصال
    if (navigator.onLine) {
        showNotification(
            'متصل بالإنترنت',
            'يمكنك الآن استخدام جميع خدمات التطبيق',
            'success'
        );
    } else {
        showNotification(
            'غير متصل',
            'يرجى التحقق من اتصال الإنترنت',
            'error'
        );
    }
});

// مراقبة حالة الاتصال
window.addEventListener('online', () => {
    showNotification(
        'تم استعادة الاتصال',
        'يمكنك الآن استخدام جميع خدمات التطبيق',
        'success'
    );
});

window.addEventListener('offline', () => {
    showNotification(
        'انقطع الاتصال',
        'يرجى التحقق من اتصال الإنترنت',
        'error'
    );
});