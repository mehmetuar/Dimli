import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Shield, User, Calendar,
    Save, ChevronRight, Pencil, Phone,
    CheckCircle2, XCircle, Loader2, Lock,
} from 'lucide-react';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';
import { useProfile } from './hooks/useProfile';
import { ProfilePhotoManager } from './components/ProfilePhotoManager';
import { PositionPickerModal } from '../../../components/UI/PositionPickerModal';
import { CountryPickerModal } from '../../../components/UI/CountryPickerModal';
import { Flag } from '../../../components/UI/Flag';
import { getCountryName } from '../../../data/countries';
import { sanitizeUsernameInput } from '../../../utils/username';
import type { UsernameStatus } from './hooks/useProfile';

const inputClass = 'w-full bg-slate-900/80 text-white px-4 py-3.5 rounded-xl border border-slate-700 focus:border-turf-500/70 focus:outline-none font-semibold text-sm placeholder-slate-600 transition-colors';
const labelClass = 'block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5';
const readonlyValueClass = 'w-full bg-slate-900/40 text-slate-300 px-4 py-3.5 rounded-xl border border-slate-700/50 font-semibold text-sm';

const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('tr-TR', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    } catch {
        return dateStr;
    }
};

const formatPhone = (phone: string): string => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('90') && digits.length === 12) {
        return `+90 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
    }
    return phone;
};

const UsernameStatusIcon: React.FC<{ status: UsernameStatus }> = ({ status }) => {
    if (status === 'checking') return <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />;
    if (status === 'available') return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    if (status === 'taken') return <XCircle className="w-4 h-4 text-red-400" />;
    return null;
};

const scrollToInput = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
};

export const ProfileSettings: React.FC = () => {
    const navigate = useNavigate();
    const {
        loading, loadError, loadProfile, saving, isUploadingAvatar,
        message,
        profileData, setProfileData,
        usernameStatus,
        uploadAvatar, removeAvatar,
        handleProfileUpdate,
    } = useProfile();

    const [isPersonalInfoEditing, setIsPersonalInfoEditing] = useState(false);

    const [positionPicker, setPositionPicker] = useState<{
        open: boolean; field: 'position' | 'secondaryPosition'; title: string; allowEmpty: boolean;
    }>({ open: false, field: 'position', title: '', allowEmpty: false });
    const [countryPickerOpen, setCountryPickerOpen] = useState(false);

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

    if (loadError) {
        return (
            <div className="min-h-screen bg-pitch flex flex-col items-center justify-center gap-4 px-6">
                <p className="text-slate-400 text-center font-semibold">Profil yüklenemedi.</p>
                <button
                    onClick={loadProfile}
                    className="px-6 py-3 bg-turf-600 text-white rounded-xl font-bold hover:bg-turf-500 transition-colors"
                >
                    Tekrar Dene
                </button>
            </div>
        );
    }

    const usernameBorderClass = usernameStatus === 'taken'
        ? 'border-red-500/70 focus:border-red-500/70'
        : usernameStatus === 'available'
            ? 'border-green-500/70 focus:border-green-500/70'
            : '';

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

                    <form onSubmit={handleProfileUpdate} className="space-y-4 animate-fade-in">

                        {/* Kişisel Bilgiler */}
                        <div className="bg-slate-800/40 rounded-2xl border border-slate-700/60 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-turf-500"><User className="w-4 h-4" /></span>
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Kişisel Bilgiler</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsPersonalInfoEditing(v => !v)}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                        isPersonalInfoEditing
                                            ? 'bg-turf-600/20 text-turf-400'
                                            : 'hover:bg-slate-700 text-slate-500 hover:text-slate-300'
                                    }`}
                                    aria-label={isPersonalInfoEditing ? 'Düzenlemeyi kapat' : 'Düzenle'}
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* Ad Soyad */}
                                <div>
                                    <label className={labelClass}>Ad Soyad</label>
                                    {isPersonalInfoEditing ? (
                                        <input
                                            type="text"
                                            value={profileData.full_name}
                                            onChange={e => setProfileData({ ...profileData, full_name: e.target.value })}
                                            onFocus={scrollToInput}
                                            className={inputClass}
                                            placeholder="Adın Soyadın"
                                        />
                                    ) : (
                                        <div className={readonlyValueClass}>
                                            {profileData.full_name || <span className="text-slate-600">—</span>}
                                        </div>
                                    )}
                                </div>

                                {/* Kullanıcı Adı */}
                                <div>
                                    <label className={labelClass}>Kullanıcı Adı</label>
                                    {isPersonalInfoEditing ? (
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={profileData.username}
                                                onChange={e => setProfileData({ ...profileData, username: sanitizeUsernameInput(e.target.value) })}
                                                onFocus={scrollToInput}
                                                className={`${inputClass} pr-10 ${usernameBorderClass}`}
                                                placeholder="kullaniciadi"
                                                maxLength={30}
                                                autoComplete="username"
                                                autoCapitalize="none"
                                                autoCorrect="off"
                                                spellCheck={false}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <UsernameStatusIcon status={usernameStatus} />
                                            </span>
                                        </div>
                                    ) : (
                                        <div className={readonlyValueClass}>
                                            {profileData.username ? `@${profileData.username}` : <span className="text-slate-600">—</span>}
                                        </div>
                                    )}
                                    {isPersonalInfoEditing && usernameStatus === 'taken' && (
                                        <p className="mt-1.5 text-[11px] font-bold text-red-400">Bu kullanıcı adı zaten kullanılıyor.</p>
                                    )}
                                    {isPersonalInfoEditing && usernameStatus === 'available' && (
                                        <p className="mt-1.5 text-[11px] font-bold text-green-400">Bu kullanıcı adı kullanılabilir.</p>
                                    )}
                                </div>

                                {/* Doğum Tarihi */}
                                <div>
                                    <label className={labelClass}>Doğum Tarihi</label>
                                    {isPersonalInfoEditing ? (
                                        <input
                                            type="date"
                                            value={profileData.birthDate}
                                            onChange={e => setProfileData({ ...profileData, birthDate: e.target.value })}
                                            onFocus={scrollToInput}
                                            className={`${inputClass} text-left`}
                                            style={{ colorScheme: 'dark' }}
                                        />
                                    ) : (
                                        <div className={`${readonlyValueClass} flex items-center gap-2`}>
                                            <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                            <span>{profileData.birthDate ? formatDate(profileData.birthDate) : <span className="text-slate-600">—</span>}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Telefon — her zaman salt okunur */}
                                <div>
                                    <label className={labelClass}>Telefon Numarası</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                        <div className={`${readonlyValueClass} pl-10 flex items-center justify-between`}>
                                            <span>{formatPhone(profileData.phone) || <span className="text-slate-600">—</span>}</span>
                                            <Lock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Oyuncu Bilgileri */}
                        <div className="bg-slate-800/40 rounded-2xl border border-slate-700/60 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-700/60 flex items-center gap-2">
                                <span className="text-turf-500"><Shield className="w-4 h-4" /></span>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Oyuncu Bilgileri</span>
                            </div>
                            <div className="p-4 space-y-4">
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

                                <div>
                                    <label className={labelClass}>Uyruk</label>
                                    <button
                                        type="button"
                                        onClick={() => setCountryPickerOpen(true)}
                                        className="w-full bg-slate-900/80 border-2 border-slate-700 rounded-xl px-4 py-3.5 text-left text-sm font-bold text-white flex items-center justify-between hover:border-slate-600 transition-colors"
                                    >
                                        <span className="flex items-center gap-2 min-w-0">
                                            <Flag code={profileData.nationality || 'TR'} />
                                            <span className="truncate">{getCountryName(profileData.nationality || 'TR')}</span>
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving || usernameStatus === 'taken' || usernameStatus === 'checking'}
                            className="w-full bg-turf-600 hover:bg-turf-500 disabled:opacity-60 text-white py-4 rounded-2xl font-black text-base uppercase tracking-widest transition-all shadow-lg shadow-turf-600/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            {saving
                                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <><Save className="w-4 h-4" /> Kaydet</>
                            }
                        </button>
                    </form>
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

            <CountryPickerModal
                isOpen={countryPickerOpen}
                value={profileData.nationality || 'TR'}
                onSelect={code => setProfileData({ ...profileData, nationality: code })}
                onClose={() => setCountryPickerOpen(false)}
            />
        </div>
    );
};
