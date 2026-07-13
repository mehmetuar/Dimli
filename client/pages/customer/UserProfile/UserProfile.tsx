import React from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';
import { Toast } from '../../../components/UI/Toast';

// Hooks
import { useUserProfile } from './hooks/useUserProfile';
import { useJokerHistory } from './hooks/useJokerHistory';

// Components
import { ProfileHeaderCard } from './components/ProfileHeaderCard';
import { ProfileSettingsMenu } from './components/ProfileSettingsMenu';
import { JokerHistoryModal } from './components/JokerHistoryModal';
import { LocationPermissionSheet } from '../../../components/LocationPermissionSheet';

export const UserProfile: React.FC = () => {
    const {
        currentUser,
        isLoading,
        isMenuOpen, setIsMenuOpen,
        isModalOpen, setIsModalOpen,
        errorMessage,
        successMessage,
        locationErrorType,
        liveLocation,
        isLocationUpdating,
        clearLocationError,
        handleUpdateLocation,
        calculateAge
    } = useUserProfile();

    const { matches: jokerMatches, isLoading: isJokerHistoryLoading, fetchJokerMatches } = useJokerHistory();
    const [isJokerHistoryOpen, setIsJokerHistoryOpen] = React.useState(false);

    const handleOpenJokerHistory = React.useCallback(() => {
        setIsJokerHistoryOpen(true);
        fetchJokerMatches();
    }, [fetchJokerMatches]);

    // Tam ekran spinner yalnız GERÇEK ilk yüklemede (cache boş + ilk fetch sürüyor);
    // sıcak cache'te sayfa anında render olur, veri arkada tazelenir.
    if (isLoading && !currentUser) {
        return <LoadingSpinner fullScreen text="Profil Yükleniyor..." />;
    }

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-full bg-pitch px-1 py-4 space-y-4 flex flex-col justify-center">

            {/* Profile Settings Menu */}
            <ProfileSettingsMenu
                isMenuOpen={isMenuOpen}
                setIsMenuOpen={setIsMenuOpen}
                onOpenJokerHistory={handleOpenJokerHistory}
            />

            {/* Joker Geçmişi */}
            <JokerHistoryModal
                isOpen={isJokerHistoryOpen}
                onClose={() => setIsJokerHistoryOpen(false)}
                matches={jokerMatches}
                isLoading={isJokerHistoryLoading}
            />

            {/* Main Profile Card (Avatar, Name, Stats) */}
            <ProfileHeaderCard
                currentUser={currentUser}
                liveLocation={liveLocation}
                isLocationUpdating={isLocationUpdating}
                calculateAge={calculateAge}
                handleUpdateLocation={handleUpdateLocation}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                setIsMenuOpen={setIsMenuOpen}
            />

            {/* Toast — paylaşılan üst-konum deseni (alt navbar'ın arkasında kalmaz) */}
            {successMessage && <Toast message={successMessage} type="success" />}
            {errorMessage && <Toast message={errorMessage} type="error" />}

            {/* Konum izni / GPS kapalı bottom sheet */}
            <LocationPermissionSheet
                errorType={locationErrorType}
                onClose={clearLocationError}
            />
        </div>
    );
};
