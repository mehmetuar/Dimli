import React, { useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useKeyboardHeight } from '../../utils/useKeyboardHeight';

interface AuthWizardLayoutProps {
    step: number;
    totalSteps: number;
    /** Adım başlığı (BÜYÜK, font-sport italic) */
    title: string;
    subtitle?: string;
    /** Geri oku — undefined ise ok gizlenir (ör. OTP tüketildikten sonra) */
    onBack?: () => void;
    /** Üst hata bandı — değişince shake yeniden oynar (key={error}) */
    error?: string;
    /** Alt aksiyon bölgesi (İleri/Tamamla butonu vb.) — klavye üstünde durur */
    footer?: React.ReactNode;
    /** Vurgu rengi — progress bar (müşteri=turf yeşil, işletme=orange turuncu) */
    accent?: 'turf' | 'orange';
    children: React.ReactNode;
}

/**
 * Müşteri auth sihirbazlarının (Kayıt + Şifremi Unuttum) ortak TAM SAYFA kabuğu.
 * Login'in kanıtlanmış full-bleed reçetesi: kök fixed + negatif safe-area taşması ile
 * gradient kenardan kenara boyanır; içerik env() padding ile korunur. Kart YOK.
 * - Orta bölge TEK scroll konteyner (klavye kuralı: her input scrollable ancestor içinde).
 * - Footer akış-içi (fixed değil): klavye açılınca paddingBottom=keyboardHeight →
 *   buton klavyenin üstünde kalır, flex-1 scroll alanı otomatik daralır
 *   (capacitor resize:'none' — klavye WebView'i yeniden boyutlamaz).
 * - Adım içeriği key={step} + animate-step-in: kurumsal-sade geçişin TEK kaynağı
 *   (adım bileşenlerinin köküne ayrıca animasyon sınıfı KOYMA — çift animasyon olur).
 */
export const AuthWizardLayout: React.FC<AuthWizardLayoutProps> = ({
    step, totalSteps, title, subtitle, onBack, error, footer, accent = 'turf', children,
}) => {
    const keyboardHeight = useKeyboardHeight();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll konteyner adımlar boyunca yaşar — her adımda başa dön.
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 });
    }, [step]);

    return (
        <div
            className="fixed left-0 right-0 w-full bg-gradient-to-b from-pitch-surface to-pitch overflow-hidden flex flex-col"
            style={{
                top: 'calc(-1 * env(safe-area-inset-top))',
                bottom: 'calc(-1 * env(safe-area-inset-bottom))',
            }}
        >
            <div
                className="relative flex-1 w-full min-h-0 flex flex-col"
                style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                {/* ── Üst bölge: geri oku + logo + adım sayacı + progress + başlık ── */}
                {/* Üst boşluk safe-area inset'ine EK: min 34px — geri oku/sayaç hiçbir
                    cihazda status bar (saat/pil/wifi) ile çakışmasın, rahat tıklansın. */}
                <header
                    className="flex-shrink-0 w-full max-w-md mx-auto"
                    style={{ padding: 'clamp(34px, 5.5vh, 52px) clamp(16px, 5vw, 32px) 0' }}
                >
                    <div className="flex items-center justify-between">
                        {onBack ? (
                            <button
                                type="button"
                                onClick={onBack}
                                aria-label="Geri"
                                className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full text-slate-400 active:text-white active:scale-90 transition-all"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                        ) : (
                            <span className="w-11 h-11 -ml-2" />
                        )}
                        <img
                            src="/icon.png"
                            alt="DİMLİ"
                            className="w-auto object-contain"
                            style={{ height: 'clamp(28px, 4.5vh, 40px)' }}
                        />
                        <span
                            key={step}
                            className="w-11 text-right font-display font-bold text-slate-400 animate-fade-in"
                            style={{ fontSize: 'clamp(0.8rem, 2vh, 0.95rem)' }}
                        >
                            {step}/{totalSteps}
                        </span>
                    </div>

                    <div className="h-1.5 bg-slate-700/60 rounded-full mt-3 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ease-out ${accent === 'orange' ? 'bg-orange-500' : 'bg-turf-500'}`}
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        />
                    </div>

                    <h1
                        className="font-sport font-black italic text-white uppercase mt-4 leading-tight"
                        style={{ fontSize: 'clamp(1.25rem, 3.2vh, 1.75rem)' }}
                    >
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-slate-400 mt-1" style={{ fontSize: 'clamp(0.75rem, 1.9vh, 0.875rem)' }}>
                            {subtitle}
                        </p>
                    )}
                </header>

                {/* ── Orta: TEK scroll konteyner — tüm inputlar burada ── */}
                <main ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-hide w-full">
                    <div
                        className="w-full max-w-md mx-auto"
                        style={{ padding: 'clamp(12px, 2.5vh, 20px) clamp(16px, 5vw, 32px) 24px' }}
                    >
                        {error && (
                            <div
                                key={error}
                                className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-4 text-sm font-bold text-center animate-shake"
                            >
                                {error}
                            </div>
                        )}
                        <div key={step} className="animate-step-in">
                            {children}
                        </div>
                    </div>
                </main>

                {/* ── Alt aksiyon bölgesi: klavye üstünde duran akış-içi footer ── */}
                {footer && (
                    <footer
                        className="flex-shrink-0 w-full max-w-md mx-auto"
                        style={{
                            padding: '10px clamp(16px, 5vw, 32px)',
                            paddingBottom: keyboardHeight > 0
                                ? keyboardHeight
                                : 'max(12px, env(safe-area-inset-bottom))',
                        }}
                    >
                        {footer}
                    </footer>
                )}
            </div>
        </div>
    );
};
