import React, { useState } from 'react';
import { CheckCircle, ShieldCheck, CreditCard, Building2, Ticket, X } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../../hooks/useBusinessRegister';
import { RegisterSection } from '../RegisterSection';
import { PromoCodeModal } from '../../../../../components/Modals/PromoCodeModal';

interface PaymentStepProps {
    formData: any;
    eulaAccepted: boolean;
    setEulaAccepted: (v: boolean) => void;
    // Davet kodu
    promoCode: string;
    setPromoCode: (v: string) => void;
    promoStatus: 'idle' | 'checking' | 'applied' | 'invalid';
    promoDurationMonths: number | null;
    promoError: string;
    applyPromoCode: () => Promise<boolean>;
    clearPromoCode: () => void;
}

// Submit butonu + hata bandı artık kabuk (AuthWizardLayout) tarafında; burada yalnız özet + onay.
// Not: kök öğeye animasyon sınıfı KOYMA — AuthWizardLayout içeriği `animate-step-in` ile sarar.
export const PaymentStep: React.FC<PaymentStepProps> = ({
    formData, eulaAccepted, setEulaAccepted,
    promoCode, setPromoCode, promoStatus, promoDurationMonths, promoError,
    applyPromoCode, clearPromoCode,
}) => {
    const [showPromoModal, setShowPromoModal] = useState(false);
    const count = formData.selectedPitchCount;
    const plan = SUBSCRIPTION_PLANS[count] || SUBSCRIPTION_PLANS[5];
    const promoApplied = promoStatus === 'applied';

    const durationText =
        promoDurationMonths == null
            ? 'Süresiz ücretsiz erişim'
            : `${promoDurationMonths} ay boyunca ücretsiz erişim`;

    const benefits: React.ReactNode[] = [
        <>İlk <strong className="text-white">3 ay ücretsiz</strong></>,
        <>4. aydan itibaren {plan.price.toLocaleString('tr-TR')} TL/ay</>,
        <>İstediğin zaman iptal edebilirsin</>,
    ];

    return (
        <div className="space-y-6">
            {/* Abonelik özeti */}
            <RegisterSection icon={CreditCard} title="Abonelik" desc="Seçtiğin plan" bare>
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
                    <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                            <p className="font-black text-white" style={{ fontSize: 'clamp(1rem, 2.6vh, 1.15rem)' }}>{plan.label} Plan</p>
                            <p className="text-slate-400" style={{ fontSize: 'clamp(0.72rem, 1.8vh, 0.85rem)' }}>
                                {count === 5 ? '5+ saha' : `${count} saha`}
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            {promoApplied ? (
                                <span className="inline-block text-[11px] font-black px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                    Davet kodu uygulandı
                                </span>
                            ) : (
                                <p className="font-black text-orange-400 whitespace-nowrap" style={{ fontSize: 'clamp(1rem, 4.5vw, 1.25rem)' }}>
                                    {plan.price.toLocaleString('tr-TR')} TL<span className="text-sm text-slate-400">/ay</span>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-slate-700 pt-4 space-y-2">
                        {promoApplied ? (
                            <div className="flex items-center gap-2" style={{ fontSize: 'clamp(0.8rem, 2vh, 0.9rem)' }}>
                                <CheckCircle className="text-sky-400 shrink-0" size={16} />
                                <span className="text-slate-300">{durationText}</span>
                            </div>
                        ) : (
                            benefits.map((node, i) => (
                                <div key={i} className="flex items-center gap-2" style={{ fontSize: 'clamp(0.8rem, 2vh, 0.9rem)' }}>
                                    <CheckCircle className="text-green-500 shrink-0" size={16} />
                                    <span className="text-slate-300">{node}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </RegisterSection>

            {/* Davet Kodu */}
            <RegisterSection icon={Ticket} title="Davet Kodu" desc="İş ortağı kodun varsa" bare>
                <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
                    {promoApplied ? (
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
                                <Ticket className="w-4 h-4 text-sky-300" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-white font-bold text-sm truncate">{promoCode}</p>
                                <p className="text-sky-300/80 text-xs">{durationText}</p>
                            </div>
                            <button
                                type="button"
                                onClick={clearPromoCode}
                                className="text-slate-400 hover:text-slate-200 transition-colors p-1 shrink-0"
                                aria-label="Kodu kaldır"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className="text-slate-400 text-xs mb-3">
                                İş ortaklarımızdan aldığın bir davet kodun varsa uygulayabilirsin.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowPromoModal(true)}
                                className="w-full flex items-center justify-center gap-2 bg-slate-700/60 hover:bg-slate-700 border border-slate-600/60 text-white py-2.5 rounded-xl font-black text-sm transition-all"
                            >
                                <Ticket className="w-4 h-4 text-sky-300" /> Davet Kodu Kullan
                            </button>
                        </>
                    )}
                </div>
            </RegisterSection>

            <PromoCodeModal
                isOpen={showPromoModal}
                onClose={() => setShowPromoModal(false)}
                code={promoCode}
                setCode={setPromoCode}
                loading={promoStatus === 'checking'}
                error={promoStatus === 'invalid' ? promoError : undefined}
                onSubmit={applyPromoCode}
            />

            {/* İşletme özeti */}
            <RegisterSection icon={Building2} title="İşletme Özeti" bare>
                <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-4 space-y-2 shadow-[0_8px_30px_rgba(0,0,0,0.15)]" style={{ fontSize: 'clamp(0.8rem, 2vh, 0.9rem)' }}>
                    <p className="text-slate-400">İşletme: <span className="text-white font-bold">{formData.business.name}</span></p>
                    <p className="text-slate-400">Konum: <span className="text-white font-bold">{formData.business.city} / {formData.business.district}</span></p>
                    <p className="text-slate-400">Saha sayısı: <span className="text-white font-bold">{formData.pitches.length}</span></p>
                </div>
            </RegisterSection>

            {/* Güvenlik notu */}
            <div className="flex items-start gap-3 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3.5">
                <div className="w-9 h-9 rounded-xl bg-slate-600/30 border border-slate-500/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-slate-300" />
                </div>
                <span className="text-xs text-slate-400 leading-relaxed">
                    Başvurunuz ekibimiz tarafından 1-2 iş günü içinde incelenecektir. Onay sonrası işletmeniz yayına alınacak ve abonelik süreci başlayacaktır.
                </span>
            </div>

            {/* Apple 1.2 — EULA onayı kayıt öncesi zorunlu (submit footer'da disabled tutar) */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={eulaAccepted}
                    onChange={e => setEulaAccepted(e.target.checked)}
                    className="mt-0.5 w-5 h-5 accent-orange-500 shrink-0"
                />
                <span className="text-slate-400 text-xs leading-relaxed">
                    <button
                        type="button"
                        onClick={() => window.open('https://dimli.com.tr/kullanim-sartlari', '_system')}
                        className="text-orange-400 underline underline-offset-2"
                    >
                        Kullanım Şartları
                    </button>'nı ve{' '}
                    <button
                        type="button"
                        onClick={() => window.open('https://dimli.com.tr/kvkk', '_system')}
                        className="text-orange-400 underline underline-offset-2"
                    >
                        Gizlilik Politikası
                    </button>'nı okudum, kabul ediyorum.
                </span>
            </label>
        </div>
    );
};
