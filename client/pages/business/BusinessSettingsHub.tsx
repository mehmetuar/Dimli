import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Lock } from 'lucide-react';
import { BusinessNavbar } from '../../components/BusinessNavbar';

export const BusinessSettingsHub: React.FC = () => {
    const navigate = useNavigate();

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
            </div>

            <BusinessNavbar />
        </div>
    );
};
