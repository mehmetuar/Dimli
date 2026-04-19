import React from 'react';
import { Check, X } from 'lucide-react';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';

import { useTeamSettings } from './hooks/useTeamSettings';
import { TeamSettingsHeader } from './components/TeamSettingsHeader';
import { TeamPreviewCard } from './components/TeamPreviewCard';
import { TeamSettingsForm } from './components/TeamSettingsForm';
import { TeamColorPicker } from './components/TeamColorPicker';
import { TeamLogoManager } from './components/TeamLogoManager';

const LEVELS = [
    { value: 'BEGINNER', label: 'Başlangıç', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/40' },
    { value: 'INTERMEDIATE', label: 'Orta', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/40' },
    { value: 'ADVANCED', label: 'İleri', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/40' },
    { value: 'PRO', label: 'Profesyonel', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/40' },
];

export const TeamSettings: React.FC = () => {
    const {
        isLoading,
        isSaving,
        isUploadingLogo,
        isCaptain,
        name, setName,
        level, setLevel,
        logoUrl, setLogoUrl,
        primaryColor, setPrimaryColor,
        secondaryColor, setSecondaryColor,
        successMessage,
        errorMessage,
        uploadLogo,
        removeLogo,
        handleSave,
        navigate,
    } = useTeamSettings();

    if (isLoading) return <LoadingSpinner fullScreen text="Yükleniyor..." />;

    const selectedLevel = LEVELS.find(l => l.value === level) || LEVELS[0];

    return (
        <div className="min-h-screen bg-pitch pt-safe-top">
            <TeamSettingsHeader
                isCaptain={isCaptain}
                isSaving={isSaving}
                navigate={navigate}
                onSave={handleSave}
            />

            {/* Toast Messages */}
            {successMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500/10 border border-green-500/50 text-green-400 px-5 py-3 rounded-2xl flex items-center gap-2.5 animate-fade-in shadow-xl backdrop-blur-sm whitespace-nowrap">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <p className="font-bold text-sm">{successMessage}</p>
                </div>
            )}
            {errorMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/50 text-red-400 px-5 py-3 rounded-2xl flex items-center gap-2.5 animate-fade-in shadow-xl backdrop-blur-sm whitespace-nowrap">
                    <X className="w-4 h-4 flex-shrink-0" />
                    <p className="font-bold text-sm">{errorMessage}</p>
                </div>
            )}

            <div className="px-4 py-5 space-y-4 pb-28">

                {/* Canlı Önizleme */}
                <TeamPreviewCard
                    name={name}
                    logoUrl={logoUrl}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    levelLabel={selectedLevel.label}
                    levelStyle={`${selectedLevel.bg} ${selectedLevel.color}`}
                />

                {/* Takım Kimliği */}
                <TeamSettingsForm
                    name={name} setName={setName}
                    level={level} setLevel={setLevel}
                    isCaptain={isCaptain}
                    LEVELS={LEVELS}
                />

                {/* Logo & Görsel */}
                <TeamLogoManager
                    logoUrl={logoUrl}
                    teamName={name}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    isCaptain={isCaptain}
                    isUploading={isUploadingLogo}
                    onUpload={uploadLogo}
                    onRemove={removeLogo}
                />

                {/* Takım Renkleri */}
                <TeamColorPicker
                    primaryColor={primaryColor} setPrimaryColor={setPrimaryColor}
                    secondaryColor={secondaryColor} setSecondaryColor={setSecondaryColor}
                    isCaptain={isCaptain}
                />

                {/* Kaydet (alt) — sadece küçük ekranlar için yedek */}
                {isCaptain && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-2 bg-turf-600 hover:bg-turf-500 disabled:opacity-50 text-white font-black text-base py-4 rounded-2xl transition-all shadow-lg shadow-turf-600/20 active:scale-95"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Değişiklikleri Kaydet'
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};
