import React from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import { CorporateGridBackground } from '../../../../components/UI/CorporateGridBackground';

const PLAN_LABELS: Record<string, string> = {
    '1_pitch': 'Starter',
    '2_pitch': 'Basic',
    '3_pitch': 'Pro',
    '4_pitch': 'Business',
    '5plus_pitch': 'Enterprise',
};

interface PitchListHeaderProps {
    navigate: (path: string) => void;
    pitchCount: number;
    subscription: any;
}

export const PitchListHeader: React.FC<PitchListHeaderProps> = ({ navigate, pitchCount, subscription }) => {
    const planLabel = subscription ? (PLAN_LABELS[subscription.planType] ?? subscription.planType) : null;

    return (
        <div
            className="sticky top-0 z-10 shrink-0 px-4 pt-4 pb-5 border-b border-orange-500/10 overflow-hidden"
            style={{ background: 'radial-gradient(circle at top right, #1e293b 0%, #0f172a 100%)', boxShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
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
                <div className="w-11 h-11 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(249,115,22,0.15)] relative">
                    <div className="absolute inset-0 rounded-xl bg-orange-400/10 blur-md" />
                    <MapPin className="relative z-10 w-5 h-5 text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                </div>
                <div className="min-w-0 flex-1">
                    <h1 className="font-black text-white text-[clamp(18px,5vw,22px)] leading-tight truncate drop-shadow-sm">Saha Ayarları</h1>
                    <p className="text-[clamp(11px,3vw,13px)] text-slate-400 font-medium truncate">Düzenlemek istediğiniz sahayı seçin</p>
                </div>

                {planLabel && (
                    <div className="flex-shrink-0 flex items-center justify-center px-3 py-1.5 rounded-lg min-h-[28px]"
                        style={{
                            background: 'linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(30,27,75,0.92) 100%)',
                            border: '1px solid rgba(139,92,246,0.5)',
                            boxShadow: '0 0 14px rgba(139,92,246,0.28), inset 0 1px 0 rgba(255,255,255,0.06)',
                        }}>
                        <span className="text-[clamp(9px,2.5vw,11px)] font-black tracking-widest uppercase"
                            style={{ color: '#c4b5fd' }}>
                            {planLabel}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
