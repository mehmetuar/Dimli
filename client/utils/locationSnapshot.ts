import { Capacitor, registerPlugin } from '@capacitor/core';

// §104 — LocationSnapshotPlugin (app-yerel Android mikro-plugin) JS köprüsü.
// iOS/web'de plugin kayıtlı DEĞİL → her çağrı hata verir → null/false döneriz
// (feature-detect; merdiven 0. basamağı sessizce atlanır, akış birebir eski hali).

interface LastKnownResult {
    latitude: number;
    longitude: number;
    accuracy: number;
    ageMs: number;
}

interface ProviderStatusResult {
    locationEnabled: boolean;
    gps: boolean;
    network: boolean;
}

interface LocationSnapshotPlugin {
    getLastKnown(options: { maxAgeMs: number }): Promise<LastKnownResult>;
    getProviderStatus(): Promise<ProviderStatusResult>;
}

const LocationSnapshot = registerPlugin<LocationSnapshotPlugin>('LocationSnapshot');

// Son bilinen konum (fused GMS önbelleği + framework kemeri). Yoksa/yaşlıysa null.
export const getLastKnownSnapshot = async (
    maxAgeMs: number,
): Promise<{ lat: number; lng: number } | null> => {
    if (Capacitor.getPlatform() !== 'android') return null;
    try {
        const res = await LocationSnapshot.getLastKnown({ maxAgeMs });
        if (typeof res?.latitude !== 'number' || typeof res?.longitude !== 'number') return null;
        return { lat: res.latitude, lng: res.longitude };
    } catch {
        return null; // NO_CACHED_LOCATION / PERMISSION_DENIED / plugin yok
    }
};

// "Konum AÇIK ama ağ sağlayıcısı KAPALI" (Google Konum Doğruluğu kapatılmış) tespiti.
// Kapalı mekânda GPS fix imkânsızken doğru yönlendirme kartını besler.
export const isNetworkProviderOff = async (): Promise<boolean> => {
    if (Capacitor.getPlatform() !== 'android') return false;
    try {
        const st = await LocationSnapshot.getProviderStatus();
        return st.locationEnabled === true && st.network === false;
    } catch {
        return false;
    }
};
