import React, { useRef, useState } from 'react';
import { Save, ShieldCheck, Image, Clock, Camera, CheckCircle } from 'lucide-react';
import api from '../../../services/api';
import { BusinessLoadingSpinner } from '../../../components/Business/BusinessLoadingSpinner';
import { LocationPermissionSheet } from '../../../components/LocationPermissionSheet';
import { ImageCropModal } from '../../../components/Modals/ImageCropModal';
import { useKeyboardHeight } from '../../../utils/useKeyboardHeight';
import { primaryButton, noticeText } from '../shared/formStyles';

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
        coverImageUrl,
        hasPendingPhoto,
        submittingPhoto,
        handleSubmitPhotoRequest,
        changeRequestSentModal, setChangeRequestSentModal,
    } = useBusinessInfoSettings();

    const keyboardHeight = useKeyboardHeight();

    // Fotoğraf yükleme state'i (BusinessPitchSettings ile aynı desen)
    const [cropFile, setCropFile] = useState<File | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [pendingPhotoUrl, setPendingPhotoUrl] = useState<string | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    if (loading) return <BusinessLoadingSpinner fullScreen />;

    const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setCropFile(file);
        e.target.value = '';
    };

    const handleCropComplete = async (croppedFile: File) => {
        setCropFile(null);
        setUploadingPhoto(true);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('file', croppedFile);
            const uploadResp = await api.post('/files/upload', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setPendingPhotoUrl(uploadResp.data.url);
        } catch (error) {
            console.error('Photo upload error:', error);
            alert('Fotoğraf yüklenirken hata oluştu.');
        } finally {
            setUploadingPhoto(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <InfoSettingsHeader navigate={navigate} />

            <div
                className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
                <div
                    className="px-4 py-5 space-y-4"
                    style={{ paddingBottom: `calc(${keyboardHeight}px + env(safe-area-inset-bottom) + 1.25rem)` }}
                >
                    {success && (
                        <div className="p-4 bg-green-600/20 border border-green-500/40 rounded-2xl text-green-400 font-semibold text-center flex items-center justify-center gap-2" style={noticeText}>
                            <ShieldCheck className="w-4 h-4 shrink-0" /> Bilgileriniz başarıyla güncellendi!
                        </div>
                    )}

                    {/* ── İşletme Fotoğrafı (değişiklik admin onayına düşer) ──── */}
                    <div className="bg-slate-800/70 rounded-2xl border border-slate-700/60 overflow-hidden"
                        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                        <div className="px-4 py-3.5 border-b border-slate-700/50"
                            style={{ background: 'linear-gradient(90deg, rgba(249,115,22,0.06) 0%, transparent 100%)' }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 bg-orange-500/15 rounded-lg border border-orange-500/20">
                                        <Image className="w-4 h-4 text-orange-400" />
                                    </div>
                                    <h2 className="text-[clamp(13px,3.8vw,15px)] font-black text-white">İşletme Fotoğrafı</h2>
                                </div>
                                {hasPendingPhoto && (
                                    <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/25 px-2.5 py-1 rounded-full">
                                        <Clock className="w-3 h-3 text-yellow-400" />
                                        <span className="text-[clamp(9px,2.5vw,11px)] text-yellow-400 font-bold">İnceleme bekliyor</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {pendingPhotoUrl ? (
                            <>
                                <img src={pendingPhotoUrl} alt="Önizleme" className="w-full aspect-video object-cover" />
                                <div className="px-4 py-3.5 flex gap-2.5 bg-slate-900/30">
                                    <button
                                        type="button"
                                        disabled={submittingPhoto}
                                        onClick={() => setPendingPhotoUrl(null)}
                                        className="flex-1 bg-slate-700/80 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-bold px-3 py-3 rounded-xl transition-colors"
                                        style={{ WebkitTapHighlightColor: 'transparent' }}
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="button"
                                        disabled={submittingPhoto}
                                        onClick={async () => { await handleSubmitPhotoRequest(pendingPhotoUrl); setPendingPhotoUrl(null); }}
                                        className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-600 text-white text-sm font-bold px-3 py-3 rounded-xl transition-colors"
                                        style={{ WebkitTapHighlightColor: 'transparent' }}
                                    >
                                        <Camera className="w-4 h-4" />
                                        {submittingPhoto ? 'Gönderiliyor...' : 'Onay İsteği Gönder'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {coverImageUrl ? (
                                    <img src={coverImageUrl} alt={formData.name} className="w-full aspect-video object-cover" />
                                ) : (
                                    <div className="w-full aspect-video bg-slate-900/60 flex flex-col items-center justify-center gap-2">
                                        <Image className="w-10 h-10 text-slate-600" />
                                        <span className="text-[clamp(10px,2.8vw,12px)] text-slate-600 font-medium">Fotoğraf yok</span>
                                    </div>
                                )}
                                {!hasPendingPhoto && (
                                    <div className="px-4 py-3.5 bg-slate-900/30">
                                        <button
                                            type="button"
                                            disabled={uploadingPhoto || submittingPhoto}
                                            onClick={() => photoInputRef.current?.click()}
                                            className="w-full flex items-center justify-center gap-2 bg-slate-700/80 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-bold px-3 py-3 rounded-xl transition-colors"
                                            style={{ WebkitTapHighlightColor: 'transparent' }}
                                        >
                                            <Camera className="w-4 h-4" />
                                            {uploadingPhoto ? 'Yükleniyor...' : 'Fotoğrafı Güncelle'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Gizli file input */}
                    <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoFileChange}
                    />

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <BusinessInfoForm
                            formData={formData}
                            onChange={handleChange}
                            onOpenMapModal={openMapModal}
                        />

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-60 text-white rounded-2xl font-bold transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2.5"
                            style={primaryButton}
                        >
                            {saving
                                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <Save className="w-5 h-5" />}
                            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                        </button>
                    </form>
                </div>
            </div>

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

            {/* ── ImageCrop Modal (fotoğraf seçilince açılır) ──────────────── */}
            {cropFile && (
                <ImageCropModal
                    file={cropFile}
                    onCrop={handleCropComplete}
                    onCancel={() => setCropFile(null)}
                />
            )}

            {/* ── Değişiklik İsteği Gönderildi Modalı ──────────────────────── */}
            {changeRequestSentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5">
                    <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-green-500/40 shadow-2xl">
                        <div className="p-5 text-center">
                            <div className="flex justify-center mb-4">
                                <div className="p-3 bg-green-500/20 rounded-full">
                                    <CheckCircle className="w-8 h-8 text-green-400" />
                                </div>
                            </div>
                            <h3 className="font-bold text-white text-base mb-2">İstek Gönderildi</h3>
                            <p className="text-sm text-slate-400 mb-5">
                                Fotoğraf değişiklik isteğiniz gönderildi. En kısa sürede inceleme sonrası yayına alınacaktır.
                            </p>
                            <button
                                type="button"
                                onClick={() => setChangeRequestSentModal(false)}
                                className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold transition-colors"
                            >
                                Tamam
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
