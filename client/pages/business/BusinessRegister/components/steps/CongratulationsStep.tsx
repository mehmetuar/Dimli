import React from 'react';
import { CheckCircle, Clock, Phone, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatTurkishPhoneDisplay } from '../../../../../utils/phone';

const infoRows = [
    { icon: Clock, text: <>İnceleme süreci <strong className="text-white">1-2 iş günü</strong></> },
];

export const CongratulationsStep: React.FC<{ ownerPhone: string }> = ({ ownerPhone }) => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-full text-center space-y-6 py-4">
            <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(74,222,128,0.15)]">
                <CheckCircle className="text-green-400" size={48} />
            </div>

            <div className="space-y-3">
                <h2 className="font-sport font-black text-white italic uppercase" style={{ fontSize: 'clamp(1.6rem, 5vh, 2rem)' }}>
                    Ailemize Hoş Geldiniz!
                </h2>
                <p className="text-slate-300" style={{ fontSize: 'clamp(0.9rem, 2.3vh, 1rem)' }}>
                    Başvurunuz başarıyla alındı.
                </p>
                <p className="text-slate-400 max-w-sm mx-auto" style={{ fontSize: 'clamp(0.8rem, 2vh, 0.9rem)' }}>
                    İşletmeniz <strong className="text-white">1-2 iş günü</strong> içinde ekibimiz tarafından incelendikten sonra yayına alınacaktır.
                </p>
            </div>

            <div className="w-full max-w-sm space-y-3">
                {infoRows.map((row, i) => {
                    const Icon = row.icon;
                    return (
                        <div key={i} className="flex items-center gap-3 bg-slate-800/50 backdrop-blur-md border border-slate-700/50 px-4 py-3 rounded-2xl">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 relative shadow-[0_0_12px_rgba(249,115,22,0.15)]">
                                <div className="absolute inset-0 rounded-xl bg-orange-400/10 blur-md" />
                                <Icon className="relative z-10 w-5 h-5 text-orange-400" />
                            </div>
                            <span className="text-slate-300 text-sm text-left flex-1">{row.text}</span>
                        </div>
                    );
                })}
                <div className="flex items-center gap-3 bg-slate-800/50 backdrop-blur-md border border-slate-700/50 px-4 py-3 rounded-2xl">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 relative shadow-[0_0_12px_rgba(249,115,22,0.15)]">
                        <div className="absolute inset-0 rounded-xl bg-orange-400/10 blur-md" />
                        <Phone className="relative z-10 w-5 h-5 text-orange-400" />
                    </div>
                    <span className="text-slate-300 text-sm text-left flex-1">
                        Sonuç <strong className="text-white">{formatTurkishPhoneDisplay(ownerPhone)}</strong> numarasına bildirilecek
                    </span>
                </div>
            </div>

            <div className="w-full max-w-sm space-y-3 pt-1">
                <button
                    onClick={() => navigate('/business/dashboard')}
                    className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white font-display font-bold uppercase tracking-wider rounded-2xl shadow-lg shadow-black/30 border border-orange-400/15 active:bg-orange-700 active:scale-[0.97] transition-all"
                    style={{ height: 'clamp(48px, 7vh, 58px)', fontSize: 'clamp(0.9rem, 2.4vh, 1.1rem)' }}
                >
                    İşletme Paneline Gir
                    <ArrowRight className="w-5 h-5" />
                </button>
                <button
                    onClick={() => navigate('/business/login')}
                    className="text-slate-500 font-bold text-xs hover:text-slate-400 transition-colors py-2"
                >
                    Giriş sayfasına dön
                </button>
            </div>
        </div>
    );
};
