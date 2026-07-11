import { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import {
    AppUpdate,
    AppUpdateAvailability,
    AppUpdateResultCode,
} from '@capawesome/capacitor-app-update';
import { isVersionNewer } from '../utils/appVersion';

/**
 * Zorunlu güncelleme kapısı — mağaza-sürümü bazlı (bootSplashStore deseni:
 * modül-scope store + useSyncExternalStore; context/auth/router gerektirmez).
 *
 * Karar kaynakları:
 * - Android: Play Core `updateAvailability` OTORİTERDİR — versionCode, kademeli
 *   yayın yüzdesi ve cihaz uyumluluğunu cihaz-başına bilir; string karşılaştırma yok.
 * - iOS: iTunes lookup (bundleId, country=tr ZORUNLU — verilmezse ABD vitrini →
 *   0 sonuç → kalıcı sessiz fail-open). Native taraf .numeric karşılaştırır; JS
 *   tarafında isVersionNewer ile çifte kontrol yapılır (uyuşmazlık → fail-open).
 *
 * FAIL-OPEN İLKESİ (asla brick yok): offline / timeout / lookup boş / Play Services
 * yok / sideload-debug build / parse hatası / cihaz minimumOsVersion altında →
 * kapı GÖSTERİLMEZ, kullanıcı normal devam eder. Tek engelleme koşulu: mağaza
 * "güncelleme var" diyor VE (iOS'ta) sürüm gerçekten daha yeni VE cihaz kurabilir.
 */

const IOS_APP_STORE_ID = '6764278538'; // apps.apple.com/app/id... (App Store Connect)
const RECHECK_MIN_INTERVAL_MS = 30 * 60 * 1000; // resume başına en fazla 30 dk'da bir

// Monoton true: bir kez "güncelleme zorunlu" olunca oturum boyunca öyle kalır
// (güncelleme kurulunca uygulama zaten yeniden başlar → state sıfırlanır).
let updateRequired = false;
let immediateAllowed = false; // Android: performImmediateUpdate denenebilir mi
let initialized = false;
let lastCheckAt = 0;
const listeners = new Set<() => void>();

function notify(): void {
    listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useUpdateRequired(): boolean {
    return useSyncExternalStore(subscribe, () => updateRequired);
}

/** WKWebView UA'sından cihaz iOS ana sürümünü çeker; parse edilemezse null. */
function getIosMajorMinor(): string | null {
    const m = /OS (\d+)_(\d+)/.exec(navigator.userAgent);
    return m ? `${m[1]}.${m[2]}` : null;
}

async function runCheck(): Promise<void> {
    if (updateRequired) return; // kapı zaten aktif — tekrar sormaya gerek yok
    if (Date.now() - lastCheckAt < RECHECK_MIN_INTERVAL_MS) return;
    lastCheckAt = Date.now();

    const platform = Capacitor.getPlatform();
    let info;
    try {
        info = await AppUpdate.getAppUpdateInfo(
            platform === 'ios' ? { country: 'tr' } : undefined,
        );
    } catch (e) {
        // Offline, mağaza erişilemedi, Play Services yok, sideload/debug build…
        // Hepsi fail-open: kullanıcıyı ASLA engelleme.
        console.warn('[updateGate] check failed (fail-open):', e);
        return;
    }

    if (info.updateAvailability !== AppUpdateAvailability.UPDATE_AVAILABLE) return;

    if (platform === 'ios') {
        // Çifte kontrol: lookup'ın verdiği sürüm gerçekten daha mı yeni?
        if (!isVersionNewer(info.availableVersionName, info.currentVersionName)) {
            return;
        }
        // Anti-brick: cihaz, yeni sürümün istediği iOS'un ALTINDAYSA güncellemeyi
        // kuramaz — engellemek cihazı kalıcı kilitlerdi. UA parse edilemezse
        // uyumlu say (çoğunluk-doğru).
        const deviceOs = getIosMajorMinor();
        if (
            deviceOs &&
            info.minimumOsVersion &&
            isVersionNewer(info.minimumOsVersion, deviceOs)
        ) {
            console.warn(
                `[updateGate] cihaz iOS ${deviceOs} < minimum ${info.minimumOsVersion} — kapı gösterilmiyor (fail-open)`,
            );
            return;
        }
    } else {
        immediateAllowed = info.immediateUpdateAllowed === true;
    }

    updateRequired = true;
    notify();
}

/**
 * Idempotent başlatıcı (StrictMode-güvenli). İlk kontrol hemen ateşlenir —
 * splash perdesi oynarken ağ çağrısı paralel koşar, yalnız UI perdeyi bekler
 * (UpdateGate `useBootSplashDone` ile). Resume'da (appStateChange active)
 * 30 dk throttle ile yeniden kontrol: günlerce açık kalan oturum da eninde
 * sonunda kapılanır. Listener App.tsx'tekilerden AYRIDIR (Capacitor çoklu
 * listener destekler) ve JS oturumu boyunca yaşar — store ile aynı ömür.
 */
export function initUpdateGate(): void {
    if (initialized) return;
    initialized = true;
    if (!Capacitor.isNativePlatform()) return; // web dev sunucusu: tam no-op

    void runCheck();
    void CapApp.addListener('appStateChange', (state) => {
        if (state.isActive) void runCheck();
    });
}

/**
 * CTA: kullanıcıyı güncellemeye götürür. Her yol try/catch — başarısızlıkta
 * kapı açık kalır (kullanıcı tekrar dokunur), asla crash yok.
 */
export async function openStoreForUpdate(): Promise<void> {
    try {
        if (Capacitor.getPlatform() === 'ios') {
            // Repo deseni (BusinessSubscriptionSettings/utils.ts): '_system'
            // mağaza uygulamasına devreder; plugin davranışından bağımsız.
            window.open(
                `itms-apps://apps.apple.com/app/id${IOS_APP_STORE_ID}`,
                '_system',
            );
            return;
        }
        // Android: önce native tam-ekran Play güncelleme akışı (uygulamadan
        // çıkmadan indirir/kurar); olmazsa mağaza sayfası (native market:// →
        // https fallback'i plugin içinde — JS window.open bunu yapamaz).
        if (immediateAllowed) {
            try {
                const result = await AppUpdate.performImmediateUpdate();
                if (result.code === AppUpdateResultCode.OK) return;
            } catch (e) {
                console.warn('[updateGate] immediate update başarısız, mağazaya düşülüyor:', e);
            }
        }
        await AppUpdate.openAppStore();
    } catch (e) {
        console.warn('[updateGate] mağaza açılamadı:', e);
    }
}
