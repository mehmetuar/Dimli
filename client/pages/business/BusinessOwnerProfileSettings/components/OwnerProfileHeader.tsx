import React from 'react';
import { ArrowLeft, UserCog } from 'lucide-react';
import { CorporateGridBackground } from '../../../../components/UI/CorporateGridBackground';

interface OwnerProfileHeaderProps {
    navigate: (path: string) => void;
}

// Diğer ayar alt sayfalarıyla aynı "premium glow" deseni (bkz. InfoSettingsHeader);
// Hazır Notlar'ın indigo varyantı emsali, burada teal aksan (hub kartı ile aynı renk).
export const OwnerProfileHeader: React.FC<OwnerProfileHeaderProps> = ({ navigate }) => {
    return (
        <div
            className="relative shrink-0 px-4 pt-4 pb-5 border-b border-teal-500/10 overflow-hidden"
            style={{ background: 'radial-gradient(circle at top right, #134e4a 0%, #0f172a 100%)', boxShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
        >
            <CorporateGridBackground />
            <div className="relative z-10 flex items-center gap-3">
                <button
                    onClick={() => navigate('/business/settings')}
                    className="w-10 h-10 bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0 shadow-lg"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-11 h-11 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(20,184,166,0.15)] relative">
                    <div className="absolute inset-0 rounded-xl bg-teal-400/10 blur-md" />
                    <UserCog className="relative z-10 w-5 h-5 text-teal-300 drop-shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
                </div>
                <div className="min-w-0 flex-1">
                    <h1 className="font-black text-white text-[clamp(18px,5vw,22px)] leading-tight truncate drop-shadow-sm">Yetkili Bilgileri</h1>
                    <p className="text-[clamp(11px,3vw,13px)] text-slate-400 font-medium truncate">İletişim bilgilerinizi güncelleyin</p>
                </div>
            </div>
        </div>
    );
};
