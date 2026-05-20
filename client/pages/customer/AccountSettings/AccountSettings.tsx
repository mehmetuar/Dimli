import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, UserCircle2, Shield, ShieldOff } from 'lucide-react';

export const AccountSettings: React.FC = () => {
    const navigate = useNavigate();

    const items = [
        {
            icon: <UserCircle2 className="w-5 h-5" />,
            color: 'bg-blue-500/20 text-blue-400',
            label: 'Profil Ayarları',
            desc: 'Ad, kullanıcı adı, oyuncu bilgileri',
            to: '/settings/profile',
        },
        {
            icon: <Shield className="w-5 h-5" />,
            color: 'bg-turf-500/20 text-turf-400',
            label: 'Gizlilik ve Güvenlik',
            desc: 'KVKK, kullanım şartları, şifre değiştir',
            to: '/settings/privacy-security',
        },
        {
            icon: <ShieldOff className="w-5 h-5" />,
            color: 'bg-orange-500/20 text-orange-400',
            label: 'Engellenen Kullanıcılar',
            desc: 'Engellediğin kullanıcıları yönet',
            to: '/settings/blocked-users',
        },
    ];

    return (
        <div className="fixed inset-0 bg-pitch flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

            {/* Header */}
            <header className="bg-pitch/95 backdrop-blur-sm border-b border-slate-800/60">
                <div className="flex items-center gap-3 px-4 py-4 max-w-lg mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="font-sport font-black text-2xl text-white italic tracking-wide uppercase">
                        Hesap Ayarları
                    </h1>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                <div className="max-w-lg mx-auto px-4 pt-5 space-y-3 pb-10">
                    {items.map(item => (
                        <button
                            key={item.to}
                            onClick={() => navigate(item.to)}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-white transition-all active:scale-[0.98] hover:bg-slate-800/60"
                        >
                            <div className={`p-2.5 rounded-xl ${item.color}`}>
                                {item.icon}
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <div className="font-bold text-base">{item.label}</div>
                                <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
