import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Lock, LogOut, ChevronRight } from 'lucide-react';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
import { ConfirmModal } from '../../../components/Modals/ConfirmModal';

export const BusinessSettingsHub: React.FC = () => {
    const navigate = useNavigate();
    const [showConfirm, setShowConfirm] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('ownerId');
        navigate('/business/login');
    };

    const menuItems = [
        {
            title: 'İşletme Bilgileri',
            description: 'Ad, adres, telefon ve genel bilgiler',
            icon: Building2,
            path: '/business/settings/info',
            color: 'text-sky-400',
            bg: 'bg-sky-500/10',
            border: 'border-sky-500/20',
            iconBg: 'bg-sky-500/10',
        },
        {
            title: 'Saha Ayarları',
            description: 'Fiyatlar, açılış/kapanış saatleri ve özellikler',
            icon: MapPin,
            path: '/business/settings/pitches',
            color: 'text-orange-400',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/25',
            iconBg: 'bg-orange-500/10',
        },
        {
            title: 'Şifre Değiştir',
            description: 'Güvenlik ayarları ve şifre güncelleme',
            icon: Lock,
            path: '/business/settings/password',
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/20',
            iconBg: 'bg-indigo-500/10',
        }
    ];

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-28">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700 shadow-lg">
                <div className="px-4 py-4 flex flex-col items-center">
                    <h1 className="font-sport font-bold text-xl text-white">Ayarlar</h1>
                    <p className="text-xs text-slate-400 mt-0.5">İşletme yönetimi</p>
                </div>
            </div>

            <div className="p-4 pt-5 space-y-3">
                {menuItems.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`w-full p-5 rounded-2xl border ${item.border} bg-slate-800/80 flex items-center gap-4 transition-all active:scale-[0.98] shadow-lg shadow-black/20`}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <div className={`w-14 h-14 rounded-2xl ${item.iconBg} border ${item.border} flex items-center justify-center flex-shrink-0 ${item.color}`}>
                            <item.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <h3 className="text-base font-bold text-white">{item.title}</h3>
                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.description}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
                    </button>
                ))}

                {/* Logout Button */}
                <button
                    onClick={() => setShowConfirm(true)}
                    className="w-full mt-6 p-5 rounded-2xl border border-red-500/20 bg-slate-800/80 flex items-center gap-4 transition-all active:scale-[0.98] hover:bg-red-500/10 shadow-lg shadow-black/20 group"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 text-red-400 group-hover:scale-105 transition-transform">
                        <LogOut className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                        <h3 className="text-base font-bold text-red-400">Çıkış Yap</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Güvenli bir şekilde oturumu kapat</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 flex-shrink-0" />
                </button>
            </div>

            <ConfirmModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleLogout}
                title="Çıkış Yap"
                message="Hesabınızdan çıkış yapmak istediğinize emin misiniz?"
                confirmText="Çıkış Yap"
                cancelText="İptal"
                isDangerous={false}
                accentColor="orange"
            />

            <BusinessNavbar />
        </div>
    );
};

