import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
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

// Her uygulama açılışında localStorage'daki token'ı sunucuyla senkronize et
export const syncPushToken = async (): Promise<void> => {
    if (!Capacitor.isNativePlatform()) return;
    const token = localStorage.getItem('pushToken');
    if (token) await sendPushTokenToServer(token);
};

export const initializePushNotifications = async () => {
    if (!Capacitor.isNativePlatform()) return;
    if (_initialized) return;

    try {
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted') {
            console.warn('Push notification permission denied');
            return;
        }

        // Listener'ları register() ÖNCE ekle — race condition'ı önler
        PushNotifications.addListener('registration', async (token: Token) => {
            localStorage.setItem('pushToken', token.value);  // önce localStorage'a yaz
            await sendPushTokenToServer(token.value);        // sonra API'ye gönder (retry'lı)
        });

        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('Push registration error:', JSON.stringify(error));
        });

        PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
            console.log('Push received (foreground):', notification.title);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
            handleNotificationClick(notification.notification.data);
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
        await PushNotifications.register();

    } catch (e) {
        console.error('Push notification setup failed:', e);
    }
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
