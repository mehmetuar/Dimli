import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Lock, LogOut } from 'lucide-react';
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
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20'
        },
        {
            title: 'Saha Ayarları',
            description: 'Fiyatlar, açılış/kapanış saatleri ve özellikler',
            icon: MapPin,
            path: '/business/settings/pitches',
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/20'
        },
        {
            title: 'Şifre Değiştir',
            description: 'Güvenlik ayarları ve şifre güncelleme',
            icon: Lock,
            path: '/business/settings/password',
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20'
        }
    ];

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24">
            {/* Header */}
            <div className="bg-slate-800 p-4 sticky top-0 z-10 border-b border-slate-700 shadow-lg">
                <h1 className="font-sport font-bold text-xl text-white">Ayarlar</h1>
                <p className="text-xs text-slate-400">İşletme yönetimi</p>
            </div>

            <div className="p-4 space-y-4">
                {menuItems.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`w-full p-6 rounded-2xl border ${item.border} ${item.bg} flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98]`}
                    >
                        <div className={`w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center ${item.color}`}>
                            <item.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="text-lg font-bold text-white">{item.title}</h3>
                            <p className="text-sm text-slate-400">{item.description}</p>
                        </div>
                    </button>
                ))}

                {/* Logout Button */}
                <button
                    onClick={() => setShowConfirm(true)}
                    className="w-full mt-8 p-6 rounded-2xl border border-red-500/20 bg-red-500/5 flex items-center gap-4 transition-all hover:bg-red-500/10 group"
                >
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                        <LogOut className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="text-lg font-bold text-red-500">Çıkış Yap</h3>
                        <p className="text-sm text-slate-500">Güvenli bir şekilde oturumu kapat</p>
                    </div>
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

