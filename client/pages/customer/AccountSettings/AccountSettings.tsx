import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, UserCircle2, Shield, ShieldOff, LifeBuoy, PlayCircle } from 'lucide-react';
import { TourReplayModal } from './TourReplayModal';

export const AccountSettings: React.FC = () => {
    const navigate = useNavigate();
    const [isTourModalOpen, setIsTourModalOpen] = useState(false);

    const items = [
        {
            icon: <UserCircle2 className="w-5 h-5" />,
            color: 'bg-blue-500/20 text-blue-400',
            label: 'Profil Ayarları',
            desc: 'Ad, kullanıcı adı, oyuncu bilgileri',
            onClick: () => navigate('/settings/profile'),
        },
        {
            icon: <Shield className="w-5 h-5" />,
            color: 'bg-turf-500/20 text-turf-400',
            label: 'Gizlilik ve Güvenlik',
            desc: 'KVKK, kullanım şartları, şifre değiştir',
            onClick: () => navigate('/settings/privacy-security'),
        },
        {
            icon: <ShieldOff className="w-5 h-5" />,
            color: 'bg-orange-500/20 text-orange-400',
            label: 'Engellenen Kullanıcılar',
            desc: 'Engellediğin kullanıcıları yönet',
            onClick: () => navigate('/settings/blocked-users'),
        },
        {
            icon: <PlayCircle className="w-5 h-5" />,
            color: 'bg-sky-500/20 text-sky-400',
            label: 'Uygulama Tanıtımı',
            desc: 'Tanıtım turlarını tekrar izle',
            onClick: () => setIsTourModalOpen(true),
        },
        {
            icon: <LifeBuoy className="w-5 h-5" />,
            color: 'bg-purple-500/20 text-purple-400',
            label: 'Yardım',
            desc: 'Destek talebi oluştur, taleplerini takip et',
            onClick: () => navigate('/settings/support'),
        },
    ];

    return (
        <div className="fixed inset-0 bg-pitch flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

            <TourReplayModal isOpen={isTourModalOpen} onClose={() => setIsTourModalOpen(false)} />

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
                            key={item.label}
                            onClick={item.onClick}
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
