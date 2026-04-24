import React from 'react';
import { CheckCircle, Clock, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CongratulationsStep: React.FC<{ ownerEmail: string }> = ({ ownerEmail }) => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-4 animate-fade-in">
            <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
                <CheckCircle className="text-green-400" size={48} />
            </div>

            <div className="space-y-3">
                <h2 className="text-3xl font-black text-white italic uppercase">Ailemize Hoşgeldiniz!</h2>
                <p className="text-slate-300 text-base">
                    Başvurunuz başarıyla alındı.
                </p>
                <p className="text-slate-400 text-sm max-w-sm">
                    İşletmeniz <strong className="text-white">1-2 iş günü</strong> içinde ekibimiz tarafından incelendikten sonra yayına alınacaktır.
                </p>
            </div>

            <div className="w-full max-w-sm space-y-3">
                <div className="flex items-center gap-3 bg-slate-800/60 px-4 py-3 rounded-xl">
                    <Clock className="text-orange-400 shrink-0" size={18} />
                    <span className="text-slate-300 text-sm">İnceleme süreci 1-2 iş günü</span>
                </div>
                <div className="flex items-center gap-3 bg-slate-800/60 px-4 py-3 rounded-xl">
                    <Mail className="text-orange-400 shrink-0" size={18} />
                    <span className="text-slate-300 text-sm">
                        Sonuç <strong className="text-white">{ownerEmail}</strong> adresine bildirilecek
                    </span>
                </div>
            </div>

            <button
                onClick={() => navigate('/business/login')}
                className="text-orange-500 font-bold text-sm hover:underline transition-colors"
            >
                Giriş sayfasına dön
            </button>
        </div>
    );
};
