import React from 'react';
import { AlertTriangle, CreditCard, Loader2 } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../../BusinessRegister/hooks/useBusinessRegister';
import { formatPrice } from '../utils';

interface ComplimentaryExpiryBannerProps {
    subscription: any;
    purchaseLoading: boolean;
    onBuy: () => void;
}

// Süreli davetli üyeliğin bitişine ≤30 gün kalınca: kesintisiz devam için mevcut
// planı satın almaya yönlendirir. Süresiz (complimentaryUntil=null) üyelikte veya
// 30 günden fazla kalınca gösterilmez. Satın alma native IAP onayı ister.
// GRACE (ödeme penceresi): davetli süre bitmiş, sunucu 1 haftalık pencere açmış
// (graceUntil dolu) → acil kırmızı varyant; süre bilgisi graceUntil'den okunur.
export const ComplimentaryExpiryBanner: React.FC<ComplimentaryExpiryBannerProps> = ({
    subscription, purchaseLoading, onBuy,
}) => {
    if (subscription?.status !== 'complimentary') return null;

    const inGrace = !!subscription?.graceUntil;
    if (!inGrace && !subscription?.complimentaryUntil) return null;

    const until = new Date(inGrace ? subscription.graceUntil : subscription.complimentaryUntil);
    const daysLeft = Math.ceil((until.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (!inGrace && daysLeft > 30) return null;

    const plan = Object.values(SUBSCRIPTION_PLANS).find(
        (pl) => pl.planType === subscription.planType,
    );
    const dateStr = until.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    if (inGrace) {
        return (
            <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-red-300 font-bold text-sm">Ödeme pencereniz işliyor</p>
                        <p className="text-red-200/80 text-xs leading-relaxed mt-0.5">
                            Davetli üyeliğin sona erdi — {dateStr} tarihine kadar Abonelik & Planlar
                            sayfasından satın almanızı tamamlamanız gerekli. Aksi takdirde işletmen
                            müşterilere kapanacak.
                        </p>
                    </div>
                </div>
                <button
                    onClick={onBuy}
                    disabled={purchaseLoading}
                    className="w-full py-3.5 rounded-2xl font-bold transition-all flex items-center justify-center gap-2.5 active:scale-95 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 disabled:opacity-60"
                >
                    {purchaseLoading
                        ? <Loader2 className="w-5 h-5 animate-spin" />
                        : <CreditCard className="w-5 h-5" />}
                    {purchaseLoading
                        ? 'İşleniyor…'
                        : plan
                            ? `Planını Satın Al (${formatPrice(plan.price)}/ay)`
                            : 'Planını Satın Al'}
                </button>
            </div>
        );
    }

    return (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                </div>
                <div className="min-w-0">
                    <p className="text-orange-300 font-bold text-sm">Davetli üyeliğin sona eriyor</p>
                    <p className="text-orange-200/80 text-xs leading-relaxed mt-0.5">
                        {daysLeft <= 0
                            ? 'Ücretsiz erişimin bugün sona eriyor.'
                            : `Ücretsiz erişimin ${dateStr} tarihinde (${daysLeft} gün) sona erecek.`}{' '}
                        Sahaların yayında kalması için planını şimdi satın alabilirsin.
                    </p>
                </div>
            </div>
            <button
                onClick={onBuy}
                disabled={purchaseLoading}
                className="w-full py-3.5 rounded-2xl font-bold transition-all flex items-center justify-center gap-2.5 active:scale-95 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 disabled:opacity-60"
            >
                {purchaseLoading
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <CreditCard className="w-5 h-5" />}
                {purchaseLoading
                    ? 'İşleniyor…'
                    : plan
                        ? `Planını Satın Al (${formatPrice(plan.price)}/ay)`
                        : 'Planını Satın Al'}
            </button>
        </div>
    );
};
