import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';
import { Toast } from '../../../components/UI/Toast';

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
        dirtyFields,
        isDirty,
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
        <div className="fixed inset-0 bg-pitch flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <TeamSettingsHeader
                isCaptain={isCaptain}
                navigate={navigate}
            />

            {/* Toast — paylaşılan üst-konum deseni (başlıkla çakışmaz) */}
            {successMessage && <Toast message={successMessage} type="success" />}
            {errorMessage && <Toast message={errorMessage} type="error" />}

            <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                <div className="max-w-lg mx-auto px-4 py-5 space-y-4" style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}>

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
                        isDirty={dirtyFields.name || dirtyFields.level}
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
                        isDirty={dirtyFields.primaryColor || dirtyFields.secondaryColor}
                    />

                    {/* Kaydet (alt) — durum-duyarlı: değişiklik yoksa pasif, varsa
                        üstünde amber hatırlatma + aktif buton (tek kayıt noktası) */}
                    {isCaptain && (
                        <div className="space-y-2.5 pt-1">
                            {isDirty && (
                                <div className="flex items-center justify-center gap-1.5 animate-fade-in">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                    <p className="text-amber-400 text-xs font-semibold">Kaydedilmemiş değişikliklerin var</p>
                                </div>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !isDirty}
                                className={`w-full flex items-center justify-center gap-2 font-black text-base py-4 rounded-2xl transition-all active:scale-95 ${
                                    isDirty
                                        ? 'bg-turf-600 hover:bg-turf-500 text-white shadow-lg shadow-turf-600/20'
                                        : 'bg-slate-800/80 text-slate-500 border border-slate-700/60'
                                } disabled:active:scale-100`}
                            >
                                {isSaving ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : isDirty ? (
                                    'Değişiklikleri Kaydet'
                                ) : (
                                    'Kaydedilecek değişiklik yok'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
