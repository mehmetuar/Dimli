import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications, ScheduleOptions, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import api from './api';

export const initializePushNotifications = async () => {
    if (!Capacitor.isNativePlatform()) {
        console.log('Push notifications are only available on native platforms.');
        return;
    }

    try {
        // Request permission to use push notifications
        // iOS will prompt user and return if they granted permission or not
        // Android will just grant without prompting
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            console.warn('User denied push notification permission');
            return;
        }

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token: Token) => {
            console.log('Push registration success, token: ' + token.value);
            try {
                // Send the token to the backend
                await api.patch('/users/push-token', { token: token.value });
                localStorage.setItem('pushToken', token.value);
            } catch (error) {
                console.error('Error saving push token to backend:', error);
            }
        });

        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('Error on registration: ' + JSON.stringify(error));
        });

        PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
            console.log('Push received: ' + JSON.stringify(notification));
            // When app is open, push notification may not show in system tray on all platforms.
            // We can show a local notification to ensure they see it if they are using the app.
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
            console.log('Push action performed: ' + JSON.stringify(notification));
            // Navigate based on payload
            handleNotificationClick(notification.notification.data);
        });

        // Setup Local Notifications for local trigger (e.g. from websocket or background sync)
        let localPermStatus = await LocalNotifications.checkPermissions();
        if (localPermStatus.display === 'prompt') {
            localPermStatus = await LocalNotifications.requestPermissions();
        }

        LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
            console.log('Local notification action performed', notification.notification);
            handleNotificationClick(notification.notification.extra);
        });

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
        schedule: { at: new Date(Date.now() + 100) }, // schedule immediately (100ms)
    };

    await LocalNotifications.schedule({
        notifications: [notification]
    });
};

const handleNotificationClick = (data: any) => {
    if (!data) return;

    // Navigate to the relevant page based on metadata
    // Using simple window.location for now, but ideally uses React Router's navigate
    if (data.type === 'CHAT' || data.isChatRedirect) {
        window.location.href = data.channelId ? `/chat/${data.channelId}` : '/chat';
    } else {
        window.location.href = '/notifications';
    }
};
