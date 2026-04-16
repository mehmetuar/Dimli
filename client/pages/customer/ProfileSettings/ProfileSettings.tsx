import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, User, Key } from 'lucide-react';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';
import { useProfile } from './hooks/useProfile';
import { ProfileForm } from './components/ProfileForm';
import { PasswordForm } from './components/PasswordForm';

export const ProfileSettings: React.FC = () => {
    const navigate = useNavigate();
    const {
        activeTab,
        setActiveTab,
        loading,
        saving,
        message,
        setMessage,
        businesses,
        searchQuery,
        setSearchQuery,
        profileData,
        setProfileData,
        passwordData,
        setPasswordData,
        handleToggleFavorite,
        handleProfileUpdate,
        handlePasswordChange
    } = useProfile();

    if (loading) {
        return (
            <div className="min-h-screen bg-pitch flex items-center justify-center">
                <LoadingSpinner size="lg" text="Profil yükleniyor..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-pitch pt-safe-top px-4 pb-20 overflow-x-hidden w-full max-w-full">
            <header className="flex items-center gap-4 py-4 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-8 h-8" />
                </button>
                <h1 className="font-sport font-black text-3xl text-white italic tracking-wide uppercase">
                    PROFİL AYARLARI
                </h1>
            </header>

            {/* Tabs */}
            <div className="flex bg-slate-800/50 p-1 rounded-xl mb-6">
                <button
                    onClick={() => { setActiveTab('profile'); setMessage(null); }}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'profile'
                        ? 'bg-turf-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <User className="w-4 h-4" />
                    Profil Bilgileri
                </button>
                <button
                    onClick={() => { setActiveTab('password'); setMessage(null); }}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'password'
                        ? 'bg-turf-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <Key className="w-4 h-4" />
                    Şifre Değiştir
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-xl mb-6 text-sm font-bold text-center ${message.type === 'success'
                    ? 'bg-green-500/10 border border-green-500/50 text-green-400'
                    : 'bg-red-500/10 border border-red-500/50 text-red-400'
                    }`}>
                    {message.text}
                </div>
            )}

            {activeTab === 'profile' ? (
                <ProfileForm
                    profileData={profileData}
                    setProfileData={setProfileData}
                    businesses={businesses}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    handleToggleFavorite={handleToggleFavorite}
                    handleProfileUpdate={handleProfileUpdate}
                    saving={saving}
                />
            ) : (
                <PasswordForm
                    passwordData={passwordData}
                    setPasswordData={setPasswordData}
                    handlePasswordChange={handlePasswordChange}
                    saving={saving}
                />
            )}
        </div>
    );
};
