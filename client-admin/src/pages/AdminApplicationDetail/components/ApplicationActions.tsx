import React from 'react';
import { IconCheck, IconX, IconSave, IconPause } from '../../../components/Icons';

interface ApplicationActionsProps {
    editMode: boolean;
    isPending: boolean;
    isActive: boolean;
    isSuspended: boolean;
    isDeleted: boolean;
    actionLoading: boolean;
    showRejectForm: boolean;
    setShowRejectForm: (v: boolean) => void;
    rejectReason: string;
    setRejectReason: (v: string) => void;
    handleSave: () => void;
    handleSaveAndApprove: () => void;
    approve: () => void;
    reject: () => void;
    suspend: () => void;
    activate: () => void;
    restore: () => void;
}

const ApplicationActions: React.FC<ApplicationActionsProps> = ({
    editMode, isPending, isActive, isSuspended, isDeleted, actionLoading,
    showRejectForm, setShowRejectForm,
    rejectReason, setRejectReason,
    handleSave, handleSaveAndApprove, approve, reject, suspend, activate, restore,
}) => {
    if (editMode) {
        return (
            <div className="pt-2 space-y-3">
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-300 py-3 rounded-xl font-black transition-colors disabled:opacity-50"
                    >
                        <IconSave size={16} />
                        {actionLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </button>
                    {isPending && (
                        <button
                            onClick={handleSaveAndApprove}
                            disabled={actionLoading}
                            className="flex-1 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white py-3 rounded-xl font-black transition-colors"
                        >
                            <IconCheck size={16} />
                            {actionLoading ? 'İşleniyor...' : 'Kaydet ve Onayla'}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (isDeleted) {
        return (
            <div className="space-y-3 pt-2">
                <button
                    onClick={restore}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white py-3 rounded-xl font-black transition-colors"
                >
                    <IconCheck size={16} />
                    {actionLoading ? 'Geri yükleniyor...' : 'İşletmeyi Geri Yükle'}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3 pt-2">
            {/* Onay bekleyen: Onayla / Reddet */}
            {isPending && (
                <>
                    {!showRejectForm ? (
                        <div className="flex gap-3">
                            <button
                                onClick={approve}
                                disabled={actionLoading}
                                className="flex-1 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white py-3 rounded-xl font-black transition-colors"
                            >
                                <IconCheck size={16} />
                                {actionLoading ? 'İşleniyor...' : 'Onayla'}
                            </button>
                            <button
                                onClick={() => setShowRejectForm(true)}
                                className="flex-1 flex items-center justify-center gap-2 bg-red-600/15 hover:bg-red-600/25 border border-red-500/40 text-red-300 py-3 rounded-xl font-black transition-colors"
                            >
                                <IconX size={16} />
                                Reddet
                            </button>
                        </div>
                    ) : (
                        <div className="bg-[#1e2d47] border border-red-500/30 rounded-xl p-4 space-y-3">
                            <p className="text-red-300 font-bold text-sm flex items-center gap-1.5">
                                <IconX size={14} />
                                Red Nedeni
                            </p>
                            <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="İşletmenin neden reddedildiğini yazın..."
                                rows={3}
                                className="w-full bg-[#253352] border border-slate-600/60 text-white p-3 rounded-xl focus:outline-none focus:border-red-500 resize-none text-sm placeholder-slate-500"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowRejectForm(false)}
                                    className="flex-1 bg-white/5 text-slate-300 py-2 rounded-xl font-bold text-sm hover:bg-white/10 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={reject}
                                    disabled={actionLoading || !rejectReason.trim()}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2 rounded-xl font-black text-sm transition-colors"
                                >
                                    <IconX size={14} />
                                    {actionLoading ? 'Gönderiliyor...' : 'Reddet'}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Aktif işletme: Askıya Al */}
            {isActive && (
                <button
                    onClick={suspend}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 bg-amber-600/15 hover:bg-amber-600/25 border border-amber-500/40 text-amber-300 py-3 rounded-xl font-black transition-colors disabled:opacity-50"
                >
                    <IconPause size={16} />
                    {actionLoading ? 'İşleniyor...' : 'Askıya Al'}
                </button>
            )}

            {/* Askıya alınmış işletme: Aktifleştir */}
            {isSuspended && (
                <button
                    onClick={activate}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white py-3 rounded-xl font-black transition-colors"
                >
                    <IconCheck size={16} />
                    {actionLoading ? 'İşleniyor...' : 'Askıyı Kaldır ve Aktifleştir'}
                </button>
            )}
        </div>
    );
};

export default ApplicationActions;
