import React from 'react';
import { Ticket, ChevronRight } from 'lucide-react';

interface PromoCodeRedeemSectionProps {
    onOpen: () => void;
}

// Davet/partner kodu tetikleyicisi — davetli üyelik dışındaki tüm durumlarda
// görünür. Kod girişi merkezî klavye-uyumlu modalda (PromoCodeModal); inline
// input mobilde klavyenin arkasında kalıyordu. Dil: yalnız "davet kodu / erişim".
export const PromoCodeRedeemSection: React.FC<PromoCodeRedeemSectionProps> = ({ onOpen }) => (
    <button
        onClick={onOpen}
        className="w-full bg-slate-800 rounded-3xl border border-slate-700 p-5 shadow-lg flex items-center gap-3 text-left hover:bg-slate-800/70 transition-colors"
    >
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
            <Ticket className="w-5 h-5 text-sky-400" />
        </div>
        <div className="min-w-0 flex-1">
            <p className="font-bold text-white text-sm">Davet Kodu Kullan</p>
            <p className="text-slate-400 text-xs">İş ortağı kodunla ücretsiz erişim</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
    </button>
);
