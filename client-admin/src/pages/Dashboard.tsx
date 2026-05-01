import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from 'recharts';
import adminApi from '../services/adminApi';
import {
    DimliLogo,
    IconPending,
    IconCheck,
    IconX,
    IconDollar,
    IconSubscription,
    IconTrendingUp,
    IconBarChart,
    IconPitch,
} from '../components/Icons';

interface Stats {
    counts: { pending: number; active: number; rejected: number; suspended: number };
    revenue: {
        activeSubscriptions: number;
        trialSubscriptions: number;
        totalMRR: number;
        byPlan: Array<{ planType: string; label: string; count: number; monthlyRevenue: number }>;
    };
    monthlyGrowth: Array<{ month: string; newBusinesses: number; approvedBusinesses: number }>;
}

interface DeletionReport {
    total: number;
    thisMonth: number;
    reasonBreakdown: Array<{ key: string; label: string; count: number }>;
    monthlyTrend: Array<{ month: string; count: number }>;
    recent: Array<{ id: string; reason: string; note?: string; userName?: string; userEmail?: string; userUsername?: string; deletedAt: string }>;
}

const formatMonth = (m: string) => {
    const [year, month] = m.split('-');
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
};

const formatCurrency = (n: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);

interface StatCardProps {
    label: string;
    value: number | string;
    icon: React.ReactNode;
    colorClass: string;
    bgClass: string;
    borderClass: string;
    onClick?: () => void;
    subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, colorClass, bgClass, borderClass, onClick, subtitle }) => (
    <button
        onClick={onClick}
        disabled={!onClick}
        className={`${bgClass} ${borderClass} border rounded-2xl p-5 text-left transition-all hover:opacity-90 active:scale-95 w-full ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
        <div className="flex items-center justify-between mb-3">
            <span className={`${colorClass} opacity-80`}>{icon}</span>
            <p className={`text-3xl font-black tabular-nums ${colorClass}`}>{value}</p>
        </div>
        <p className="text-[#dde8f5] text-sm font-bold">{label}</p>
        {subtitle && <p className="text-[#7b9ab8] text-xs mt-0.5">{subtitle}</p>}
    </button>
);

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="bg-[#1e2d47] border border-slate-600/60 rounded-xl p-3 shadow-xl text-xs">
            <p className="text-slate-300 font-bold mb-1">{label}</p>
            {payload.map((entry: any) => (
                <p key={entry.name} style={{ color: entry.color }} className="font-bold">
                    {entry.name}: {entry.value}
                </p>
            ))}
        </div>
    );
};

const REASON_COLORS: Record<string, string> = {
    NOT_USING: '#f97316',
    PRIVACY: '#a855f7',
    DIFFERENT_APP: '#3b82f6',
    NOT_SATISFIED: '#ef4444',
    TECHNICAL: '#eab308',
    OTHER: '#64748b',
};

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [deletionReport, setDeletionReport] = useState<DeletionReport | null>(null);
    const [deletionLoading, setDeletionLoading] = useState(true);

    useEffect(() => {
        adminApi.get('/admin/statistics')
            .then(r => setStats(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));

        adminApi.get('/admin/deletion-report')
            .then(r => setDeletionReport(r.data))
            .catch(console.error)
            .finally(() => setDeletionLoading(false));
    }, []);

    const today = new Date().toLocaleDateString('tr-TR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    // Kümülatif onaylı işletme hesabı (line chart için)
    const cumulativeData = stats?.monthlyGrowth.reduce((acc, item, idx) => {
        const prev = idx > 0 ? acc[idx - 1].cumulativeApproved : 0;
        acc.push({ ...item, monthLabel: formatMonth(item.month), cumulativeApproved: prev + item.approvedBusinesses });
        return acc;
    }, [] as Array<{ month: string; monthLabel: string; newBusinesses: number; approvedBusinesses: number; cumulativeApproved: number }>) ?? [];

    const barData = cumulativeData.map(d => ({ ...d, name: d.monthLabel }));

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8">

            {/* Karşılama */}
            <div className="flex items-center gap-4">
                <DimliLogo size={52} className="drop-shadow-[0_0_16px_rgba(74,222,128,0.25)]" />
                <div>
                    <h1 className="text-2xl font-black text-[#dde8f5] tracking-tight">Dimli Admin</h1>
                    <p className="text-[#7b9ab8] text-sm capitalize">{today}</p>
                </div>
            </div>

            {/* Durum Kartları */}
            <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Başvuru Durumu</h2>
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white/5 border border-slate-700/40 rounded-2xl p-5 h-28 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard
                            label="Bekleyen Başvurular"
                            value={stats?.counts.pending ?? 0}
                            icon={<IconPending size={20} />}
                            colorClass="text-yellow-300"
                            bgClass="bg-yellow-500/8"
                            borderClass="border-yellow-500/20 hover:border-yellow-500/40"
                            onClick={() => navigate('/pending')}
                            subtitle="İnceleme bekliyor"
                        />
                        <StatCard
                            label="Onaylı İşletmeler"
                            value={stats?.counts.active ?? 0}
                            icon={<IconCheck size={20} />}
                            colorClass="text-emerald-300"
                            bgClass="bg-emerald-500/8"
                            borderClass="border-emerald-500/20 hover:border-emerald-500/40"
                            onClick={() => navigate('/approved')}
                            subtitle="Aktif platformda"
                        />
                        <StatCard
                            label="Reddedilen Başvurular"
                            value={stats?.counts.rejected ?? 0}
                            icon={<IconX size={20} />}
                            colorClass="text-red-300"
                            bgClass="bg-red-500/8"
                            borderClass="border-red-500/20 hover:border-red-500/40"
                            onClick={() => navigate('/rejected')}
                            subtitle="Onaylanmadı"
                        />
                    </div>
                )}
            </div>

            {/* Gelir Raporu */}
            <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Gelir Raporu</h2>
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white/5 border border-slate-700/40 rounded-2xl p-5 h-28 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard
                            label="Aylık Yinelenen Gelir"
                            value={formatCurrency(stats?.revenue.totalMRR ?? 0)}
                            icon={<IconDollar size={20} />}
                            colorClass="text-orange-300"
                            bgClass="bg-orange-500/8"
                            borderClass="border-orange-500/20"
                            subtitle="Aktif aboneliklerden"
                        />
                        <StatCard
                            label="Aktif Abonelik"
                            value={stats?.revenue.activeSubscriptions ?? 0}
                            icon={<IconSubscription size={20} />}
                            colorClass="text-sky-300"
                            bgClass="bg-sky-500/8"
                            borderClass="border-sky-500/20"
                            subtitle="Ödeme yapıyor"
                        />
                        <StatCard
                            label="Deneme Aboneliği"
                            value={stats?.revenue.trialSubscriptions ?? 0}
                            icon={<IconPitch size={20} />}
                            colorClass="text-violet-300"
                            bgClass="bg-violet-500/8"
                            borderClass="border-violet-500/20"
                            subtitle="Ücretsiz deneme"
                        />
                    </div>
                )}
            </div>

            {/* Plan Dağılımı */}
            {!loading && stats && stats.revenue.byPlan.length > 0 && (
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Plan Dağılımı</h2>
                    <div className="bg-[#1e2d47] border border-slate-700/40 rounded-2xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700/40">
                                    <th className="text-left py-3 px-5 text-[#7b9ab8] font-bold text-xs uppercase tracking-wider">Plan</th>
                                    <th className="text-center py-3 px-4 text-[#7b9ab8] font-bold text-xs uppercase tracking-wider">İşletme</th>
                                    <th className="text-right py-3 px-5 text-[#7b9ab8] font-bold text-xs uppercase tracking-wider">Aylık Gelir</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.revenue.byPlan.map(plan => (
                                    <tr key={plan.planType} className="border-b border-slate-700/30 last:border-0 hover:bg-white/3 transition-colors">
                                        <td className="py-3 px-5">
                                            <span className="text-[#dde8f5] font-bold">{plan.label}</span>
                                            <span className="text-slate-500 text-xs ml-2">({plan.planType.replace('_pitch', ' saha').replace('5plus', '5+')})</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="text-[#dde8f5] font-black tabular-nums">{plan.count}</span>
                                        </td>
                                        <td className="py-3 px-5 text-right">
                                            <span className="text-orange-300 font-black tabular-nums">{formatCurrency(plan.monthlyRevenue)}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Grafikler */}
            <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Büyüme & Trendler</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* Bar Chart — Aylık Onaylanan */}
                    <div className="bg-[#1e2d47] border border-slate-700/40 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <IconBarChart size={15} className="text-orange-400" />
                            <h3 className="text-[#dde8f5] font-bold text-sm">Aylık Onaylanan İşletme</h3>
                        </div>
                        {loading ? (
                            <div className="h-52 bg-white/5 rounded-xl animate-pulse" />
                        ) : (
                            <ResponsiveContainer width="100%" height={210}>
                                <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3d5a" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: '#7b9ab8', fontSize: 10 }}
                                        axisLine={{ stroke: '#2a3d5a' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: '#7b9ab8', fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(249,115,22,0.06)' }} />
                                    <Bar dataKey="approvedBusinesses" name="Onaylanan" fill="#f97316" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="newBusinesses" name="Yeni Başvuru" fill="#f97316" fillOpacity={0.3} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Line Chart — Kümülatif Büyüme */}
                    <div className="bg-[#1e2d47] border border-slate-700/40 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <IconTrendingUp size={15} className="text-emerald-400" />
                            <h3 className="text-[#dde8f5] font-bold text-sm">Kümülatif İşletme Büyümesi</h3>
                        </div>
                        {loading ? (
                            <div className="h-52 bg-white/5 rounded-xl animate-pulse" />
                        ) : (
                            <ResponsiveContainer width="100%" height={210}>
                                <LineChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3d5a" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: '#7b9ab8', fontSize: 10 }}
                                        axisLine={{ stroke: '#2a3d5a' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: '#7b9ab8', fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#22c55e', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                    <Line
                                        type="monotone"
                                        dataKey="cumulativeApproved"
                                        name="Toplam Aktif"
                                        stroke="#22c55e"
                                        strokeWidth={2.5}
                                        dot={{ fill: '#22c55e', r: 3, strokeWidth: 0 }}
                                        activeDot={{ fill: '#22c55e', r: 5, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Hesap Silme Raporu */}
            <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Hesap Silme Raporu</h2>

                {/* Özet kartlar */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="bg-red-950/30 border border-red-900/40 rounded-2xl p-5">
                        <p className="text-3xl font-black text-red-400 tabular-nums">
                            {deletionLoading ? '—' : deletionReport?.total ?? 0}
                        </p>
                        <p className="text-sm font-bold text-[#dde8f5] mt-1">Toplam Silinen Hesap</p>
                    </div>
                    <div className="bg-orange-950/30 border border-orange-900/40 rounded-2xl p-5">
                        <p className="text-3xl font-black text-orange-400 tabular-nums">
                            {deletionLoading ? '—' : deletionReport?.thisMonth ?? 0}
                        </p>
                        <p className="text-sm font-bold text-[#dde8f5] mt-1">Bu Ay Silinen</p>
                    </div>
                </div>

                {/* Sebep dağılımı */}
                {!deletionLoading && deletionReport && deletionReport.reasonBreakdown.length > 0 && (
                    <div className="bg-[#162032] border border-slate-700/40 rounded-2xl p-5 mb-5">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Sebep Dağılımı</p>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart
                                data={deletionReport.reasonBreakdown}
                                margin={{ top: 4, right: 4, left: -25, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a3d5a" vertical={false} />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fill: '#7b9ab8', fontSize: 9 }}
                                    axisLine={{ stroke: '#2a3d5a' }}
                                    tickLine={false}
                                    interval={0}
                                    width={60}
                                    tickFormatter={(v: string) => v.split(' ').slice(0, 2).join(' ')}
                                />
                                <YAxis
                                    tick={{ fill: '#7b9ab8', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
                                <Bar dataKey="count" name="Kişi" radius={[6, 6, 0, 0]} fill="#ef4444" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Son 30 silme tablosu */}
                {!deletionLoading && deletionReport && deletionReport.recent.length > 0 && (
                    <div className="bg-[#162032] border border-slate-700/40 rounded-2xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-700/40">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Son Silmeler</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700/40">
                                        <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kullanıcı</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sebep</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tarih</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Not</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deletionReport.recent.map((d, i) => (
                                        <tr key={d.id} className={`border-b border-slate-800/60 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                                            <td className="px-5 py-3">
                                                <p className="font-bold text-[#dde8f5] text-xs">{d.userName || '—'}</p>
                                                <p className="text-slate-500 text-[10px]">{d.userEmail || d.userUsername || ''}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className="text-[10px] font-bold px-2 py-1 rounded-full"
                                                    style={{
                                                        background: `${REASON_COLORS[d.reason] || '#64748b'}20`,
                                                        color: REASON_COLORS[d.reason] || '#64748b',
                                                    }}
                                                >
                                                    {deletionReport.reasonBreakdown.find(r => r.key === d.reason)?.label || d.reason}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 text-xs">
                                                {new Date(d.deletedAt).toLocaleDateString('tr-TR')}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">
                                                {d.note || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {!deletionLoading && deletionReport?.total === 0 && (
                    <div className="bg-[#162032] border border-slate-700/40 rounded-2xl p-8 text-center text-slate-600 text-sm">
                        Henüz hesap silme kaydı bulunmuyor.
                    </div>
                )}
            </div>

            {/* Alt boşluk */}
            <div className="h-4" />
        </div>
    );
}
