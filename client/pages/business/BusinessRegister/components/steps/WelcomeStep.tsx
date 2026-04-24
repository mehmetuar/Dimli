import React from 'react';
import { CheckCircle } from 'lucide-react';

const features = [
    'Rezervasyon yönetimini kolaylaştırın',
    'Sahanızı binlerce oyuncuya duyurun',
    'Gelir takibini anlık görün',
    'İlk 3 ay tamamen ücretsiz',
];

export const WelcomeStep: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-4 animate-fade-in">
            <div className="space-y-2">
                <h2 className="text-3xl font-black text-white italic uppercase tracking-wider">
                    Dimli'ye Hoşgeldiniz
                </h2>
                <p className="text-slate-400 text-base max-w-sm">
                    Sahanızı Dimli'ye taşıyın. Rezervasyonlarınızı kolayca yönetin, daha fazla oyuncuya ulaşın.
                </p>
            </div>

            <div className="w-full max-w-sm space-y-3">
                {features.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-800/60 px-4 py-3 rounded-xl">
                        <CheckCircle className="text-orange-500 shrink-0" size={18} />
                        <span className="text-slate-200 text-sm font-medium">{f}</span>
                    </div>
                ))}
            </div>

            <p className="text-slate-500 text-xs">Kayıt işlemi yaklaşık 5 dakika sürer.</p>
        </div>
    );
};
