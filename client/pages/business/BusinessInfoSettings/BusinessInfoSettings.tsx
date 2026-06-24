import React from 'react';
import { Save } from 'lucide-react';
import { BusinessLoadingSpinner } from '../../../components/Business/BusinessLoadingSpinner';
import { LocationSelectionModal } from '../../../components/Modals/LocationSelectionModal';
import { LocationPermissionSheet } from '../../../components/LocationPermissionSheet';

// Hooks
import { useBusinessInfoSettings } from './hooks/useBusinessInfoSettings';

// Components
import { InfoSettingsHeader } from './components/InfoSettingsHeader';
import { BusinessInfoForm } from './components/BusinessInfoForm';
import { LocationMapModal } from './components/LocationMapModal';
import { SaveConfirmModal } from './components/SaveConfirmModal';

export const BusinessInfoSettings: React.FC = () => {
    const {
        navigate,
        loading,
        saving,
        success,
        formData,
        handleChange,
        handleSubmit,
        isLocationModalOpen, setIsLocationModalOpen,
        locationModalStep, setLocationModalStep,
        handleLocationSelect,
        showMapModal, setShowMapModal,
        mapCoords,
        mapFlyTrigger,
        isLocating,
        isGeocoding,
        mapLocationLabel,
        openMapModal,
        applyMapSelection,
        handleMapLocateMe,
        handleMapClick,
        locationErrorType, setLocationErrorType,
        showConfirmModal, setShowConfirmModal,
        handleConfirmSave,
    } = useBusinessInfoSettings();

    if (loading) return <BusinessLoadingSpinner fullScreen />;

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <InfoSettingsHeader navigate={navigate} />

            <div
                className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
                <div className="px-4 py-5 space-y-4">
                    {success && (
                        <div className="p-4 bg-green-600/20 border border-green-500/40 rounded-2xl text-green-400 font-semibold text-center text-sm">
                            ✓ Bilgileriniz başarıyla güncellendi!
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <BusinessInfoForm
                            formData={formData}
                            onChange={handleChange}
                            onOpenLocationModal={(step) => { setLocationModalStep(step); setIsLocationModalOpen(true); }}
                            onOpenMapModal={openMapModal}
                        />

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-60 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2.5"
                        >
                            <Save className="w-5 h-5" />
                            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                        </button>
                    </form>
                </div>
            </div>

            {/* ── Location Selection Modal (City/District) ─────────────────── */}
            <LocationSelectionModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                onSelect={handleLocationSelect}
                initialCity={formData.city}
                initialDistrict={formData.district}
                initialStep={locationModalStep}
            />

            {/* ── Map Location Edit Modal ──────────────────────────────────── */}
            <LocationMapModal
                isOpen={showMapModal}
                onClose={() => setShowMapModal(false)}
                mapCoords={mapCoords}
                mapFlyTrigger={mapFlyTrigger}
                isLocating={isLocating}
                isGeocoding={isGeocoding}
                mapLocationLabel={mapLocationLabel}
                onLocateMe={handleMapLocateMe}
                onMapClick={handleMapClick}
                onApply={applyMapSelection}
            />

            {/* ── Konum İzni / GPS Bottom Sheet ───────────────────────────── */}
            <LocationPermissionSheet
                errorType={locationErrorType}
                onClose={() => setLocationErrorType(null)}
            />

            {/* ── Confirmation Modal ───────────────────────────────────────── */}
            <SaveConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmSave}
            />
        </div>
    );
};
