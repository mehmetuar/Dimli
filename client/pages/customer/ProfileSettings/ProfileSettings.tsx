import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, UserCircle2, Shield, User, Calendar,
    Lock, Save, Key, Settings, Trash2, ChevronRight, ShieldOff,
} from 'lucide-react';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';
import { useProfile } from './hooks/useProfile';
import { ProfilePhotoManager } from './components/ProfilePhotoManager';
import { DeleteAccountModal } from './components/DeleteAccountModal';
import { BlockedUsersModal } from './components/BlockedUsersModal';
import { PositionPickerModal } from '../../../components/UI/PositionPickerModal';

const inputClass = 'w-full bg-slate-900/80 text-white px-4 py-3.5 rounded-xl border border-slate-700 focus:border-turf-500/70 focus:outline-none font-semibold text-sm placeholder-slate-600 transition-colors';
const labelClass = 'block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5';

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-slate-800/40 rounded-2xl border border-slate-700/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/60 flex items-center gap-2">
            <span className="text-turf-500">{icon}</span>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</span>
        </div>
        <div className="p-4 space-y-4">{children}</div>
    </div>
);

// input focus olunca klavyenin üstüne scroll eder
const scrollToInput = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
};

export const ProfileSettings: React.FC = () => {
    const navigate = useNavigate();
    const {
        activeTab, setActiveTab,
        loading, saving, isUploadingAvatar,
        message, setMessage,
        profileData, setProfileData,
        passwordData, setPasswordData,
        uploadAvatar, removeAvatar,
        handleProfileUpdate,
        handlePasswordChange,
        isDeleteModalOpen, setIsDeleteModalOpen,
        deleteAccount,
    } = useProfile();

    // Hesap yönetimi expand state
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);

    // Position picker state
    const [positionPicker, setPositionPicker] = useState<{
        open: boolean; field: 'position' | 'secondaryPosition'; title: string; allowEmpty: boolean;
    }>({ open: false, field: 'position', title: '', allowEmpty: false });

    const openPositionPicker = (field: 'position' | 'secondaryPosition') => {
        setPositionPicker({
            open: true,
            field,
            title: field === 'position' ? 'Mevki Seç' : 'Yedek Mevki Seç',
            allowEmpty: field === 'secondaryPosition',
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-pitch flex items-center justify-center">
                <LoadingSpinner size="lg" text="Profil yükleniyor..." />
            </div>
        );
    }

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
                        Profil Ayarları
                    </h1>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
            <div className="max-w-lg mx-auto px-4 pt-5 space-y-5 pb-10">

                {/* Profil Fotoğrafı */}
                <div className="bg-slate-800/40 rounded-2xl border border-slate-700/60 py-6">
                    <ProfilePhotoManager
                        avatarUrl={profileData.avatarUrl}
                        fullName={profileData.full_name}
                        isUploading={isUploadingAvatar}
                        onUpload={uploadAvatar}
                        onRemove={removeAvatar}
                    />
                </div>

                {/* Tab Bar */}
                <div className="flex bg-slate-800/60 p-1 rounded-xl border border-slate-700/40">
                    <button
                        onClick={() => { setActiveTab('profile'); setMessage(null); }}
                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                            activeTab === 'profile'
                                ? 'bg-turf-600 text-white shadow-lg shadow-turf-600/20'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <UserCircle2 className="w-4 h-4" />
                        Profil
                    </button>
                    <button
                        onClick={() => { setActiveTab('password'); setMessage(null); }}
                        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                            activeTab === 'password'
                                ? 'bg-turf-600 text-white shadow-lg shadow-turf-600/20'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Key className="w-4 h-4" />
                        Güvenlik
                    </button>
                </div>

                {/* Mesaj */}
                {message && (
                    <div className={`p-3.5 rounded-xl text-sm font-bold text-center ${
                        message.type === 'success'
                            ? 'bg-green-500/10 border border-green-500/40 text-green-400'
                            : 'bg-red-500/10 border border-red-500/40 text-red-400'
                    }`}>
                        {message.text}
                    </div>
                )}

                {/* PROFİL TABI */}
                {activeTab === 'profile' && (
                    <form onSubmit={handleProfileUpdate} className="space-y-4 animate-fade-in">
                        <Section icon={<User className="w-4 h-4" />} title="Kişisel Bilgiler">
                            <div>
                                <label className={labelClass}>Ad Soyad</label>
                                <input
                                    type="text"
                                    value={profileData.full_name}
                                    onChange={e => setProfileData({ ...profileData, full_name: e.target.value })}
                                    onFocus={scrollToInput}
                                    className={inputClass}
                                    placeholder="Adın Soyadın"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Kullanıcı Adı</label>
                                <input
                                    type="text"
                                    value={profileData.username}
                                    onChange={e => setProfileData({ ...profileData, username: e.target.value })}
                                    onFocus={scrollToInput}
                                    className={inputClass}
                                    placeholder="kullaniciadi"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Doğum Tarihi</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                    <input
                                        type="date"
                                        value={profileData.birthDate}
                                        onChange={e => setProfileData({ ...profileData, birthDate: e.target.value })}
                                        onFocus={scrollToInput}
                                        className={`${inputClass} pl-10`}
                                    />
                                </div>
                            </div>
                        </Section>

                        <Section icon={<Shield className="w-4 h-4" />} title="Oyuncu Bilgileri">
                            {/* Mevki seçici — özel modal */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Mevki</label>
                                    <button
                                        type="button"
                                        onClick={() => openPositionPicker('position')}
                                        className="w-full bg-slate-900/80 border-2 border-slate-700 rounded-xl px-4 py-3.5 text-left text-sm font-bold text-white flex items-center justify-between hover:border-slate-600 transition-colors"
                                    >
                                        <span>{profileData.position || 'Seç...'}</span>
                                        <ChevronRight className="w-4 h-4 text-slate-500" />
                                    </button>
                                </div>
                                <div>
                                    <label className={labelClass}>Yedek Mevki</label>
                                    <button
                                        type="button"
                                        onClick={() => openPositionPicker('secondaryPosition')}
                                        className="w-full bg-slate-900/80 border-2 border-slate-700 rounded-xl px-4 py-3.5 text-left text-sm font-bold text-white flex items-center justify-between hover:border-slate-600 transition-colors"
                                    >
                                        <span className={profileData.secondaryPosition ? 'text-white' : 'text-slate-500'}>
                                            {profileData.secondaryPosition || 'Seçiniz'}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-slate-500" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Kullandığı Ayak</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Sağ', 'Sol', 'Her İkisi'].map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setProfileData({ ...profileData, foot: opt })}
                                            className={`py-3 rounded-xl font-bold text-sm transition-all ${
                                                profileData.foot === opt
                                                    ? 'bg-turf-600 text-white shadow-lg shadow-turf-600/20'
                                                    : 'bg-slate-900/80 text-slate-400 border-2 border-slate-700 hover:border-slate-500'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Section>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-turf-600 hover:bg-turf-500 disabled:opacity-60 text-white py-4 rounded-2xl font-black text-base uppercase tracking-widest transition-all shadow-lg shadow-turf-600/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            {saving
                                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <><Save className="w-4 h-4" /> Kaydet</>
                            }
                        </button>
                    </form>
                )}

                {/* GÜVENLİK TABI */}
                {activeTab === 'password' && (
                    <div className="space-y-4 animate-fade-in">
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <Section icon={<Lock className="w-4 h-4" />} title="Şifre Değiştir">
                                <div>
                                    <label className={labelClass}>Mevcut Şifre</label>
                                    <input
                                        type="password"
                                        value={passwordData.oldPassword}
                                        onChange={e => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                        onFocus={scrollToInput}
                                        className={inputClass}
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Yeni Şifre</label>
                                    <input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        onFocus={scrollToInput}
                                        className={inputClass}
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Yeni Şifre (Tekrar)</label>
                                    <input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        onFocus={scrollToInput}
                                        className={inputClass}
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </Section>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-turf-600 hover:bg-turf-500 disabled:opacity-60 text-white py-4 rounded-2xl font-black text-base uppercase tracking-widest transition-all shadow-lg shadow-turf-600/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                {saving
                                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <><Save className="w-4 h-4" /> Şifreyi Güncelle</>
                                }
                            </button>
                        </form>

                        {/* Hesap Yönetimi — gizli, Güvenlik tab altında */}
                        <div className="mt-8 pt-6 border-t border-slate-800/60">
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 text-center">
                                Hesap Yönetimi
                            </p>
                            <button
                                onClick={() => setAccountMenuOpen(v => !v)}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 text-sm font-semibold transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <Settings className="w-4 h-4" />
                                    Hesap Ayarları
                                </div>
                                <ChevronRight className={`w-4 h-4 transition-transform ${accountMenuOpen ? 'rotate-90' : ''}`} />
                            </button>

                            {accountMenuOpen && (
                                <div className="mt-2 space-y-2 animate-fade-in">
                                    <button
                                        onClick={() => setIsBlockedModalOpen(true)}
                                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800 text-sm font-bold transition-all"
                                    >
                                        <ShieldOff className="w-4 h-4" />
                                        Engellenen Kullanıcılar
                                    </button>
                                    <button
                                        onClick={() => setIsDeleteModalOpen(true)}
                                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-red-900/50 bg-red-950/20 text-red-500 hover:bg-red-950/40 text-sm font-bold transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Hesabımı Sil
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            </div>

            {/* Position Picker Modal */}
            <PositionPickerModal
                isOpen={positionPicker.open}
                title={positionPicker.title}
                value={positionPicker.field === 'position' ? profileData.position : profileData.secondaryPosition}
                allowEmpty={positionPicker.allowEmpty}
                excludeKey={positionPicker.field === 'secondaryPosition' ? profileData.position : profileData.secondaryPosition || undefined}
                onSelect={val => setProfileData({ ...profileData, [positionPicker.field]: val })}
                onClose={() => setPositionPicker(p => ({ ...p, open: false }))}
            />

            {/* Hesap Silme Modalı */}
            <DeleteAccountModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={deleteAccount}
            />

            {/* Engellenen Kullanıcılar Modalı */}
            <BlockedUsersModal
                isOpen={isBlockedModalOpen}
                onClose={() => setIsBlockedModalOpen(false)}
            />
        </div>
    );
};
