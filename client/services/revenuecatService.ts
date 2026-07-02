import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

const IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_API_KEY as string;
const ANDROID_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY as string;

const PLAN_TO_PACKAGE: Record<string, string> = {
    '1_pitch': 'starter_package',
    '2_pitch': 'basic_package',
    '3_pitch': 'pro_package',
    '4_pitch': 'business_package',
    '5plus_pitch': 'enterprise_package',
};

/**
 * Uygulama açılışında SDK'yı başlat.
 * Native platform değilse (web/geliştirme) sessizce geçer.
 */
export async function initRevenueCat(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    const apiKey = Capacitor.getPlatform() === 'ios' ? IOS_KEY : ANDROID_KEY;
    await Purchases.configure({ apiKey });
}

/**
 * RevenueCat / satın alma hatasını Türkçe kullanıcı mesajına çevirir.
 * Ham İngilizce SDK mesajı (ör. "purchase was cancelled") ASLA kullanıcıya gösterilmez.
 * `cancelled: true` → kullanıcı iptal etti (çağıran sessiz geçebilir).
 */
export function purchaseErrorToTurkish(err: any): { cancelled: boolean; message: string } {
    const code = err?.code;
    const msg = String(err?.message || '');
    const cancelled =
        err?.userCancelled === true ||
        code === '1' ||
        code === 'PURCHASE_CANCELLED_ERROR' ||
        /cancel/i.test(msg);
    if (cancelled) return { cancelled: true, message: 'Satın alma iptal edildi.' };
    return { cancelled: false, message: 'Satın alma tamamlanamadı. Lütfen tekrar deneyin.' };
}

/**
 * Seçilen plana göre native IAP satın alma akışını başlatır.
 *
 * Başarılı olursa: anonim RC app_user_id döner.
 * Başarısız / iptal olursa: hata fırlatır — çağıran taraf kayıt yapmaz.
 *
 * Web/geliştirme ortamında store açılmaz, mock ID döner.
 */
export async function purchasePlan(planType: string): Promise<string> {
    if (!Capacitor.isNativePlatform()) {
        return 'dev_mock_customer_id';
    }

    const packageId = PLAN_TO_PACKAGE[planType] ?? 'starter';
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
        (p) => p.identifier === packageId,
    );

    if (!pkg) {
        throw new Error(`RevenueCat paketi bulunamadı: ${packageId}`);
    }

    const result = await Purchases.purchasePackage({ aPackage: pkg });

    // Entitlement aktif değilse satın alma doğrulanamadı demektir
    const entitlement = result.customerInfo.entitlements.active['active_subscription'];
    if (!entitlement) {
        throw new Error('Satın alma doğrulanamadı. Lütfen tekrar deneyin.');
    }

    // Anonim RC kullanıcı ID'sini döndür — kayıt sonrası logIn() ile gerçek ID'ye bağlanır
    return result.customerInfo.originalAppUserId;
}

/**
 * Kayıt tamamlandıktan sonra anonim RC kullanıcısını gerçek ownerId'ye bağlar.
 * RevenueCat satın alma geçmişini otomatik olarak transfer eder.
 */
export async function linkRevenueCatUser(ownerId: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await Purchases.logIn({ appUserID: ownerId });
}

/**
 * Kullanıcının mevcut aboneliğini mağazadan geri yükler.
 * Cihaz değişikliği veya uygulama yeniden yükleme senaryolarında kullanılır.
 */
export async function restoreRevenueCatPurchases(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await Purchases.restorePurchases();
}
