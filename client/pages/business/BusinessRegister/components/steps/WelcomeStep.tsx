import React from 'react';
import { CheckCircle, TrendingUp, Users, Calendar, Sparkles } from 'lucide-react';

const features = [
    { icon: Calendar, text: 'Rezervasyon yönetimini kolaylaştırın' },
    { icon: Users, text: 'Sahanızı binlerce oyuncuya duyurun' },
    { icon: TrendingUp, text: 'Gelir takibini anlık görün' },
    { icon: Sparkles, text: 'İlk 3 ay tamamen ücretsiz' },
];

export const WelcomeStep: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-2 animate-fade-in">

            {/* Logo & marka */}
            <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center shadow-lg shadow-orange-900/20">
                    <img src="/icon.png" alt="Dimli" className="w-10 h-10 object-contain" />
                </div>
                <div>
                    <p className="text-orange-400 font-black italic uppercase tracking-widest text-sm">DIMLİ İŞLETME</p>
                    <h2 className="text-2xl md:text-3xl font-black text-white leading-tight mt-1">
                        Sahanızı dijital<br />dünyaya taşıyın.
                    </h2>
                </div>
            </div>

            {/* Özellikler */}
            <div className="w-full max-w-sm space-y-2.5">
                {features.map((f, i) => {
                    const Icon = f.icon;
                    return (
                        <div
                            key={i}
                            className="flex items-center gap-3 bg-slate-800/70 border border-slate-700/50 px-4 py-3 rounded-xl text-left"
                        >
                            <div className="w-7 h-7 rounded-lg bg-orange-600/20 flex items-center justify-center shrink-0">
                                <Icon className="text-orange-400" size={14} />
                            </div>
                            <span className="text-slate-200 text-sm font-medium">{f.text}</span>
                            <CheckCircle className="text-green-500 shrink-0 ml-auto" size={15} />
                        </div>
                    );
                })}
            </div>

            <p className="text-slate-600 text-xs">Kayıt işlemi yaklaşık 5 dakika sürer.</p>
        </div>
    );
};
