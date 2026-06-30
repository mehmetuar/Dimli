import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import api from './api';
import { getRole } from './authStorage';

let _initialized = false;

export const sendPushTokenToServer = async (tokenValue: string, retries = 1): Promise<void> => {
    try {
        const endpoint = getRole() === 'business_owner'
            ? '/business-owner/push-token'
            : '/users/push-token';
        await api.patch(endpoint, { token: tokenValue });
    } catch {
        if (retries > 0) {
            await new Promise(r => setTimeout(r, 3000));
            return sendPushTokenToServer(tokenValue, retries - 1);
        }
    }
};

export const syncPushToken = async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;
    const token = localStorage.getItem('pushToken');
    if (token) await sendPushTokenToServer(token);
};

export const initializePushNotifications = async () => {
    if (!Capacitor.isNativePlatform()) return;
    if (_initialized) return;

    try {
        const result = await FirebaseMessaging.requestPermissions();
        if (result.receive !== 'granted') {
            console.warn('Push notification permission denied');
            return;
        }

        // FCM token geldiğinde kaydet
        FirebaseMessaging.addListener('tokenReceived', async (event) => {
            localStorage.setItem('pushToken', event.token);
            await sendPushTokenToServer(event.token);
        });

        // Uygulama açıkken bildirim geldiğinde
        FirebaseMessaging.addListener('notificationReceived', () => {
            // Foreground — gerekirse local notification gösterilebilir
        });

        // Bildirime tıklandığında yönlendir
        FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
            handleNotificationClick(event.notification.data);
        });

        // Local notifications
        let localPermStatus = await LocalNotifications.checkPermissions();
        if (localPermStatus.display === 'prompt') {
            localPermStatus = await LocalNotifications.requestPermissions();
        }
        LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
            handleNotificationClick(notification.notification.extra);
        });

        _initialized = true;

        // FCM token'ı tetikle
        const { token } = await FirebaseMessaging.getToken();
        if (token) {
            localStorage.setItem('pushToken', token);
            await sendPushTokenToServer(token);
        }

    } catch (e) {
        console.error('Push notification setup failed:', e);
    }
};

// Çıkışta listener birikmesini önler ve sonraki hesabın yeniden init olabilmesi için
// _initialized'i sıfırlar. Aksi halde init `if (_initialized) return` ile erken döner
// (yeni hesabın token PATCH'i atılmaz) ve eski addListener'lar üst üste birikir.
export const resetPushNotifications = async (): Promise<void> => {
    _initialized = false;
    if (!Capacitor.isNativePlatform()) return;
    try {
        await FirebaseMessaging.removeAllListeners();
    } catch {
        /* best-effort */
    }
};

// Çıkışta çağrılır — clearAuthSession'dan ÖNCE (Bearer header + getRole() için gerekli).
// Sunucudaki token'ı sil (bu hesaba push gelmesin), cihaz FCM token'ını geçersizle
// (sonraki girişte taze token üretilsin), yerel kaydı temizle, listener'ları sıfırla.
// Hepsi best-effort; ağ hatası çıkışı bloklamaz.
export const unregisterPushOnLogout = async (): Promise<void> => {
    try {
        const endpoint = getRole() === 'business_owner'
            ? '/business-owner/push-token'
            : '/users/push-token';
        await api.delete(endpoint);
    } catch {
        /* best-effort */
    }
    if (Capacitor.isNativePlatform()) {
        try {
            await FirebaseMessaging.deleteToken();
        } catch {
            /* best-effort */
        }
    }
    try {
        localStorage.removeItem('pushToken');
    } catch {
        /* ignore */
    }
    await resetPushNotifications();
};

export const clearBadge = async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;
    try {
        await LocalNotifications.removeAllDeliveredNotifications();
    } catch {}
};

export const showLocalNotification = async (title: string, body: string, data?: any) => {
    if (!Capacitor.isNativePlatform()) return;

    const notification: LocalNotificationSchema = {
        title,
        body,
        id: new Date().getTime(),
        extra: data,
        schedule: { at: new Date(Date.now() + 100) },
    };

    await LocalNotifications.schedule({ notifications: [notification] });
};

const handleNotificationClick = (data: any) => {
    if (!data) return;
    if (data.type === 'CHAT' || data.isChatRedirect) {
        window.location.hash = data.channelId ? `#/chat?channelId=${data.channelId}` : '#/chat';
    } else if (data.type === 'JOIN_REQUEST') {
        window.location.hash = '#/notifications?tab=JOIN_REQUESTS';
    } else if (data.type === 'CHALLENGE' || data.type === 'JOKER_INVITE' || data.type === 'REMATCH_PROPOSAL') {
        window.location.hash = '#/notifications?tab=MATCH_REQUESTS';
    } else {
        window.location.hash = '#/notifications';
    }
};
