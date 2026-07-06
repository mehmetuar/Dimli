import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Network } from '@capacitor/network';
import api from '../services/api';
import { fetchCurrentUser } from '../services/currentUserStore';

// ─────────────────────────────────────────────────────────────────────────────
// Ağ durumu TEK KAYNAĞI. İki sinyal birleşir:
//  1) @capacitor/network eklentisi (uçak modu/Wi-Fi kopması ANINDA bildirir;
//     web/dev'de navigator.onLine fallback'i ile çalışır),
//  2) axios sonuçları (her başarılı yanıt = online teyidi; ERR_NETWORK = offline —
//     "Wi-Fi var ama internet/sunucu yok" durumunu eklenti göremez, axios görür).
// ECONNABORTED (timeout) offline SAYILMAZ: Render cold-start 30-50sn sürebilir,
// yanlış banner basılmasın. Offline'dayken 12 sn'de bir hafif probe atılır;
// eklentinin "connected" event'i de probe'u hemen tetikler (önce probe, sonra
// online — yeşil onay yanlış-pozitif basılmaz).
// Okuma yolları: banner/boş-durumlar useNetwork().isOnline; sayfa hook'ları
// yeniden-bağlanma yenilemesi için useOnReconnect ('network:reconnected' event).
// ─────────────────────────────────────────────────────────────────────────────

interface NetworkContextValue {
    isOnline: boolean;              // cihaz ağı var VE sunucuya erişilebiliyor
    lastReconnectAt: number | null; // son offline→online geçişi (ms)
}

const NetworkContext = createContext<NetworkContextValue>({
    isOnline: true,
    lastReconnectAt: null,
});

const PROBE_INTERVAL_MS = 12_000;

export function NetworkProvider({ children }: { children: React.ReactNode }) {
    // İyimser başlangıç: açılışta banner flash'ı olmasın; gerçek durum
    // Network.getStatus() + ilk isteklerle saniyeler içinde netleşir.
    const [isOnline, setIsOnline] = useState(true);
    const [lastReconnectAt, setLastReconnectAt] = useState<number | null>(null);
    const isOnlineRef = useRef(true);

    useEffect(() => {
        let disposed = false;

        const goOnline = () => {
            if (disposed || isOnlineRef.current) return; // yalnız false→true geçişi
            isOnlineRef.current = true;
            setIsOnline(true);
            setLastReconnectAt(Date.now());
            // Sayfa hook'ları (useOnReconnect) kendi listelerini tazeler;
            // ortak profil de burada merkezî tazelenir.
            window.dispatchEvent(new CustomEvent('network:reconnected'));
            void fetchCurrentUser({ force: true });
        };

        const goOffline = () => {
            if (disposed || !isOnlineRef.current) return;
            isOnlineRef.current = false;
            setIsOnline(false);
        };

        // Hafif erişilebilirlik yoklaması: HERHANGİ bir HTTP yanıtı (404 dahil)
        // = sunucuya erişiliyor → fulfilled interceptor goOnline'ı tetikler.
        // Yanıt yoksa catch sessiz — offline kalınır.
        const probe = () => {
            api.get('/', { timeout: 5000, validateStatus: () => true }).catch(() => { /* offline sürüyor */ });
        };

        // 1) Eklenti sinyali
        const listenerHandle = Network.addListener('networkStatusChange', (status) => {
            if (status.connected) probe();
            else goOffline();
        });
        void Network.getStatus().then((status) => {
            if (!status.connected) goOffline();
        }).catch(() => { /* eklenti yoksa (eski build) axios sinyali tek başına yeter */ });

        // 2) Axios sinyali — response'lara dokunmadan geçirir (mevcut auth
        //    interceptor'ından bağımsız ikinci interceptor; cleanup'ta eject →
        //    StrictMode çift-effect'te birikmez).
        const interceptorId = api.interceptors.response.use(
            (response) => {
                goOnline();
                return response;
            },
            (error) => {
                if (!error.response && error.code === 'ERR_NETWORK') goOffline();
                return Promise.reject(error);
            },
        );

        // 3) verifyAxios boşluğu (api.ts auth doğrulaması ayrı instance)
        const onApiNetworkError = () => goOffline();
        window.addEventListener('network:apiNetworkError', onApiNetworkError);

        // Offline'dayken periyodik kurtarma yoklaması
        const intervalId = setInterval(() => {
            if (!isOnlineRef.current) probe();
        }, PROBE_INTERVAL_MS);

        return () => {
            disposed = true;
            void listenerHandle.then((h) => h.remove());
            api.interceptors.response.eject(interceptorId);
            window.removeEventListener('network:apiNetworkError', onApiNetworkError);
            clearInterval(intervalId);
        };
    }, []);

    return (
        <NetworkContext.Provider value={{ isOnline, lastReconnectAt }}>
            {children}
        </NetworkContext.Provider>
    );
}

export function useNetwork(): NetworkContextValue {
    return useContext(NetworkContext);
}
