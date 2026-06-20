import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  constructor() {
    if (!admin.apps.length) {
      try {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        const serviceAccount = JSON.parse(raw || '{}');
        this.assertValidServiceAccount(serviceAccount, !!raw);

        admin.initializeApp({
          credential: admin.credential.cert(
            serviceAccount as admin.ServiceAccount,
          ),
        });
        this.logger.log('Firebase Admin SDK başarıyla başlatıldı.');
      } catch (e) {
        this.logger.error(`Firebase init failed: ${e.message}`);
      }
    }
  }

  // Render/Heroku gibi ortamlarda private_key alanındaki \n kaçış karakterleri
  // env var arayüzüne yapıştırılırken bozulabiliyor — bu durumda admin.credential.cert()
  // sessizce "geçerli" görünür ama ilk gerçek FCM gönderiminde OAuth2 hatası verir.
  // Burada erkenden, açık bir Türkçe hata ile yakalıyoruz.
  private assertValidServiceAccount(account: any, envVarWasSet: boolean) {
    if (!envVarWasSet) {
      throw new Error(
        '🔥 FIREBASE_SERVICE_ACCOUNT_JSON ortam değişkeni tanımlı değil. Push bildirimleri gönderilemeyecek.',
      );
    }

    const requiredFields = ['project_id', 'private_key', 'client_email'];
    const missing = requiredFields.filter((f) => !account?.[f]);
    if (missing.length) {
      throw new Error(
        `🔥 FIREBASE_SERVICE_ACCOUNT_JSON geçersiz: şu alan(lar) eksik: ${missing.join(', ')}. Render ortam değişkenini kontrol edin.`,
      );
    }

    const key = account.private_key as string;
    if (
      !key.includes('-----BEGIN PRIVATE KEY-----') ||
      !key.includes('-----END PRIVATE KEY-----') ||
      !key.includes('\n')
    ) {
      throw new Error(
        '🔥 FIREBASE_SERVICE_ACCOUNT_JSON geçersiz: private_key alanı bozuk görünüyor (satır sonları \\n kaybolmuş olabilir). Render ortam değişkenini, anahtarı tek satıra sıkıştırarak (JSON.stringify) yeniden yapıştırın.',
      );
    }
  }

  async sendToDevice(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    badge = 1,
  ): Promise<void> {
    if (!admin.apps.length) {
      this.logger.warn(
        `FCM gönderilemedi (token ${token?.slice(0, 20)}...): Firebase Admin SDK başlatılamadı, yukarıdaki "Firebase init failed" logunu kontrol edin.`,
      );
      return;
    }
    try {
      await admin.messaging().send({
        token,
        notification: { title, body },
        data,
        apns: { payload: { aps: { sound: 'default', badge } } },
        android: { priority: 'high', notification: { sound: 'default' } },
      });
      this.logger.log(
        `FCM gönderildi → token ${token?.slice(0, 20)}... badge=${badge}`,
      );
    } catch (e) {
      this.logger.warn(
        `FCM send failed for token ${token?.slice(0, 20)}...: ${e.message}`,
      );
    }
  }
}
