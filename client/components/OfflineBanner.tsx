import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { WifiOff, CheckCircle } from 'lucide-react';
import { useNetwork } from '../contexts/NetworkContext';

// ─────────────────────────────────────────────────────────────────────────────
// Global çevrimdışı şeridi (FB/IG deseni): çevrimdışıyken kalıcı kırmızı şerit,
// bağlantı dönünce 2 sn yeşil "Bağlandı" onayı. Ekranın EN ÜSTÜNDE overlay —
// layout push DEĞİL (sayfalar fixed inset-0 desenli; push her sayfaya tek tek
// padding gerektirirdi). z-[55]: sayfa başlıkları/Navbar/zil (z-50) üstü,
// modallar (z-[60]+) altı. pointer-events-none: salt bilgi, altındaki zil
// butonu dokunulabilir kalır. createPortal(document.body) — agent.md §35.
// Safe-area: yalnız env(...) — max(...,20px) Android'de hayalet boşluk yaratır
// (Android'de status bar overlay değil, inset=0; iOS'ta çentik arkası boyanır).
// ─────────────────────────────────────────────────────────────────────────────

type Phase = 'hidden' | 'offline' | 'reconnected';

export const OfflineBanner: React.FC = () => {
    const { isOnline } = useNetwork();
    const [phase, setPhase] = useState<Phase>('hidden');
    const wasOfflineRef = useRef(false);

    useEffect(() => {
        if (!isOnline) {
            wasOfflineRef.current = true;
            setPhase('offline');
            return;
        }
        // online: yalnız gerçekten offline GÖRÜLDÜYSE yeşil onay göster
        if (!wasOfflineRef.current) return;
        wasOfflineRef.current = false;
        setPhase('reconnected');
        const timer = setTimeout(() => setPhase('hidden'), 2000);
        return () => clearTimeout(timer); // StrictMode + hızlı flip-flop güvenliği
    }, [isOnline]);

    const visible = phase !== 'hidden';

    return createPortal(
        <div
            className={`fixed top-0 left-0 right-0 z-[55] pointer-events-none transition-transform duration-300 ${
                visible ? 'translate-y-0' : '-translate-y-full'
            } ${phase === 'reconnected' ? 'bg-green-600 text-white' : 'bg-red-900 text-red-100'}`}
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
            <div className="h-7 flex items-center justify-center gap-1.5 text-[11px] font-bold">
                {phase === 'reconnected' ? (
                    <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Bağlandı</span>
                    </>
                ) : (
                    <>
                        <WifiOff className="w-3.5 h-3.5" />
                        <span>İnternet bağlantısı yok</span>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
};
