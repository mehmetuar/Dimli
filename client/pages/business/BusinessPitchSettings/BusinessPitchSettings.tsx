import React, { useRef, useState } from 'react';
import { Save, Image, Power, Calendar, AlertTriangle, X, CheckCircle, Clock, Camera } from 'lucide-react';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
import { BusinessLoadingSpinner } from '../../../components/Business/BusinessLoadingSpinner';
import { ImageCropModal } from '../../../components/Modals/ImageCropModal';
import api from '../../../services/api';

// Hooks
import { useBusinessPitchSettings } from './hooks/useBusinessPitchSettings';

// Components
import { PitchSettingsHeader } from './components/PitchSettingsHeader';
import { PitchGeneralForm } from './components/PitchGeneralForm';
import { PitchTimeSlotsSection } from './components/PitchTimeSlotsSection';
import { PitchFacilitiesSection } from './components/PitchFacilitiesSection';

const DAYS = [
    { label: 'Pzt', fullLabel: 'Pazartesi', value: 'Monday' },
    { label: 'Sal', fullLabel: 'Salı',      value: 'Tuesday' },
    { label: 'Çar', fullLabel: 'Çarşamba',  value: 'Wednesday' },
    { label: 'Per', fullLabel: 'Perşembe',  value: 'Thursday' },
    { label: 'Cum', fullLabel: 'Cuma',      value: 'Friday' },
    { label: 'Cmt', fullLabel: 'Cumartesi', value: 'Saturday' },
    { label: 'Paz', fullLabel: 'Pazar',     value: 'Sunday' },
];

export const BusinessPitchSettings: React.FC = () => {
    const {
        navigate,
        loading,
        saving,
        success,
        newFacility, setNewFacility,
        showFacilityModal, setShowFacilityModal,
        submittingFacility,
        showPhotoModal, setShowPhotoModal,
        submittingPhoto,
        timeSlots,
        newSlotStart, setNewSlotStart,
        newSlotEnd, setNewSlotEnd,
        savingSlots,
        slotsSuccess,
        slotConflictModal, setSlotConflictModal,
        isTimePickerOpen, setIsTimePickerOpen,
        formData,
        allFacilities,
        conflictModal, setConflictModal,
        togglingStatus,
        savingClosedDays,
        closedDaysSuccess,
        changeRequestSentModal, setChangeRequestSentModal,
        hasPendingPhoto,
        hasPendingFacility,
        handleSubmit,
        handleFacilityToggle,
        handleSubmitFacilityRequest,
        handleSubmitPhotoRequest,
        handleChange,
        handleAddSlot,
        handleRemoveSlot,
        handleSaveSlots,
        toggleActive,
        handleClosedDayToggle,
    } = useBusinessPitchSettings();

    // ── Onay modalleri için yerel state ──────────────────────────────────────
    const [statusConfirm, setStatusConfirm] = useState(false);
    const [dayConfirm, setDayConfirm] = useState<{ show: boolean; day: string | null }>({
        show: false,
        day: null,
    });

    // Fotoğraf yükleme state'i
    const [cropFile, setCropFile] = useState<File | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

    if (loading) return <BusinessLoadingSpinner fullScreen />;

    const pendingDayLabel = dayConfirm.day
        ? DAYS.find(d => d.value === dayConfirm.day)?.fullLabel ?? dayConfirm.day
        : '';
    const pendingDayIsClosed = dayConfirm.day
        ? formData.closedDays.includes(dayConfirm.day)
        : false;

    const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCropFile(file);
        }
        // Reset input so same file can be selected again
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
            const imageUrl = uploadResp.data.url;
            await handleSubmitPhotoRequest(imageUrl);
        } catch (error) {
            console.error('Photo upload error:', error);
            alert('Fotoğraf yüklenirken hata oluştu.');
        } finally {
            setUploadingPhoto(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24 relative">
            <PitchSettingsHeader name={formData.name} navigate={navigate} />

            {success && (
                <div className="mx-4 mt-4 p-4 bg-green-600/20 border border-green-500 rounded-xl text-green-500 font-bold text-center">
                    ✓ Ayarlar başarıyla güncellendi!
                </div>
            )}

            <div className="p-4 space-y-6">

                {/* ── Saha Durumu (Aktif / Pasif toggle) ──────────────────── */}
                <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 pr-4">
                            <h2 className="text-lg font-bold text-orange-500 flex items-center gap-2 mb-1">
                                <Power className="w-5 h-5" /> Saha Durumu
                            </h2>
                            <p className="text-sm text-slate-400">
                                {formData.isActive
                                    ? 'Saha aktif — müşteriler rezervasyon yapabilir'
                                    : 'Saha pasif — yeni rezervasyonlar alınmıyor'}
                            </p>
                        </div>
                        {/* Toggle switch — onay modalı açar */}
                        <button
                            type="button"
                            onClick={() => setStatusConfirm(true)}
                            disabled={togglingStatus}
                            className={`relative w-14 h-7 rounded-full transition-colors flex-shrink-0 ${formData.isActive ? 'bg-green-500' : 'bg-slate-600'
                                } disabled:opacity-50`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${formData.isActive ? 'translate-x-7' : 'translate-x-0'
                                }`} />
                        </button>
                    </div>
                    {!formData.isActive && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-xs text-red-400 font-medium">
                                Bu saha müşterilere kapalı. Aktifleştirmek için tekrar tıklayın.
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Kapalı Günler ────────────────────────────────────────── */}
                <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-orange-500 flex items-center gap-2">
                            <Calendar className="w-5 h-5" /> Kapalı Günler
                        </h2>
                        {closedDaysSuccess && (
                            <span className="text-xs text-green-400 font-bold">✓ Kaydedildi</span>
                        )}
                        {savingClosedDays && (
                            <span className="text-xs text-slate-400">Kaydediliyor...</span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mb-4">
                        Sahanın her hafta kapalı olduğu günleri seçin. Bu günlerde saha müşterilere kapalı gösterilir.
                    </p>
                    <div className="grid grid-cols-7 gap-1.5">
                        {DAYS.map(day => {
                            const isClosed = formData.closedDays.includes(day.value);
                            return (
                                <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => setDayConfirm({ show: true, day: day.value })}
                                    disabled={savingClosedDays}
                                    className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${isClosed
                                        ? 'bg-red-500/20 border-red-500 text-red-400'
                                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                                        } disabled:opacity-50`}
                                >
                                    {day.label}
                                </button>
                            );
                        })}
                    </div>
                    {formData.closedDays.length > 0 && (
                        <p className="text-xs text-slate-500 mt-3">
                            Kapalı: {formData.closedDays.map(d => DAYS.find(x => x.value === d)?.label).filter(Boolean).join(', ')}
                        </p>
                    )}
                </div>

                {/* ── Genel Ayarlar, Slot ve İmkânlar ─────────────────────── */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <PitchGeneralForm
                        formData={formData}
                        isTimePickerOpen={isTimePickerOpen}
                        setIsTimePickerOpen={setIsTimePickerOpen}
                        handleChange={handleChange}
                    />

                    <PitchTimeSlotsSection
                        timeSlots={timeSlots}
                        newSlotStart={newSlotStart}
                        newSlotEnd={newSlotEnd}
                        savingSlots={savingSlots}
                        slotsSuccess={slotsSuccess}
                        slotError=""
                        pitchOpenTime={formData.openTime || undefined}
                        pitchCloseTime={formData.closeTime || undefined}
                        isTimePickerOpen={isTimePickerOpen}
                        setIsTimePickerOpen={(s) => setIsTimePickerOpen(s)}
                        setNewSlotStart={setNewSlotStart}
                        setNewSlotEnd={setNewSlotEnd}
                        onAddSlot={handleAddSlot}
                        onRemoveSlot={handleRemoveSlot}
                        onSaveSlots={handleSaveSlots}
                    />

                    {/* ── Saha Fotoğrafı ───────────────────────────────────── */}
                    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                        {formData.imageUrl ? (
                            <img
                                src={formData.imageUrl}
                                alt={formData.name}
                                className="w-full h-48 object-cover"
                            />
                        ) : (
                            <div className="w-full h-48 bg-slate-900 flex items-center justify-center">
                                <Image className="w-10 h-10 text-slate-600" />
                            </div>
                        )}
                        <div className="bg-slate-800 px-4 py-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Image className="w-4 h-4 text-slate-400" />
                                <span className="text-xs text-slate-400">Saha fotoğrafı</span>
                            </div>
                            {hasPendingPhoto ? (
                                <div className="flex items-center gap-1 text-yellow-400">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="text-xs font-medium">İnceleme bekliyor</span>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    disabled={uploadingPhoto || submittingPhoto}
                                    onClick={() => photoInputRef.current?.click()}
                                    className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <Camera className="w-3.5 h-3.5" />
                                    {uploadingPhoto || submittingPhoto ? 'Yükleniyor...' : 'Fotoğrafı Güncelle'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Gizli file input */}
                    <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoFileChange}
                    />

                    <PitchFacilitiesSection
                        allFacilities={allFacilities}
                        selectedFacilities={formData.facilities}
                        onToggle={handleFacilityToggle}
                        onOpenModal={() => setShowFacilityModal(true)}
                        hasPendingFacility={hasPendingFacility}
                    />

                    <div className="pt-4">
                        <button type="submit" disabled={saving}
                            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider transition-colors shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2">
                            <Save className="w-5 h-5" />
                            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                        </button>
                    </div>
                </form>
            </div>

            <BusinessNavbar />

            {/* ── ImageCrop Modal (fotoğraf seçilince açılır) ──────────── */}
            {cropFile && (
                <ImageCropModal
                    file={cropFile}
                    onCrop={handleCropComplete}
                    onCancel={() => setCropFile(null)}
                />
            )}

            {/* ── Manuel İmkan Ekleme Modalı ───────────────────────────── */}
            {showFacilityModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5">
                    <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-600 shadow-2xl">
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white text-base">Manuel İmkan Ekle</h3>
                                <button
                                    type="button"
                                    onClick={() => { setShowFacilityModal(false); setNewFacility(''); }}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-sm text-slate-400 mb-4">
                                Listede olmayan bir imkan eklemek istiyorsanız buraya yazın. İnceleme sonrası yayınlanacaktır.
                            </p>
                            <input
                                type="text"
                                value={newFacility}
                                onChange={(e) => setNewFacility(e.target.value)}
                                placeholder="İmkan adı (ör: Çocuk Parkuru)"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 mb-4"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmitFacilityRequest(); } }}
                            />
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowFacilityModal(false); setNewFacility(''); }}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold transition-colors"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmitFacilityRequest}
                                    disabled={!newFacility.trim() || submittingFacility}
                                    className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white py-3 rounded-xl font-bold transition-colors"
                                >
                                    {submittingFacility ? 'Gönderiliyor...' : 'İstek Gönder'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Değişiklik İsteği Gönderildi Modalı ─────────────────── */}
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
                                Değişiklik isteğiniz gönderildi. En kısa sürede inceleme sonrası yayına alınacaktır.
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

            {/* ── Saat Slotu Çakışma Modalı ────────────────────────────── */}
            {slotConflictModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5">
                    <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-yellow-500/40 shadow-2xl">
                        <div className="p-5">
                            <div className="flex items-start gap-3 mb-5">
                                <div className="p-2 bg-yellow-500/20 rounded-xl flex-shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base">Saat Slotu Eklenemedi</h3>
                                    <p className="text-sm text-slate-400 mt-1">{slotConflictModal.message}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSlotConflictModal({ show: false, message: '' })}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold transition-colors"
                            >
                                Tamam
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Saha Durumu Onay Modalı ───────────────────────────────── */}
            {statusConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5">
                    <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-600 shadow-2xl">
                        <div className="p-5">
                            <div className="flex items-start gap-3 mb-5">
                                <div className={`p-2 rounded-xl flex-shrink-0 ${formData.isActive ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                                    <Power className={`w-5 h-5 ${formData.isActive ? 'text-red-400' : 'text-green-400'}`} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base">
                                        {formData.isActive ? 'Sahayı Pasife Al' : 'Sahayı Aktifleştir'}
                                    </h3>
                                    <p className="text-sm text-slate-400 mt-1">
                                        {formData.isActive
                                            ? 'Saha pasife alındığında müşteriler rezervasyon yapamaz. Emin misiniz?'
                                            : 'Saha aktifleştirildiğinde müşteriler rezervasyon yapabilir. Emin misiniz?'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStatusConfirm(false)}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold transition-colors"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    onClick={() => { setStatusConfirm(false); toggleActive(); }}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-colors text-white ${formData.isActive
                                        ? 'bg-red-600 hover:bg-red-500'
                                        : 'bg-green-600 hover:bg-green-500'}`}
                                >
                                    {formData.isActive ? 'Pasife Al' : 'Aktifleştir'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Kapalı Gün Onay Modalı ───────────────────────────────── */}
            {dayConfirm.show && dayConfirm.day && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5">
                    <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-600 shadow-2xl">
                        <div className="p-5">
                            <div className="flex items-start gap-3 mb-5">
                                <div className={`p-2 rounded-xl flex-shrink-0 ${pendingDayIsClosed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                    <Calendar className={`w-5 h-5 ${pendingDayIsClosed ? 'text-green-400' : 'text-red-400'}`} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base">
                                        {pendingDayIsClosed
                                            ? `${pendingDayLabel} günü açılsın mı?`
                                            : `${pendingDayLabel} günü kapatılsın mı?`}
                                    </h3>
                                    <p className="text-sm text-slate-400 mt-1">
                                        {pendingDayIsClosed
                                            ? `${pendingDayLabel} günleri tekrar aktif hale gelecek ve rezervasyon alınabilecek.`
                                            : `${pendingDayLabel} günleri saha kapalı olacak ve müşteriler rezervasyon yapamayacak.`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDayConfirm({ show: false, day: null })}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold transition-colors"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    onClick={() => {
                                        handleClosedDayToggle(dayConfirm.day!);
                                        setDayConfirm({ show: false, day: null });
                                    }}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-colors text-white ${pendingDayIsClosed
                                        ? 'bg-green-600 hover:bg-green-500'
                                        : 'bg-red-600 hover:bg-red-500'}`}
                                >
                                    {pendingDayIsClosed ? 'Evet, Aç' : 'Evet, Kapat'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Kesinleşmiş Maç Çakışma Modalı ──────────────────────── */}
            {conflictModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5">
                    <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-red-500/40 shadow-2xl">
                        <div className="p-5">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="p-2 bg-red-500/20 rounded-xl flex-shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base">Sahayı Pasife Alamazsınız</h3>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Bu sahada kesinleşmiş maçlar var. Pasife almak için önce aşağıdaki maçları iptal etmeniz gerekiyor.
                                    </p>
                                </div>
                            </div>

                            {conflictModal.conflicts.length > 0 && (
                                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                                    {conflictModal.conflicts.map((c: any, i: number) => (
                                        <div key={i} className="bg-slate-900 p-3 rounded-xl border border-slate-700">
                                            <p className="text-sm font-bold text-white">
                                                {new Date(c.slotTime).toLocaleDateString('tr-TR', {
                                                    weekday: 'short', day: 'numeric', month: 'short'
                                                })}
                                                {' — '}
                                                {new Date(c.slotTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">{c.teamName}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => setConflictModal({ show: false, conflicts: [] })}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                <X className="w-4 h-4" /> Tamam
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
