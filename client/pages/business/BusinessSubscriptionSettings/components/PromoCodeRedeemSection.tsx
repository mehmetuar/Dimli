import React from 'react';
import { Ticket } from 'lucide-react';

interface PromoCodeRedeemSectionProps {
    promoCode: string;
    setPromoCode: (v: string) => void;
    loading: boolean;
    onRedeem: () => void;
}

// Davet/partner kodu girişi — davetli üyelik dışındaki tüm durumlarda görünür
// (aktif, deneme, süresi dolmuş, iptal). Dil: yalnız "davet kodu / erişim".
export const PromoCodeRedeemSection: React.FC<PromoCodeRedeemSectionProps> = ({
    promoCode, setPromoCode, loading, onRedeem,
}) => (
    <div className="bg-slate-800 rounded-3xl border border-slate-700 p-5 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                <Ticket className="w-5 h-5 text-sky-400" />
            </div>
            <div className="min-w-0">
                <p className="font-bold text-white text-sm">Davet Kodu</p>
                <p className="text-slate-400 text-xs">İş ortağı kodunla ücretsiz erişim</p>
            </div>
        </div>
        <div className="flex gap-2">
            <input
                type="text"
                value={promoCode}
                onChange={e => setPromoCode(e.target.value)}
                placeholder="DIMLI-XXXXXXXX"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 min-w-0 bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 font-mono tracking-wide focus:outline-none focus:border-sky-500/60"
            />
            <button
                type="button"
                onClick={onRedeem}
                disabled={loading || !promoCode.trim()}
                className="shrink-0 bg-sky-700 hover:bg-sky-600 text-white px-4 rounded-xl font-black text-sm transition-all disabled:opacity-50"
            >
                {loading ? '...' : 'Uygula'}
            </button>
        </div>
    </div>
);
