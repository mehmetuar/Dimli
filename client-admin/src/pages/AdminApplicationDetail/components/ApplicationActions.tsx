import React from 'react';
import { IconCheck, IconX, IconSave } from '../../../components/Icons';

interface ApplicationActionsProps {
    editMode: boolean;
    isPending: boolean;
    actionLoading: boolean;
    showRejectForm: boolean;
    setShowRejectForm: (v: boolean) => void;
    rejectReason: string;
    setRejectReason: (v: string) => void;
    handleSave: () => void;
    handleSaveAndApprove: () => void;
    approve: () => void;
    reject: () => void;
}

const ApplicationActions: React.FC<ApplicationActionsProps> = ({
    editMode, isPending, actionLoading,
    showRejectForm, setShowRejectForm,
    rejectReason, setRejectReason,
    handleSave, handleSaveAndApprove, approve, reject,
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

    if (!isPending) return null;

    return (
        <div className="space-y-3 pt-2">
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
        </div>
    );
};

export default ApplicationActions;
