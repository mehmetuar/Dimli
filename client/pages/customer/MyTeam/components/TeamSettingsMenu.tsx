import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Settings, ChevronRight } from 'lucide-react';

interface TeamSettingsMenuProps {
    myTeamName?: string;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export const TeamSettingsMenu: React.FC<TeamSettingsMenuProps> = ({
    myTeamName, isOpen, setIsOpen
}) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>
            <div className="bg-slate-800 w-full max-w-md rounded-t-3xl border-t border-slate-700 shadow-2xl z-[70] animate-slide-up pb-safe-bottom">
                <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setIsOpen(false)}>
                    <div className="w-12 h-1.5 bg-slate-600 rounded-full"></div>
                </div>
                <div className="p-6 border-b border-slate-700">
                    <h3 className="text-white font-bold text-xl flex items-center gap-2">
                        <Shield className="w-6 h-6 text-blue-500" />
                        Takım Ayarları
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">{myTeamName} takımını yönet</p>
                </div>
                <div className="p-4 space-y-2">
                    <button
                        onClick={() => { setIsOpen(false); navigate('/settings/team'); }}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-700/50 hover:bg-slate-700 text-white transition-all active:scale-95"
                    >
                        <div className="bg-blue-500/20 p-2 rounded-full text-blue-400">
                            <Settings className="w-6 h-6" />
                        </div>
                        <div className="text-left flex-1">
                            <div className="font-bold text-base">Takım Ayarları</div>
                            <div className="text-xs text-slate-400">Takım bilgilerini güncelle</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
                <div className="p-4 pt-0">
                    <button onClick={() => setIsOpen(false)} className="w-full py-4 text-center text-slate-500 font-bold hover:text-white transition-colors">Vazgeç</button>
                </div>
            </div>
        </div>
    );
};
