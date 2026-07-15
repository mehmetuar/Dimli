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
export const ComplimentaryExpiryBanner: React.FC<ComplimentaryExpiryBannerProps> = ({
    subscription, purchaseLoading, onBuy,
}) => {
    if (subscription?.status !== 'complimentary' || !subscription?.complimentaryUntil) return null;

    const until = new Date(subscription.complimentaryUntil);
    const daysLeft = Math.ceil((until.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysLeft > 30) return null;

    const plan = Object.values(SUBSCRIPTION_PLANS).find(
        (pl) => pl.planType === subscription.planType,
    );
    const dateStr = until.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

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
