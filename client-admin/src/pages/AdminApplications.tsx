import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../services/adminApi';
import {
    DimliLogo,
    IconClock, IconCheck, IconX, IconPause, IconPending,
    IconChevronRight, IconLogout, IconPitch,
} from '../components/Icons';

type Status = 'pending' | 'active' | 'rejected' | 'suspended';

const STATUS_CONFIG: Record<Status, {
    label: string;
    badgeClass: string;
    cardClass: string;
    ringClass: string;
    Icon: React.FC<{ size?: number; className?: string }>;
    countColor: string;
}> = {
    pending: {
        label: 'Bekleyen',
        badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        cardClass: 'bg-yellow-500/8 border-yellow-500/20',
        ringClass: 'ring-yellow-500/40',
        Icon: IconPending,
        countColor: 'text-yellow-300',
    },
    active: {
        label: 'Onaylı',
        badgeClass: 'bg-green-500/20 text-green-300 border-green-500/30',
        cardClass: 'bg-green-500/8 border-green-500/20',
        ringClass: 'ring-green-500/40',
        Icon: IconCheck,
        countColor: 'text-green-300',
    },
    rejected: {
        label: 'Reddedilen',
        badgeClass: 'bg-red-500/20 text-red-300 border-red-500/30',
        cardClass: 'bg-red-500/8 border-red-500/20',
        ringClass: 'ring-red-500/40',
        Icon: IconX,
        countColor: 'text-red-300',
    },
    suspended: {
        label: 'Askıda',
        badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
        cardClass: 'bg-slate-500/8 border-slate-500/20',
        ringClass: 'ring-slate-500/40',
        Icon: IconPause,
        countColor: 'text-slate-300',
    },
};

const parseFacilitiesCount = (raw: string[] | string | null | undefined): number => {
    if (!raw) return 0;
    if (Array.isArray(raw)) return raw.filter(f => f && f.trim().length > 0).length;
    if (typeof raw === 'string' && raw.length > 0) return raw.split(',').filter(Boolean).length;
    return 0;
};

export default function AdminApplications() {
    const navigate = useNavigate();
    const [applications, setApplications] = useState<any[]>([]);
    const [filter, setFilter] = useState<Status | 'all'>('pending');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Record<Status, number>>({ pending: 0, active: 0, rejected: 0, suspended: 0 });

    const fetchApplications = async (currentFilter: Status | 'all') => {
        setLoading(true);
        try {
            const status = currentFilter === 'all' ? undefined : currentFilter;
            const res = await adminApi.get('/admin/applications', { params: { status } });
            setApplications(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [p, a, r, s] = await Promise.all([
                    adminApi.get('/admin/applications', { params: { status: 'pending' } }),
                    adminApi.get('/admin/applications', { params: { status: 'active' } }),
                    adminApi.get('/admin/applications', { params: { status: 'rejected' } }),
                    adminApi.get('/admin/applications', { params: { status: 'suspended' } }),
                ]);
                setStats({ pending: p.data.length, active: a.data.length, rejected: r.data.length, suspended: s.data.length });
            } catch (err) { console.error(err); }
        };
        fetchStats();
    }, []);

    useEffect(() => { fetchApplications(filter); }, [filter]);

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        navigate('/login');
    };

    return (
        <div className="min-h-screen p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <DimliLogo size={40} className="drop-shadow-[0_0_10px_rgba(74,222,128,0.2)]" />
                    <div>
                        <h1 className="text-lg font-black text-white tracking-tight">DİMLİ Admin</h1>
                        <p className="text-slate-400 text-xs">İşletme Başvuruları</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm font-bold transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                >
                    <IconLogout size={15} />
                    Çıkış
                </button>
            </div>

            {/* İstatistik Kartları */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([key, cfg]) => {
                    const { Icon } = cfg;
                    return (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`${cfg.cardClass} border rounded-2xl p-4 text-left transition-all hover:opacity-90 active:scale-95 ${filter === key ? `ring-1 ${cfg.ringClass}` : ''}`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <Icon size={16} className={cfg.countColor} />
                                <p className={`text-2xl font-black ${cfg.countColor} tabular-nums`}>
                                    {stats[key]}
                                </p>
                            </div>
                            <p className="text-slate-300 text-xs font-bold">{cfg.label}</p>
                        </button>
                    );
                })}
            </div>

            {/* Filtre Sekmeleri */}
            <div className="flex gap-2 mb-5 flex-wrap">
                {(['pending', 'active', 'rejected', 'suspended', 'all'] as const).map(s => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all border ${filter === s
                            ? 'bg-orange-600 border-orange-500 text-white'
                            : 'bg-white/5 border-slate-600/50 text-slate-300 hover:border-slate-500 hover:text-white'
                            }`}
                    >
                        {s === 'all' ? 'Tümü' : STATUS_CONFIG[s]?.label ?? s}
                    </button>
                ))}
            </div>

            {/* Liste */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white/5 border border-slate-700/40 rounded-2xl p-5 animate-pulse h-20" />
                    ))}
                </div>
            ) : applications.length === 0 ? (
                <div className="text-center text-slate-400 py-20">
                    <IconPitch size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-slate-300">Başvuru bulunamadı</p>
                    <p className="text-xs mt-1 text-slate-500">Bu kategoride kayıt yok</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {applications.map(app => {
                        const cfg = STATUS_CONFIG[app.status as Status];
                        const totalFacilities = (app.pitches ?? []).reduce(
                            (acc: number, p: any) => acc + parseFacilitiesCount(p.facilities), 0
                        );
                        const hasHours = app.openTime && app.closeTime;

                        return (
                            <div
                                key={app.id}
                                onClick={() => navigate(`/applications/${app.id}`)}
                                className="bg-[#1e2d47] border border-slate-700/50 rounded-2xl p-5 cursor-pointer hover:border-slate-500/60 hover:bg-[#243458] transition-all flex items-center justify-between gap-4 group"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2.5 mb-1.5">
                                        <h3 className="font-black text-white truncate group-hover:text-orange-300 transition-colors">
                                            {app.name}
                                        </h3>
                                        {cfg && (
                                            <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}>
                                                {cfg.label}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-300 text-sm">
                                        {app.city} / {app.district}
                                        <span className="text-slate-500 mx-1.5">·</span>
                                        <span className="inline-flex items-center gap-1">
                                            <IconPitch size={12} className="text-slate-400" />
                                            {app.pitches?.length || 0} saha
                                        </span>
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                                        {app.owner && (
                                            <p className="text-slate-400 text-xs truncate">
                                                {app.owner.fullName} · {app.owner.email}
                                            </p>
                                        )}
                                        {(totalFacilities > 0 || hasHours) && (
                                            <p className="text-slate-500 text-xs shrink-0">
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
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className="text-slate-500 text-xs">
                                        {new Date(app.createdAt).toLocaleDateString('tr-TR')}
                                    </span>
                                    <IconChevronRight size={16} className="text-slate-500 group-hover:text-orange-400 transition-colors" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
