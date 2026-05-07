import React from 'react';
import {
    IconChevronLeft, IconClock, IconCheck, IconX, IconPause, IconPending,
    IconEdit, IconSave,
} from '../../../components/Icons';

const STATUS_CONFIG: Record<string, {
    label: string; classes: string; Icon: React.FC<{ size?: number; className?: string }>;
}> = {
    active:    { label: 'Onaylandı',     classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', Icon: IconCheck },
    rejected:  { label: 'Reddedildi',    classes: 'bg-red-500/15 text-red-300 border-red-500/30',            Icon: IconX },
    suspended: { label: 'Askıya Alındı', classes: 'bg-slate-500/15 text-slate-300 border-slate-500/30',      Icon: IconPause },
    pending:   { label: 'Bekliyor',      classes: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',   Icon: IconPending },
};

interface ApplicationHeaderProps {
    app: any;
    editMode: boolean;
    setEditMode: (v: boolean) => void;
    actionLoading: boolean;
    message: { text: string; type: 'success' | 'error' } | null;
    setMessage: (m: null) => void;
    handleCancelEdit: () => void;
    handleSave: () => void;
    navigate: (delta: number) => void;
}

const ApplicationHeader: React.FC<ApplicationHeaderProps> = ({
    app, editMode, setEditMode, actionLoading, message, setMessage,
    handleCancelEdit, handleSave, navigate,
}) => {
    const statusCfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.pending;
    const StatusIcon = statusCfg.Icon;

    return (
        <>
            <div className="flex items-center gap-3 mb-6 flex-wrap">
                <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-400 hover:text-[#dde8f5] text-sm font-bold transition-colors">
                    <IconChevronLeft size={16} />
                    Geri
                </button>
                <h1 className="text-xl font-black text-[#dde8f5]">{app.name}</h1>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${statusCfg.classes}`}>
                    <StatusIcon size={11} />
                    {statusCfg.label}
                </span>
                {app.reviewedAt && (
                    <span className="flex items-center gap-1 text-slate-500 text-xs ml-auto">
                        <IconClock size={11} />
                        {app.status === 'active' ? 'Onaylandı' : 'İşlendi'}: {new Date(app.reviewedAt).toLocaleDateString('tr-TR')}
                    </span>
                )}
                {!editMode ? (
                    <button
                        onClick={() => setEditMode(true)}
                        className="flex items-center gap-1.5 ml-auto bg-[#1e2d47] hover:bg-[#253352] border border-slate-600/50 text-slate-300 hover:text-orange-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    >
                        <IconEdit size={13} />
                        Düzenle
                    </button>
                ) : (
                    <div className="flex items-center gap-2 ml-auto">
                        <button onClick={handleCancelEdit} className="bg-white/5 hover:bg-white/10 border border-slate-600/50 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all">
                            İptal
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                        >
                            <IconSave size={13} />
                            {actionLoading ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                )}
            </div>

            {message && (
                <div className={`border p-4 rounded-xl mb-6 font-bold text-sm flex items-center gap-2 ${message.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                    {message.type === 'success' ? <IconCheck size={16} className="shrink-0" /> : <IconX size={16} className="shrink-0" />}
                    {message.text}
                    <button onClick={() => setMessage(null)} className="ml-auto opacity-60 hover:opacity-100"><IconX size={14} /></button>
                </div>
            )}
        </>
    );
};

export default ApplicationHeader;
