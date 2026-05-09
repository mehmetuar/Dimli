import React from 'react';
import { ArrowLeft, MapPin, TrendingUp } from 'lucide-react';

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
    const maxPitches = subscription?.pitchCount ?? 0;
    const planLabel = subscription ? (PLAN_LABELS[subscription.planType] ?? subscription.planType) : null;
    const isAtLimit = maxPitches > 0 && pitchCount >= maxPitches;

    return (
        <div
            className="sticky top-0 z-10 border-b border-slate-700/60"
            style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            }}
        >
            <div className="px-4 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => navigate('/business/settings')}
                        className="p-2.5 bg-slate-700/60 border border-slate-600/50 rounded-xl hover:bg-slate-600/60 active:scale-95 transition-all flex-shrink-0"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 bg-orange-500/15 rounded-lg border border-orange-500/20 flex-shrink-0">
                            <MapPin className="w-4 h-4 text-orange-400" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="font-sport font-black text-[clamp(14px,4.5vw,18px)] text-white tracking-tight">Saha Ayarları</h1>
                            <p className="text-[clamp(9px,2.5vw,11px)] text-slate-400">Düzenlemek istediğiniz sahayı seçin</p>
                        </div>
                    </div>
                </div>

                {subscription && (
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="flex items-center rounded-xl overflow-hidden border border-slate-600/40">
                            {planLabel && (
                                <div className="px-2.5 py-1.5 bg-slate-700/80 border-r border-slate-600/40">
                                    <span className="text-[clamp(9px,2.5vw,11px)] font-black text-slate-200 tracking-wide">
                                        {planLabel}
                                    </span>
                                </div>
                            )}
                            <div className="px-2.5 py-1.5 bg-slate-800/60">
                                <span className={`text-[clamp(9px,2.5vw,11px)] font-black ${isAtLimit ? 'text-orange-400' : 'text-slate-300'}`}>
                                    {pitchCount}/{maxPitches} Saha
                                </span>
                            </div>
                        </div>
                        {isAtLimit && (
                            <button className="text-[clamp(8px,2vw,10px)] text-orange-400 font-bold flex items-center gap-0.5 active:opacity-70 transition-opacity">
                                <TrendingUp className="w-2.5 h-2.5" /> Planı Yükselt
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
