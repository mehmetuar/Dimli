import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import api from './api';
import { getRole } from './authStorage';

// Listener'lar app oturumu boyunca BİR KEZ eklenir ve KALDIRILMAZ. tokenReceived,
// sonradan/yenilenince üretilen token'ı yakalayıp GÜNCEL hesaba (getRole) gönderir.
let _listenersAdded = false;

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

// Listener'ları bir kez kurar (idempotent). removeAllListeners YOK → güvenlik ağı korunur.
const setupListeners = async (): Promise<void> => {
    if (_listenersAdded) return;
    _listenersAdded = true;

    // FCM token geldiğinde/yenilendiğinde GÜNCEL hesaba kaydet.
    FirebaseMessaging.addListener('tokenReceived', async (event) => {
        localStorage.setItem('pushToken', event.token);
        await sendPushTokenToServer(event.token);
    });

    // Uygulama açıkken bildirim (foreground) — no-op.
    FirebaseMessaging.addListener('notificationReceived', () => {});

    // Bildirime tıklayınca yönlendir.
    FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
        handleNotificationClick(event.notification.data);
    });

    // Local notifications izni + tıklama yönlendirmesi.
    try {
        const st = await LocalNotifications.checkPermissions();
        if (st.display === 'prompt') await LocalNotifications.requestPermissions();
    } catch {
        /* best-effort */
    }
    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        handleNotificationClick(notification.notification.extra);
    });
};

// Her giriş/açılışta çağrılabilir (idempotent). İzin ister, listener'ları bir kez kurar,
// token'ı alıp GÜNCEL hesaba gönderir. Eski tek-seferlik `_initialized` guard'ı KALDIRILDI:
// çıkış→tekrar giriş sonrası da token yeniden kaydolur (eskiden NULL kalıyordu).
export const initializePushNotifications = async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
        const result = await FirebaseMessaging.requestPermissions();
        if (result.receive !== 'granted') {
            console.warn('Push notification permission denied');
            return;
        }

        await setupListeners();

        // FCM token'ı al ve gönder. getToken bir kez boş dönse bile kalıcı
        // tokenReceived listener'ı sonradan üretilen token'ı yakalar.
        const { token } = await FirebaseMessaging.getToken();
        if (token) {
            localStorage.setItem('pushToken', token);
            await sendPushTokenToServer(token);
        }
    } catch (e) {
        console.error('Push notification setup failed:', e);
    }
};

// Çıkışta yalnızca SUNUCUDAKİ token'ı temizler (bu hesaba push gelmesin). Cihazın FCM
// token'ını SİLMEZ (deleteToken iOS'ta yeni token üretimini bozuyordu) ve listener'ları
// kaldırmaz. Sonraki giriş aynı geçerli token'ı yeni hesaba yeniden kaydeder; sunucudaki
// unbind-on-register token'ı eski hesaptan çözer. Best-effort; çıkışı bloklamaz.
export const unregisterPushOnLogout = async (): Promise<void> => {
    try {
        const endpoint = getRole() === 'business_owner'
            ? '/business-owner/push-token'
            : '/users/push-token';
        await api.delete(endpoint);
    } catch {
        /* best-effort */
    }
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
    if (data.type === 'SUPPORT_REPLY') {
        // Hem kullanıcı (SYSTEM + metadata.type) hem işletme (üst düzey tip) push'u
        // data.type='SUPPORT_REPLY' taşır; hedef sayfayı rol belirler.
        window.location.hash = getRole() === 'business_owner'
            ? '#/business/settings/support'
            : '#/settings/support';
        return;
    }
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
