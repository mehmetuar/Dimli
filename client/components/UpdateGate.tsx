import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download } from 'lucide-react';
import { useBootSplashDone } from '../services/bootSplashStore';
import {
    initUpdateGate,
    openStoreForUpdate,
    useUpdateRequired,
} from '../services/updateGateStore';
import { useModalBodyClass } from '../utils/useModalBodyClass';

/**
 * Zorunlu güncelleme kapısı — mağazada yeni sürüm varken eski sürümü tamamen
 * kilitler (agent.md §69). Kurallar:
 * - Provider ağacının KARDEŞİ olarak mount edilir (App.tsx): context/auth/router
 *   gerektirmez, login dahil her ekranı örter. Kontrol ağ çağrısı splash oynarken
 *   paralel koşar; UI perde bitene kadar (useBootSplashDone, §67) GÖSTERİLMEZ.
 * - createPortal(document.body) zorunlu (§35). z-[9998]: tüm modalların (≤90)
 *   üstünde, AnimatedSplash'in (9999) altında.
 * - Boot yolunda duvar-saatli CSS animasyonu YASAK (§66) → tamamen statik,
 *   animate-fade-in bilinçli olarak YOK.
 * - Kapatma yolu yok: X yok, backdrop dokunuşu kapatmaz. Android geri tuşuna
 *   müdahale GEREKMEZ — App.tsx'teki handler ya portalin ARKASINDA history.back
 *   yapar (kapı route-bağımsız, kalır) ya kök route'ta exitApp eder (yeniden
 *   açılışta kapı geri gelir); iki yol da kapıyı bypass edemez.
 */
export const UpdateGate: React.FC = () => {
    const required = useUpdateRequired();
    const splashDone = useBootSplashDone();
    const visible = required && splashDone;

    useEffect(() => {
        initUpdateGate(); // idempotent — StrictMode/yeniden mount güvenli
    }, []);

    useModalBodyClass(visible);

    if (!visible) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center px-4 bg-black/90 backdrop-blur-sm">
            <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-700 bg-slate-900">
                    <h2 className="font-sport font-black text-lg text-white italic uppercase tracking-wide text-center">
                        YENİ <span className="text-turf-500">SÜRÜM</span>
                    </h2>
                </div>
                <div className="p-6 space-y-4 text-center">
                    <Download className="w-10 h-10 text-turf-500 mx-auto" />
                    <p className="text-slate-300 text-sm">
                        Dimli'nin yeni bir sürümü yayında. Devam etmek için
                        uygulamayı güncellemen gerekiyor.
                    </p>
                    <button
                        onClick={() => void openStoreForUpdate()}
                        className="w-full bg-turf-600 hover:bg-turf-500 text-white font-bold py-3 rounded-xl shadow-neon transition-colors"
                    >
                        Şimdi Güncelle
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
};
