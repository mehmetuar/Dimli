import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

// Ham Google servis-hesabı JSON'u (snake_case) — admin.ServiceAccount'un
// camelCase alanlarıyla karıştırma; cert()'e verilirken cast edilir.
export interface RawServiceAccount {
  project_id?: string;
  private_key?: string;
  client_email?: string;
  [k: string]: unknown;
}

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
  private assertValidServiceAccount(
    account: RawServiceAccount,
    envVarWasSet: boolean,
  ) {
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

  // Dönüş: { success, invalidToken }. invalidToken=true ise token kalıcı olarak
  // geçersizdir (cihaz silinmiş/izin reddedilmiş/stale) → çağıran tarafı token'ı
  // DB'den temizlemeli ki bir daha denenmesin ve sorun teşhis edilebilir olsun.
  async sendToDevice(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    badge = 1,
  ): Promise<{ success: boolean; invalidToken: boolean }> {
    if (!admin.apps.length) {
      this.logger.warn(
        `FCM gönderilemedi (token ${token?.slice(0, 20)}...): Firebase Admin SDK başlatılamadı, yukarıdaki "Firebase init failed" logunu kontrol edin.`,
      );
      return { success: false, invalidToken: false };
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
      return { success: true, invalidToken: false };
    } catch (e) {
      const code: string =
        (e?.errorInfo?.code as string) || (e?.code as string) || 'unknown';
      // Yalnız TOKEN'a özgü kesin hatalarda token'ı geçersiz say. 'invalid-argument'
      // FCM tarafından bozuk PAYLOAD için de döndürülür (örn. boş gövde) → onu
      // invalidToken sayMA, yoksa geçerli token yanlışlıkla silinir.
      const invalidToken =
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token';
      this.logger.warn(
        `FCM send failed (${code}) token ${token?.slice(0, 20)}...: ${e.message}`,
      );
      return { success: false, invalidToken };
    }
  }
}
