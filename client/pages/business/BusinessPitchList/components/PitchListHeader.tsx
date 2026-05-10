import React from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';

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
