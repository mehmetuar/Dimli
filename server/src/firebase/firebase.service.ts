import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  constructor() {
    if (!admin.apps.length) {
      try {
        const serviceAccount = JSON.parse(
          process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}',
        );
        admin.initializeApp({
          credential: admin.credential.cert(
            serviceAccount as admin.ServiceAccount,
          ),
        });
      } catch (e) {
        this.logger.error('Firebase init failed', e);
      }
    }
  }

  async sendToDevice(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!admin.apps.length) return;
    try {
      await admin.messaging().send({
        token,
        notification: { title, body },
        data,
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
        android: { priority: 'high', notification: { sound: 'default' } },
      });
    } catch (e) {
      this.logger.warn(
        `FCM send failed for token ${token?.slice(0, 20)}...: ${e.message}`,
      );
    }
  }
}
