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
        console.log('[PushDebug] token sunucuya kaydedildi:', endpoint, tokenValue.slice(0, 20) + '...');
    } catch (e) {
        console.error('[PushDebug] token sunucuya kaydedilemedi:', e);
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
        console.log('[PushDebug] permission result:', result.receive);
        if (result.receive !== 'granted') {
            console.warn('Push notification permission denied');
            return;
        }

        // FCM token geldiğinde kaydet
        FirebaseMessaging.addListener('tokenReceived', async (event) => {
            console.log('[PushDebug] tokenReceived event:', event.token.slice(0, 20) + '...');
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
        console.log('[PushDebug] FCM getToken sonucu:', token ? token.slice(0, 20) + '...' : '(token yok)');
        if (token) {
            localStorage.setItem('pushToken', token);
            await sendPushTokenToServer(token);
        }

    } catch (e) {
        console.error('[PushDebug] Push notification setup failed:', e);
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
