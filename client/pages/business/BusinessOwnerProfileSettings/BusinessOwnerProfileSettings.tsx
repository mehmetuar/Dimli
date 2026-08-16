import React from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import { BusinessLoadingSpinner } from '../../../components/Business/BusinessLoadingSpinner';
import { ConfirmModal } from '../../../components/Modals/ConfirmModal';
import { useKeyboardHeight } from '../../../utils/useKeyboardHeight';
import { primaryButton, noticeText } from '../shared/formStyles';

import { useBusinessOwnerProfile } from './hooks/useBusinessOwnerProfile';
import { OwnerProfileHeader } from './components/OwnerProfileHeader';
import { OwnerProfileForm } from './components/OwnerProfileForm';

export const BusinessOwnerProfileSettings: React.FC = () => {
    const {
        navigate,
        loading,
        saving,
        success,
        formData,
        phone,
        fieldErrors,
        handleChange,
        handleSubmit,
        showConfirmModal, setShowConfirmModal,
        handleConfirmSave,
    } = useBusinessOwnerProfile();

    const keyboardHeight = useKeyboardHeight();

    if (loading) return <BusinessLoadingSpinner fullScreen />;

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <OwnerProfileHeader navigate={navigate} />

            <div
                className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
                <div
                    className="px-4 py-5 space-y-6"
                    style={{
                        // Klavye açıkken kb navDp'yi zaten içerir (§102) — safe-bottom EKLENMEZ (çift sayım)
                        paddingBottom: keyboardHeight > 0
                            ? `calc(${keyboardHeight}px + env(safe-area-inset-bottom) + 1.25rem)`
                            : 'calc(var(--safe-bottom) + 1.25rem)',
                    }}
                >
                    {success && (
                        <div className="p-4 bg-green-600/20 border border-green-500/40 rounded-2xl text-green-400 font-semibold text-center flex items-center justify-center gap-2" style={noticeText}>
                            <ShieldCheck className="w-4 h-4 shrink-0" /> Bilgileriniz başarıyla güncellendi!
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <OwnerProfileForm
                            formData={formData}
                            phone={phone}
                            fieldErrors={fieldErrors}
                            onChange={handleChange}
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

            {/* ── Kaydetme Onayı ───────────────────────────────────────────── */}
            <ConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmSave}
                title="Değişiklikleri Kaydet"
                message="Yetkili bilgileriniz güncellensin mi?"
                confirmText="Evet, Kaydet"
                cancelText="Vazgeç"
                accentColor="orange"
            />
        </div>
    );
};
