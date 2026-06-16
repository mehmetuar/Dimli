import React from 'react';
import { Sparkles, Star, Loader2 } from 'lucide-react';

interface NoSubscriptionCTAProps {
    purchaseLoading: boolean;
    onOpenPicker: () => void;
}

export const NoSubscriptionCTA: React.FC<NoSubscriptionCTAProps> = ({ purchaseLoading, onOpenPicker }) => (
    <div className="bg-slate-800 border border-orange-500/20 rounded-3xl p-6 text-center">
        <div className="w-18 h-18 mx-auto mb-5 w-20 h-20 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Sparkles className="w-9 h-9 text-orange-400" />
        </div>
        <h2 className="font-bold text-xl text-white mb-2">Henüz Aboneliğiniz Yok</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
            İşletmenizi sahalar listesinde göstermek ve rezervasyon almak için bir plan seçin.{' '}
            <span className="text-orange-400 font-semibold">90 gün ücretsiz deneme</span> ile hemen başlayın.
        </p>
        <button
            onClick={onOpenPicker}
            disabled={purchaseLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2.5"
        >
            {purchaseLoading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <Star className="w-5 h-5" />}
            {purchaseLoading ? 'İşleniyor…' : 'Plan Seç ve Başla'}
        </button>
    </div>
);
