import React from 'react';
import { Users, X } from 'lucide-react';
import { useModalBodyClass } from '../../utils/useModalBodyClass';

interface Props {
    onClose: () => void;
    onSwitchAccount: () => void;
}

export const BusinessInviteNoticeModal: React.FC<Props> = ({ onClose, onSwitchAccount }) => {
    useModalBodyClass(true);

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 bg-black/90 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-700 bg-slate-900 flex justify-between items-center">
                    <h2 className="font-sport font-black text-lg text-white italic uppercase tracking-wide">
                        TAKIM <span className="text-turf-500">DAVETİ</span>
                    </h2>
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4 text-center">
                    <Users className="w-10 h-10 text-turf-500 mx-auto" />
                    <p className="text-slate-300 text-sm">
                        Bu davet bireysel oyuncu hesapları içindir. Takıma katılmak için bir oyuncu
                        hesabıyla giriş yapmalısın.
                    </p>
                    <button
                        onClick={onSwitchAccount}
                        className="w-full bg-turf-600 hover:bg-turf-500 text-white font-bold py-3 rounded-xl shadow-neon transition-colors"
                    >
                        Çıkış Yap ve Oyuncu Hesabıyla Giriş Yap
                    </button>
                </div>
            </div>
        </div>
    );
};
