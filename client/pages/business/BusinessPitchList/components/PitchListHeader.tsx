import React from 'react';
import { ArrowLeft, TrendingUp } from 'lucide-react';

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
        <div className="bg-slate-800 sticky top-0 z-10 border-b border-slate-700 shadow-lg">
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/business/settings')} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div>
                        <h1 className="font-sport font-bold text-xl text-white">Saha Ayarları</h1>
                        <p className="text-xs text-slate-400">Düzenlemek istediğiniz sahayı seçin</p>
                    </div>
                </div>

                {subscription && (
                    <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                            <span className={`text-sm font-black ${isAtLimit ? 'text-orange-400' : 'text-white'}`}>
                                {pitchCount}/{maxPitches} saha
                            </span>
                            {planLabel && (
                                <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                                    {planLabel}
                                </span>
                            )}
                        </div>
                        {isAtLimit && (
                            <p className="text-[10px] text-orange-400 mt-0.5 flex items-center gap-1 justify-end">
                                <TrendingUp className="w-3 h-3" />
                                Planınızı yükseltin
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
