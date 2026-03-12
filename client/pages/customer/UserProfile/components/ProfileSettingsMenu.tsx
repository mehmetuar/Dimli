import React from 'react';
import { User, Settings, LogOut, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfileSettingsMenuProps {
    isMenuOpen: boolean;
    setIsMenuOpen: (isOpen: boolean) => void;
}

export const ProfileSettingsMenu: React.FC<ProfileSettingsMenuProps> = ({ isMenuOpen, setIsMenuOpen }) => {
    const navigate = useNavigate();

    if (!isMenuOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
            <div className="bg-slate-800 w-full max-w-md rounded-t-3xl border-t border-slate-700 shadow-2xl z-[70] animate-slide-up pb-safe-bottom">
                <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setIsMenuOpen(false)}>
                    <div className="w-12 h-1.5 bg-slate-600 rounded-full"></div>
                </div>
                <div className="p-6 border-b border-slate-700">
                    <h3 className="text-white font-bold text-xl flex items-center gap-2">
                        <User className="w-6 h-6 text-turf-500" />
                        Profil Ayarları
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">Hesabını ve tercihlerini yönet</p>
                </div>
                <div className="p-4 space-y-2">
                    <button
                        onClick={() => { setIsMenuOpen(false); navigate('/settings/profile'); }}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-700/50 hover:bg-slate-700 text-white transition-all active:scale-95"
                    >
                        <div className="bg-blue-500/20 p-2 rounded-full text-blue-400">
                            <Settings className="w-6 h-6" />
                        </div>
                        <div className="text-left flex-1">
                            <div className="font-bold text-base">Profil Ayarları</div>
                            <div className="text-xs text-slate-400">Bilgilerini güncelle</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                    </button>
                    <button
                        onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all active:scale-95 mt-4"
                    >
                        <div className="bg-red-500/20 p-2 rounded-full text-red-400">
                            <LogOut className="w-6 h-6" />
                        </div>
                        <div className="text-left flex-1">
                            <div className="font-bold text-base">Çıkış Yap</div>
                            <div className="text-xs text-red-400/70">Oturumu sonlandır</div>
                        </div>
                    </button>
                </div>
                <div className="p-4 pt-0">
                    <button onClick={() => setIsMenuOpen(false)} className="w-full py-4 text-center text-slate-500 font-bold hover:text-white transition-colors">
                        Vazgeç
                    </button>
                </div>
            </div>
        </div>
    );
};
