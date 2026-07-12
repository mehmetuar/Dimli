import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Lock, LogOut, ChevronRight, CreditCard, Settings, MessageSquareText, UserCog, LifeBuoy } from 'lucide-react';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
import { ConfirmModal } from '../../../components/Modals/ConfirmModal';
import { CorporateGridBackground } from '../../../components/UI/CorporateGridBackground';
import { useAuth } from '../../../contexts/AuthContext';

export const BusinessSettingsHub: React.FC = () => {
    const navigate = useNavigate();
    const [showConfirm, setShowConfirm] = useState(false);
    const { logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/business/login');
    };

    const menuItems = [
        {
            title: 'İşletme Bilgileri',
            description: 'Ad, adres, telefon ve genel bilgiler',
            icon: Building2,
            path: '/business/settings/info',
            color: 'text-sky-400',
            borderColor: 'border-sky-500/30',
            iconGradient: 'from-sky-500/20 to-sky-600/10',
            iconBorder: 'border-sky-500/30',
            chevronColor: 'text-sky-500/60',
        },
        {
            title: 'Yetkili Bilgileri',
            description: 'Ad soyad, e-posta ve iletişim bilgilerin',
            icon: UserCog,
            path: '/business/settings/authorized',
            color: 'text-teal-400',
            borderColor: 'border-teal-500/30',
            iconGradient: 'from-teal-500/20 to-teal-600/10',
            iconBorder: 'border-teal-500/30',
            chevronColor: 'text-teal-500/60',
        },
        {
            title: 'Saha Ayarları',
            description: 'Fiyatlar, açılış/kapanış saatleri ve özellikler',
            icon: MapPin,
            path: '/business/settings/pitches',
            color: 'text-orange-400',
            borderColor: 'border-orange-500/30',
            iconGradient: 'from-orange-500/20 to-orange-600/10',
            iconBorder: 'border-orange-500/30',
            chevronColor: 'text-orange-500/60',
        },
        {
            title: 'Hazır Notlar',
            description: 'Sık kullandığın notları yönet',
            icon: MessageSquareText,
            path: '/business/settings/preset-notes',
            color: 'text-indigo-400',
            borderColor: 'border-indigo-500/30',
            iconGradient: 'from-indigo-500/20 to-indigo-600/10',
            iconBorder: 'border-indigo-500/30',
            chevronColor: 'text-indigo-500/60',
        },
        {
            title: 'Şifre Değiştir',
            description: 'Güvenlik ayarları ve şifre güncelleme',
            icon: Lock,
            path: '/business/settings/password',
            color: 'text-violet-400',
            borderColor: 'border-violet-500/30',
            iconGradient: 'from-violet-500/20 to-violet-600/10',
            iconBorder: 'border-violet-500/30',
            chevronColor: 'text-violet-500/60',
        },
        {
            title: 'Abonelik ve Planlar',
            description: 'Mevcut planını yönet, iptal et veya yükselt',
            icon: CreditCard,
            path: '/business/settings/subscription',
            color: 'text-emerald-400',
            borderColor: 'border-emerald-500/30',
            iconGradient: 'from-emerald-500/20 to-emerald-600/10',
            iconBorder: 'border-emerald-500/30',
            chevronColor: 'text-emerald-500/60',
        },
        {
            title: 'Destek',
            description: 'Sorun bildir, taleplerini takip et',
            icon: LifeBuoy,
            path: '/business/settings/support',
            color: 'text-rose-400',
            borderColor: 'border-rose-500/30',
            iconGradient: 'from-rose-500/20 to-rose-600/10',
            iconBorder: 'border-rose-500/30',
            chevronColor: 'text-rose-500/60',
        }
    ];

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

            {/* Header */}
            <div
                className="relative flex-shrink-0 border-b border-slate-700/60 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
            >
                <CorporateGridBackground />
                <div className="relative z-10 px-4 py-6 flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-orange-500/15 rounded-lg border border-orange-500/20">
                            <Settings className="w-4 h-4 text-orange-400" />
                        </div>
                        <h1 className="font-sport font-black text-[clamp(16px,5vw,22px)] text-white tracking-tight">Ayarlar</h1>
                    </div>
                    <p className="text-[clamp(10px,2.8vw,12px)] text-slate-400 font-medium tracking-wider uppercase">
                        İşletme Yönetimi
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
            <div className="p-4 pt-5 space-y-3 pb-business-nav">
                {menuItems.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`w-full p-4 rounded-2xl border ${item.borderColor} bg-slate-800/60 flex items-center gap-4 transition-all active:scale-[0.97] active:bg-slate-700/60 group hover:border-slate-600`}
                        style={{ WebkitTapHighlightColor: 'transparent', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.3)' }}
                    >
                        <div className={`w-[52px] h-[52px] rounded-xl bg-gradient-to-br ${item.iconGradient} border ${item.iconBorder} flex items-center justify-center flex-shrink-0 ${item.color} group-hover:scale-105 transition-all`}
                            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                            <item.icon className="w-6 h-6 drop-shadow-md" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <h3 className="text-[clamp(13px,3.8vw,16px)] font-bold text-slate-100 leading-tight group-active:text-white transition-colors">{item.title}</h3>
                            <p className="text-[clamp(10px,2.8vw,12px)] text-slate-400 mt-0.5 leading-relaxed">{item.description}</p>
                        </div>
                        <ChevronRight className={`w-5 h-5 ${item.chevronColor} flex-shrink-0 transition-colors`} />
                    </button>
                ))}

                {/* Divider */}
                <div className="flex items-center gap-3 py-2 px-1">
                    <div className="flex-1 h-px bg-slate-700/50" />
                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Hesap</span>
                    <div className="flex-1 h-px bg-slate-700/50" />
                </div>

                {/* Logout Button */}
                <button
                    onClick={() => setShowConfirm(true)}
                    className="w-full p-4 rounded-2xl border border-red-500/10 bg-slate-900/50 flex items-center gap-4 transition-all active:scale-[0.97] active:bg-red-950/30 group hover:border-red-500/30"
                    style={{ WebkitTapHighlightColor: 'transparent', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.5)' }}
                >
                    <div className="w-[52px] h-[52px] rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center flex-shrink-0 text-red-500 group-active:text-red-400 group-hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-all"
                        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                        <LogOut className="w-6 h-6 drop-shadow-md" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                        <h3 className="text-[clamp(13px,3.8vw,16px)] font-bold text-red-400 leading-tight group-active:text-red-300 transition-colors">Çıkış Yap</h3>
                        <p className="text-[clamp(10px,2.8vw,12px)] text-slate-500 mt-0.5">Güvenli bir şekilde oturumu kapat</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 flex-shrink-0 group-active:text-red-500 transition-colors" />
                </button>
            </div>
            </div>

            <ConfirmModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleLogout}
                title="Çıkış Yap"
                message="Hesabınızdan çıkış yapmak istediğinize emin misiniz?"
                confirmText="Çıkış Yap"
                cancelText="İptal"
                isDangerous={true}
            />

            <BusinessNavbar />
        </div>
    );
};
