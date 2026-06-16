import React from 'react';
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { openStoreSubscriptions } from '../utils';

interface SubscriptionActionButtonsProps {
    isExpiredOrCancelled: boolean;
    isActive: boolean;
    purchaseLoading: boolean;
    restoreLoading: boolean;
    onOpenPicker: () => void;
    onRestorePurchases: () => void;
}

export const SubscriptionActionButtons: React.FC<SubscriptionActionButtonsProps> = ({
    isExpiredOrCancelled, isActive, purchaseLoading, restoreLoading, onOpenPicker, onRestorePurchases,
}) => (
    <div className="space-y-3">
        <button
            onClick={onOpenPicker}
            disabled={purchaseLoading}
            className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2.5 active:scale-95
                ${isExpiredOrCancelled
                    ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-slate-800 border border-emerald-500/30 text-emerald-400 hover:bg-slate-700'
                }`}
        >
            {purchaseLoading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <CreditCard className="w-5 h-5" />}
            {purchaseLoading
                ? 'İşleniyor…'
                : isExpiredOrCancelled ? 'Yeniden Abone Ol' : 'Planı Yükselt / Satın Al'}
        </button>

        {Capacitor.getPlatform() === 'ios' && (
            <button
                onClick={onRestorePurchases}
                disabled={restoreLoading}
                className="w-full py-3.5 rounded-2xl font-medium text-sm transition-all bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
            >
                {restoreLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : 'Satın Alımları Geri Yükle'}
            </button>
        )}

        {isActive && (
            <button
                onClick={openStoreSubscriptions}
                className="w-full py-3.5 rounded-2xl font-medium text-sm transition-all bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 flex items-center justify-center gap-2 active:scale-95"
            >
                <ExternalLink className="w-4 h-4" />
                {Capacitor.getPlatform() === 'ios'
                    ? 'App Store\'dan İptal Et'
                    : 'Mağazadan İptal Et'}
            </button>
        )}
    </div>
);
