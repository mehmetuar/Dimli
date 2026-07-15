import React from 'react';
import {
    IconClock, IconCheck, IconX, IconPause, IconPending,
    IconChevronRight, IconPitch, IconAlertCircle,
} from '../../components/Icons';
import SearchInput from '../../components/SearchInput';
import Pagination from '../../components/Pagination';
import { useApplicationsList } from './hooks/useApplicationsList';

type Status = 'pending' | 'active' | 'rejected' | 'suspended';

const STATUS_CONFIG: Record<Status, {
    label: string;
    pageTitle: string;
    pageDesc: string;
    badgeClass: string;
    headerBg: string;
    iconColor: string;
    Icon: React.FC<{ size?: number; className?: string }>;
}> = {
    pending: {
        label: 'Bekleyen',
        pageTitle: 'Bekleyen Başvurular',
        pageDesc: 'İnceleme bekleyen işletme başvuruları',
        badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        headerBg: 'text-yellow-300',
        iconColor: 'text-yellow-400',
        Icon: IconPending,
    },
    active: {
        label: 'Onaylı',
        pageTitle: 'Onaylı İşletmeler',
        pageDesc: 'Platformda aktif olarak hizmet veren işletmeler',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        headerBg: 'text-emerald-300',
        iconColor: 'text-emerald-400',
        Icon: IconCheck,
    },
    rejected: {
        label: 'Reddedilen',
        pageTitle: 'Reddedilen Başvurular',
        pageDesc: 'Onaylanmayan işletme başvuruları',
        badgeClass: 'bg-red-500/20 text-red-300 border-red-500/30',
        headerBg: 'text-red-300',
        iconColor: 'text-red-400',
        Icon: IconX,
    },
    suspended: {
        label: 'Askıda',
        pageTitle: 'Askıya Alınan İşletmeler',
        pageDesc: 'Geçici olarak devre dışı bırakılan işletmeler',
        badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
        headerBg: 'text-slate-300',
        iconColor: 'text-slate-400',
        Icon: IconPause,
    },
};

const parseFacilitiesCount = (raw: string[] | string | null | undefined): number => {
    if (!raw) return 0;
    if (Array.isArray(raw)) return raw.filter(f => f && f.trim().length > 0).length;
    if (typeof raw === 'string' && raw.length > 0) return raw.split(',').filter(Boolean).length;
    return 0;
};

interface ApplicationsListProps {
    status: Status;
}

const ApplicationsList: React.FC<ApplicationsListProps> = ({ status }) => {
    const {
        applications, total, totalPages, page, setPage,
        search, setSearch, loading, navigate,
        processingId, toast, suspend, activate,
    } = useApplicationsList(status);
    const cfg = STATUS_CONFIG[status];
    const { Icon } = cfg;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {toast && (
                <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-2 border
                    ${toast.type === 'success'
                        ? 'bg-emerald-900/90 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-900/90 border-red-500/40 text-red-300'}`}
                >
                    {toast.type === 'success' ? <IconCheck size={14} /> : <IconAlertCircle size={14} />}
                    {toast.text}
                </div>
            )}
            <div className="flex items-center gap-3 mb-6">
                <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center ${cfg.iconColor}`}>
                    <Icon size={18} />
                </div>
                <div>
                    <h1 className={`text-xl font-black ${cfg.headerBg}`}>{cfg.pageTitle}</h1>
                    <p className="text-[#7b9ab8] text-xs">{cfg.pageDesc}</p>
                </div>
                <span className="ml-auto text-[#7b9ab8] text-sm font-bold">
                    {!loading && `${total} kayıt`}
                </span>
            </div>

            <div className="mb-4">
                <SearchInput value={search} onChange={setSearch} placeholder="İşletme, şehir veya sahip ara..." />
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white/5 border border-slate-700/40 rounded-2xl p-5 animate-pulse h-20" />
                    ))}
                </div>
            ) : applications.length === 0 ? (
                <div className="text-center py-24">
                    <div className={`w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 ${cfg.iconColor}`}>
                        <Icon size={28} className="opacity-40" />
                    </div>
                    <p className="font-bold text-[#dde8f5]">Kayıt bulunamadı</p>
                    <p className="text-xs mt-1 text-[#7b9ab8]">Bu kategoride herhangi bir başvuru yok</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {applications.map(app => {
                        const totalFacilities = (app.pitches ?? []).reduce(
                            (acc: number, p: any) => acc + parseFacilitiesCount(p.facilities), 0
                        );
                        const hasHours = app.openTime && app.closeTime;
                        const resubmitCount = (app.reviewHistory ?? []).filter(
                            (e: any) => e.action === 'resubmitted'
                        ).length;

                        return (
                            <div
                                key={app.id}
                                onClick={() => navigate(`/applications/${app.id}`)}
                                className="bg-[#1e2d47] border border-slate-700/40 rounded-2xl p-5 cursor-pointer hover:border-slate-500/60 hover:bg-[#243458] transition-all flex items-center justify-between gap-4 group"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2.5 mb-1.5">
                                        <h3 className="font-black text-[#dde8f5] truncate group-hover:text-orange-300 transition-colors">
                                            {app.name}
                                        </h3>
                                        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}>
                                            {cfg.label}
                                        </span>
                                        {status === 'pending' && resubmitCount > 0 && (
                                            <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border bg-orange-500/20 text-orange-300 border-orange-500/30">
                                                ↻ Tekrar ×{resubmitCount}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[#7b9ab8] text-sm">
                                        {app.city} / {app.district}
                                        <span className="text-slate-600 mx-1.5">·</span>
                                        <span className="inline-flex items-center gap-1">
                                            <IconPitch size={12} className="text-slate-500" />
                                            {app.pitches?.length || 0} saha
                                        </span>
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        {app.owner && (
                                            <p className="text-slate-500 text-xs truncate">
                                                {app.owner.fullName} · {app.owner.email}
                                            </p>
                                        )}
                                        {(totalFacilities > 0 || hasHours) && (
                                            <p className="text-slate-600 text-xs shrink-0">
                                                {totalFacilities > 0 && `${totalFacilities} imkan`}
                                                {totalFacilities > 0 && hasHours && ' · '}
                                                {hasHours && (
                                                    <span className="inline-flex items-center gap-0.5">
                                                        <IconClock size={10} className="inline" />
                                                        {' '}{app.openTime}–{app.closeTime}
                                                    </span>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <span className="text-slate-500 text-xs">
                                        {new Date(app.createdAt).toLocaleDateString('tr-TR')}
                                    </span>
                                    {status === 'active' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`"${app.name}" işletmesini askıya almak istediğinize emin misiniz? Müşteri tarafında görünmez olacak.`)) {
                                                    suspend(app.id);
                                                }
                                            }}
                                            disabled={processingId === app.id}
                                            className="text-xs font-black px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 transition-all disabled:opacity-50"
                                        >
                                            {processingId === app.id ? '…' : 'Askıya Al'}
                                        </button>
                                    )}
                                    {status === 'suspended' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`"${app.name}" işletmesini yeniden aktifleştirmek istediğinize emin misiniz?`)) {
                                                    activate(app.id);
                                                }
                                            }}
                                            disabled={processingId === app.id}
                                            className="text-xs font-black px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                                        >
                                            {processingId === app.id ? '…' : 'Aktifleştir'}
                                        </button>
                                    )}
                                    <IconChevronRight size={16} className="text-slate-500 group-hover:text-orange-400 transition-colors" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && (
                <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
            )}
        </div>
    );
};

export default ApplicationsList;
