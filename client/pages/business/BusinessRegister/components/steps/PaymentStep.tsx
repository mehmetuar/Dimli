import React from 'react';
import { CheckCircle, Loader2, ShieldCheck } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../../hooks/useBusinessRegister';

interface PaymentStepProps {
    formData: any;
    isLoading: boolean;
    onSubmit: () => void;
}

export const PaymentStep: React.FC<PaymentStepProps> = ({ formData, isLoading, onSubmit }) => {
    const count = formData.selectedPitchCount;
    const plan = SUBSCRIPTION_PLANS[count] || SUBSCRIPTION_PLANS[5];

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-xl font-black text-white mb-1">Özet & Ödeme</h2>
                <p className="text-slate-400 text-sm">Bilgilerinizi kontrol edin ve başvurunuzu tamamlayın.</p>
            </div>

            {/* Abonelik özeti */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-black text-white text-lg">{plan.label} Plan</p>
                        <p className="text-slate-400 text-sm">
                            {count === 5 ? '5+ saha' : `${count} saha`}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="font-black text-orange-400 text-xl">
                            {plan.price.toLocaleString('tr-TR')} TL<span className="text-sm text-slate-400">/ay</span>
                        </p>
                    </div>
                </div>

                <div className="border-t border-slate-700 pt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="text-green-500 shrink-0" size={16} />
                        <span className="text-slate-300">İlk <strong className="text-white">3 ay ücretsiz</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="text-green-500 shrink-0" size={16} />
                        <span className="text-slate-300">4. aydan itibaren {plan.price.toLocaleString('tr-TR')} TL/ay</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="text-green-500 shrink-0" size={16} />
                        <span className="text-slate-300">İstediğin zaman iptal edebilirsin</span>
                    </div>
                </div>
            </div>

            {/* İşletme özeti */}
            <div className="bg-slate-800/50 rounded-xl p-4 space-y-1 text-sm">
                <p className="text-slate-400">İşletme: <span className="text-white font-bold">{formData.business.name}</span></p>
                <p className="text-slate-400">Konum: <span className="text-white font-bold">{formData.business.city} / {formData.business.district}</span></p>
                <p className="text-slate-400">Saha sayısı: <span className="text-white font-bold">{formData.pitches.length}</span></p>
            </div>

            {/* Güvenlik notu */}
            <div className="flex items-start gap-2 text-xs text-slate-500">
                <ShieldCheck size={14} className="shrink-0 mt-0.5 text-slate-400" />
                <span>
                    Başvurunuz admin ekibimiz tarafından 1-2 iş günü içinde incelenecektir.
                    Onay sonrası işletmeniz yayına alınacak ve abonelik süreci başlayacaktır.
                </span>
            </div>

            {/* Submit butonu */}
            <button
                onClick={onSubmit}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-900/30"
            >
                {isLoading ? (
                    <><Loader2 className="animate-spin" size={20} /> Gönderiliyor...</>
                ) : (
                    <><CheckCircle size={20} /> Başvuruyu Tamamla</>
                )}
            </button>
        </div>
    );
};
