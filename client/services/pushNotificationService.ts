import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import api from './api';

let _initialized = false;

export const sendPushTokenToServer = async (tokenValue: string, retries = 1): Promise<void> => {
    try {
        const role = localStorage.getItem('role');
        const endpoint = role === 'business_owner'
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

export const clearBadge = async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;
    try {
        await FirebaseMessaging.setBadge({ count: 0 });
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
        window.location.hash = '#/chat';
    } else {
        window.location.hash = '#/notifications';
    }
};
