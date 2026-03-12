import React from 'react';
import { Save, Check, X } from 'lucide-react';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';

// Hooks
import { useTeamSettings } from './hooks/useTeamSettings';

// Components
import { TeamSettingsHeader } from './components/TeamSettingsHeader';
import { TeamPreviewCard } from './components/TeamPreviewCard';
import { TeamSettingsForm } from './components/TeamSettingsForm';
import { TeamColorPicker } from './components/TeamColorPicker';

const LEVELS = [
    { value: 'BEGINNER', label: 'Başlangıç', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/40' },
    { value: 'INTERMEDIATE', label: 'Orta', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/40' },
    { value: 'ADVANCED', label: 'İleri', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/40' },
    { value: 'PRO', label: 'Profesyonel', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/40' },
];

const PRIMARY_COLORS = [
    { value: 'bg-blue-500', label: 'Mavi', hex: '#3b82f6' },
    { value: 'bg-green-500', label: 'Yeşil', hex: '#22c55e' },
    { value: 'bg-red-500', label: 'Kırmızı', hex: '#ef4444' },
    { value: 'bg-yellow-500', label: 'Sarı', hex: '#eab308' },
    { value: 'bg-purple-500', label: 'Mor', hex: '#a855f7' },
    { value: 'bg-orange-500', label: 'Turuncu', hex: '#f97316' },
    { value: 'bg-pink-500', label: 'Pembe', hex: '#ec4899' },
    { value: 'bg-cyan-500', label: 'Turkuaz', hex: '#06b6d4' },
    { value: 'bg-white', label: 'Beyaz', hex: '#ffffff' },
];

export const TeamSettings: React.FC = () => {
    const {
        isLoading,
        isSaving,
        isCaptain,
        name, setName,
        level, setLevel,
        location, setLocation,
        logoUrl, setLogoUrl,
        primaryColor, setPrimaryColor,
        secondaryColor, setSecondaryColor,
        successMessage,
        errorMessage,
        handleSave,
        navigate
    } = useTeamSettings();

    if (isLoading) return <LoadingSpinner fullScreen text="Yükleniyor..." />;

    const selectedLevel = LEVELS.find(l => l.value === level) || LEVELS[0];
    const selectedColor = PRIMARY_COLORS.find(c => c.value === primaryColor) || PRIMARY_COLORS[0];
    const selectedSecondary = PRIMARY_COLORS.find(c => c.value === secondaryColor) || PRIMARY_COLORS[4];
    const COLOR_HEX: Record<string, string> = {
        'bg-blue-500': '#3b82f6', 'bg-green-500': '#22c55e', 'bg-red-500': '#ef4444',
        'bg-yellow-500': '#eab308', 'bg-purple-500': '#a855f7', 'bg-orange-500': '#f97316',
        'bg-pink-500': '#ec4899', 'bg-cyan-500': '#06b6d4', 'bg-white': '#ffffff',
    };
    const toHex = (cls: string) => COLOR_HEX[cls] ?? '#3b82f6';

    return (
        <div className="min-h-screen bg-pitch pt-safe-top">
            {/* Header */}
            <TeamSettingsHeader isCaptain={isCaptain} navigate={navigate} />

            {/* Toast Messages */}
            {successMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500/10 border border-green-500/50 text-green-400 px-6 py-3 rounded-xl flex items-center gap-3 animate-fade-in shadow-lg backdrop-blur-sm">
                    <Check className="w-5 h-5" /><p className="font-bold text-sm">{successMessage}</p>
                </div>
            )}
            {errorMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-3 rounded-xl flex items-center gap-3 animate-fade-in shadow-lg backdrop-blur-sm">
                    <X className="w-5 h-5" /><p className="font-bold text-sm">{errorMessage}</p>
                </div>
            )}

            <div className="px-4 py-6 space-y-5 pb-28">

                {/* Logo Preview */}
                <TeamPreviewCard
                    name={name}
                    logoUrl={logoUrl}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    selectedLevel={selectedLevel}
                    toHex={toHex}
                />

                {/* Inputs */}
                <TeamSettingsForm
                    name={name} setName={setName}
                    level={level} setLevel={setLevel}
                    location={location} setLocation={setLocation}
                    logoUrl={logoUrl} setLogoUrl={setLogoUrl}
                    isCaptain={isCaptain}
                    LEVELS={LEVELS}
                />

                {/* Takım Renkleri */}
                <TeamColorPicker
                    primaryColor={primaryColor} setPrimaryColor={setPrimaryColor}
                    secondaryColor={secondaryColor} setSecondaryColor={setSecondaryColor}
                    isCaptain={isCaptain}
                    PRIMARY_COLORS={PRIMARY_COLORS}
                    selectedColor={selectedColor}
                    selectedSecondary={selectedSecondary}
                />

                {/* Save Button (bottom) */}
                {isCaptain && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-3 bg-turf-600 hover:bg-turf-500 disabled:opacity-50 text-white font-black text-lg py-4 rounded-2xl transition-all shadow-lg shadow-turf-600/20 active:scale-95"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        Değişiklikleri Kaydet
                    </button>
                )}
            </div>
        </div>
    );
};
