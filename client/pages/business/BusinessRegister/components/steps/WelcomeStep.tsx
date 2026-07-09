import React from 'react';
import { CheckCircle, TrendingUp, Users, Calendar, Sparkles } from 'lucide-react';

const features = [
    { icon: Calendar, text: 'Rezervasyon yönetimini kolaylaştır' },
    { icon: Users, text: 'Sahanı binlerce oyuncuya duyur' },
    { icon: TrendingUp, text: 'Gelir takibini anlık gör' },
    { icon: Sparkles, text: 'İlk 3 ay tamamen ücretsiz' },
];

// Not: kök öğeye animasyon sınıfı KOYMA — AuthWizardLayout içeriği `animate-step-in` ile sarar.
export const WelcomeStep: React.FC = () => {
    return (
        <div className="space-y-3">
            {features.map((f, i) => {
                const Icon = f.icon;
                return (
                    <div
                        key={i}
                        className="flex items-center gap-3 bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl px-4 py-3.5 text-left shadow-[0_8px_30px_rgba(0,0,0,0.15)]"
                    >
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(249,115,22,0.15)] relative">
                            <div className="absolute inset-0 rounded-xl bg-orange-400/10 blur-md" />
                            <Icon className="relative z-10 w-5 h-5 text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                        </div>
                        <span className="text-slate-200 font-semibold flex-1" style={{ fontSize: 'clamp(0.85rem, 2.2vh, 0.95rem)' }}>
                            {f.text}
                        </span>
                        <CheckCircle className="text-green-500 shrink-0" size={18} />
                    </div>
                );
            })}
            <p className="text-slate-500 text-center pt-2" style={{ fontSize: 'clamp(0.7rem, 1.8vh, 0.8rem)' }}>
                Kayıt işlemi yaklaşık 5 dakika sürer.
            </p>
        </div>
    );
};
