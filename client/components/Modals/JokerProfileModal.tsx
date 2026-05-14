
import React, { useState, useEffect } from 'react';
import { X, Handshake, Power } from 'lucide-react';
import { useModalBodyClass } from '../../utils/useModalBodyClass';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    currentUser?: any; // Real user data from backend
}

export const JokerProfileModal: React.FC<Props> = (props) => {
    useModalBodyClass(props.isOpen);
    if (!props.isOpen) return null;
    return <JokerProfileModalContent {...props} />;
};

const JokerProfileModalContent: React.FC<Props> = ({ isOpen, onClose, onSave, currentUser }) => {
    const [isFeeShared, setIsFeeShared] = useState(currentUser?.sharesFee ?? true);
    const [isActive, setIsActive] = useState(currentUser?.isJoker ?? false);

    // Sync when user data loads
    useEffect(() => {
        if (currentUser) {
            setIsFeeShared(currentUser.sharesFee ?? true);
            setIsActive(currentUser.isJoker ?? false);
        }
    }, [currentUser]);

    const handleSave = () => {
        onSave({ sharesFee: isFeeShared, isJoker: isActive });
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-lg sm:rounded-3xl rounded-t-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-slate-900 flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h2 className="font-sport font-black text-2xl text-white italic uppercase tracking-wide">
                            JOKER <span className="text-turf-500">AYARLARI</span>
                        </h2>
                        <p className="text-slate-400 text-xs">Kartını oluştur, sahalara in.</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-8">

                    {/* Status Toggle */}
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isActive ? 'bg-turf-500/20 text-turf-500' : 'bg-slate-800 text-slate-500'}`}>
                                <Power className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="font-bold text-white text-sm">Joker Modu</div>
                                <div className="text-xs text-slate-400">{isActive ? 'Şu an havuzda görünüyorsun.' : 'Gizli moddasın, teklif alamazsın.'}</div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsActive(!isActive)}
                            className={`w-12 h-6 rounded-full p-1 transition-colors relative ${isActive ? 'bg-turf-600' : 'bg-slate-700'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>

                    {/* Fee Sharing */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-3 block flex items-center gap-2">
                            <Handshake className="w-4 h-4" /> Ücret Tercihi
                        </label>
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isFeeShared ? 'bg-green-500/20 text-green-500' : 'bg-slate-800 text-slate-500'}`}>
                                    <Handshake className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-white text-sm">Saha Ücretine Ortağım</div>
                                    <div className="text-xs text-slate-400">Takımın ödeyeceği ücrete dahil olursun.</div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsFeeShared(!isFeeShared)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors relative ${isFeeShared ? 'bg-green-600' : 'bg-slate-700'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isFeeShared ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-900 border-t border-slate-800 sticky bottom-0 z-10">
                    <button
                        onClick={handleSave}
                        className="w-full bg-turf-600 text-white font-black uppercase italic py-4 rounded-xl text-lg shadow-lg shadow-turf-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        Değişiklikleri Kaydet
                    </button>
                </div>

            </div>
        </div>
    );
};
