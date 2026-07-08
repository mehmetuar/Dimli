import React from 'react';
import { ArrowLeft, Building2 } from 'lucide-react';
import { CorporateGridBackground } from '../../../../components/UI/CorporateGridBackground';

interface InfoSettingsHeaderProps {
    navigate: (path: string) => void;
}

export const InfoSettingsHeader: React.FC<InfoSettingsHeaderProps> = ({ navigate }) => {
    return (
        <div 
            className="relative shrink-0 px-4 pt-4 pb-5 border-b border-orange-500/10 overflow-hidden"
            style={{ background: 'radial-gradient(circle at top right, #1e293b 0%, #0f172a 100%)', boxShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
        >
            <CorporateGridBackground />
            <div className="relative z-10 flex items-center gap-3">
                <button
                    onClick={() => navigate('/business/settings')}
                    className="w-10 h-10 bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0 shadow-lg"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-11 h-11 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(249,115,22,0.15)] relative">
                    <div className="absolute inset-0 rounded-xl bg-orange-400/10 blur-md" />
                    <Building2 className="relative z-10 w-5 h-5 text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                </div>
                <div className="min-w-0 flex-1">
                    <h1 className="font-black text-white text-[clamp(18px,5vw,22px)] leading-tight truncate drop-shadow-sm">İşletme Bilgileri</h1>
                    <p className="text-[clamp(11px,3vw,13px)] text-slate-400 font-medium truncate">Temel bilgilerinizi güncelleyin</p>
                </div>
            </div>
        </div>
    );
};
