import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';

// Hooks
import { useUserProfile } from './hooks/useUserProfile';

// Components
import { ProfileHeaderCard } from './components/ProfileHeaderCard';
import { ProfileSettingsMenu } from './components/ProfileSettingsMenu';

export const UserProfile: React.FC = () => {
    const navigate = useNavigate();
    const {
        currentUser,
        isLoading,
        isMenuOpen, setIsMenuOpen,
        isModalOpen, setIsModalOpen,
        errorMessage,
        successMessage,
        handleUpdateLocation,
        calculateAge
    } = useUserProfile();

    if (isLoading) {
        return <LoadingSpinner fullScreen text="Profil Yükleniyor..." />;
    }

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-pitch flex flex-col items-center justify-center text-white gap-4">
                <p>Kullanıcı bulunamadı. Lütfen giriş yapın.</p>
                <button
                    onClick={() => navigate('/login')}
                    className="px-6 py-3 bg-turf-600 text-white font-bold rounded-xl hover:bg-turf-500 transition-colors"
                >
                    Giriş Yap
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-pitch pb-24 relative p-4 space-y-4">

            {/* Profile Settings Menu */}
            <ProfileSettingsMenu
                isMenuOpen={isMenuOpen}
                setIsMenuOpen={setIsMenuOpen}
            />

            {/* Main Profile Card (Avatar, Name, Stats) */}
            <ProfileHeaderCard
                currentUser={currentUser}
                calculateAge={calculateAge}
                handleUpdateLocation={handleUpdateLocation}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                setIsMenuOpen={setIsMenuOpen}
            />

            {/* Toast Messages */}
            {successMessage && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-green-500/10 border border-green-500/50 text-green-400 px-6 py-3 rounded-xl text-center shadow-lg backdrop-blur-sm animate-fade-in whitespace-nowrap">
                    <p className="font-bold text-sm">{successMessage}</p>
                </div>
            )}
            {errorMessage && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-3 rounded-xl text-center shadow-lg backdrop-blur-sm animate-fade-in whitespace-nowrap">
                    <p className="font-bold text-sm">{errorMessage}</p>
                </div>
            )}
        </div>
    );
};
