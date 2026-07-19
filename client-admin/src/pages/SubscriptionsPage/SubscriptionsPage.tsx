import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSubscription, IconTicket, IconBuilding } from '../../components/Icons';
import SearchInput from '../../components/SearchInput';
import Pagination from '../../components/Pagination';
import {
    useSubscriptionsPage,
    SubscriptionRow,
    SubStatusFilter,
} from './hooks/useSubscriptionsPage';

// ─── Sabitler ─────────────────────────────────────────────────────────────────

const FILTER_TABS: { key: SubStatusFilter; label: string }[] = [
    { key: 'all',           label: 'Tümü' },
    { key: 'active',        label: 'Aktif' },
    { key: 'trial',         label: 'Deneme' },
    { key: 'complimentary', label: 'Davetli' },
    { key: 'expired',       label: 'Süresi Dolmuş' },
    { key: 'cancelled',     label: 'İptal' },
];

// Abonelik sınıfı rozet haritası (ApplicationsList STATUS_CONFIG deseni).
const SUB_BADGE: Record<string, { label: string; cls: string }> = {
    active:        { label: 'Aktif',         cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    trial:         { label: 'Deneme',        cls: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
    complimentary: { label: 'Davetli',       cls: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
    expired:       { label: 'Süresi Dolmuş', cls: 'bg-red-500/20 text-red-300 border-red-500/40' },
    cancelled:     { label: 'İptal',         cls: 'bg-red-500/20 text-red-300 border-red-500/40' },
};

const BUSINESS_STATUS_LABEL: Record<string, string> = {
    pending: 'Başvuru Bekliyor',
    active: 'Yayında',
    rejected: 'Reddedildi',
    suspended: 'Askıda',
};

const fmtDay = (iso: string | null) =>
    iso
        ? new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
        : null;

const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);

// İşletme grace döneminde mi (davetli süresi bitti, ödeme penceresi işliyor)?
const inGrace = (row: SubscriptionRow) =>
    row.status === 'complimentary' && !!row.graceUntil;

// Satırın "ilgili tarih" alanı — sınıfa göre en anlamlı olanı.
const relevantDate = (row: SubscriptionRow): { label: string; value: string } | null => {
    if (inGrace(row) && row.graceUntil)
        return { label: 'Ödeme penceresi bitişi', value: fmtDay(row.graceUntil)! };
    if (row.status === 'complimentary')
        return row.complimentaryUntil
            ? { label: 'Davetli bitiş', value: fmtDay(row.complimentaryUntil)! }
            : { label: 'Davetli', value: 'Süresiz' };
    if (row.status === 'trial' && row.trialEndsAt)
        return { label: 'Deneme bitişi', value: fmtDay(row.trialEndsAt)! };
    if (row.expiresAt)
        return { label: 'Yenileme/bitiş', value: fmtDay(row.expiresAt)! };
    return null;
};

// ─── Sayı kartı (Dashboard StatCard deseninin kompakt kopyası) ────────────────

const CountCard: React.FC<{
    label: string;
    value: number | string;
    colorClass: string;
    borderClass: string;
    subtitle?: string;
}> = ({ label, value, colorClass, borderClass, subtitle }) => (
    <div className={`bg-[#1e2d47] ${borderClass} border rounded-2xl p-4`}>
        <p className={`text-2xl font-black tabular-nums ${colorClass}`}>{value}</p>
        <p className="text-[#dde8f5] text-xs font-bold mt-1">{label}</p>
        {subtitle && <p className="text-[#7b9ab8] text-[11px] mt-0.5">{subtitle}</p>}
    </div>
);

// ─── Satır ────────────────────────────────────────────────────────────────────

const SubscriptionRowCard: React.FC<{ row: SubscriptionRow; onOpenBusiness: () => void }> = ({
    row,
    onOpenBusiness,
}) => {
    const badge = SUB_BADGE[row.status] ?? { label: row.status, cls: 'bg-slate-500/20 text-slate-300 border-slate-500/40' };
    const date = relevantDate(row);
    return (
        <div className="bg-[#1e2d47] border border-slate-700/40 rounded-2xl p-5">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                    <IconBuilding size={18} className="text-sky-400" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        {row.businessId ? (
                            <button
                                onClick={onOpenBusiness}
                                className="text-[#dde8f5] font-bold hover:text-sky-300 transition-colors truncate"
                            >
                                {row.businessName ?? 'İşletme'}
                            </button>
                        ) : (
                            <span className="text-[#dde8f5] font-bold truncate">
                                {row.businessName ?? 'İşletme kaydı yok'}
                            </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${badge.cls}`}>
                            {badge.label}
                        </span>
                        {inGrace(row) && (
                            <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold border bg-amber-500/20 text-amber-300 border-amber-500/40">
                                Ödeme penceresi · {fmtDay(row.graceUntil)}'e kadar
                            </span>
                        )}
                        {row.businessStatus && row.businessStatus !== 'active' && (
                            <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold border bg-slate-500/20 text-slate-300 border-slate-500/40">
                                {BUSINESS_STATUS_LABEL[row.businessStatus] ?? row.businessStatus}
                            </span>
                        )}
                    </div>

                    <p className="text-[#7b9ab8] text-sm mt-1 truncate">
                        {row.ownerName ?? '—'}{row.ownerEmail ? ` · ${row.ownerEmail}` : ''}
                    </p>

                    <div className="flex items-center gap-4 flex-wrap mt-2 text-xs text-[#7b9ab8]">
                        <span className="font-bold text-[#dde8f5]">
                            {row.planLabel}
                            {row.pricePerMonth > 0 && (
                                <span className="text-[#7b9ab8] font-normal"> · {fmtCurrency(row.pricePerMonth)}/ay</span>
                            )}
                        </span>
                        {date && <span>{date.label}: <span className="text-[#dde8f5] font-bold">{date.value}</span></span>}
                        {row.promoCode && (
                            <span className="inline-flex items-center gap-1">
                                <IconTicket size={12} className="text-sky-400" />
                                <span className="font-mono text-sky-300">{row.promoCode}</span>
                            </span>
                        )}
                        <span>Kayıt: {fmtDay(row.createdAt)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Sayfa ────────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
    const navigate = useNavigate();
    const {
        items, total, totalPages, page, setPage,
        search, setSearch, loading,
        statusFilter, setStatusFilter,
        stats, statsLoading,
    } = useSubscriptionsPage();

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
            {/* Başlık */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                    <IconSubscription size={22} className="text-sky-400" />
                </div>
                <div>
                    <h1 className="text-[#dde8f5] text-2xl font-black">Abonelikler</h1>
                    <p className="text-[#7b9ab8] text-sm">İşletmelerin abonelik sınıflandırması — kaynak: kendi veritabanımız (RevenueCat davetlileri görmez)</p>
                </div>
            </div>

            {/* Sınıf sayı kartları */}
            {!statsLoading && stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <CountCard label="Aktif (direkt abone)" value={stats.activeSubscriptions} colorClass="text-emerald-400" borderClass="border-emerald-500/30" />
                    <CountCard label="Deneme (trial)" value={stats.trialSubscriptions} colorClass="text-orange-400" borderClass="border-orange-500/30" />
                    <CountCard
                        label="Davetli (promo)"
                        value={stats.complimentarySubscriptions}
                        colorClass="text-sky-400"
                        borderClass="border-sky-500/30"
                        subtitle={stats.graceSubscriptions > 0 ? `${stats.graceSubscriptions} tanesi ödeme penceresinde` : undefined}
                    />
                    <CountCard label="Aylık Gelir (MRR)" value={fmtCurrency(stats.totalMRR)} colorClass="text-emerald-300" borderClass="border-slate-700/40" subtitle="Yalnız ödeme alınan (aktif) abonelikler" />
                    <CountCard label="Süresi Dolmuş" value={stats.expiredSubscriptions} colorClass="text-red-400" borderClass="border-red-500/30" />
                    <CountCard label="İptal" value={stats.cancelledSubscriptions} colorClass="text-red-300" borderClass="border-red-500/20" />
                    <CountCard label="Ödeme Penceresi" value={stats.graceSubscriptions} colorClass="text-amber-400" borderClass="border-amber-500/30" subtitle="Davetli bitti, 1 haftalık süre işliyor" />
                    <CountCard label="Aboneliksiz" value={stats.noSubscription} colorClass="text-slate-300" borderClass="border-slate-700/40" subtitle="Abonelik kaydı hiç olmayan işletme" />
                </div>
            )}

            {/* Arama */}
            <div className="mb-4">
                <SearchInput value={search} onChange={setSearch} placeholder="İşletme adı, yetkili adı veya e-posta ara..." />
            </div>

            {/* Durum sekmeleri */}
            <div className="flex gap-2 mb-4 flex-wrap">
                {FILTER_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setStatusFilter(tab.key)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                            statusFilter === tab.key
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                : 'border-slate-700 text-[#7b9ab8] hover:bg-white/5 hover:text-[#dde8f5]'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
                <span className="ml-auto self-center text-[#7b9ab8] text-sm font-bold">{total} abonelik</span>
            </div>

            {/* Liste */}
            {loading ? (
                <div className="text-[#7b9ab8] text-sm py-12 text-center">Yükleniyor...</div>
            ) : items.length === 0 ? (
                <div className="bg-[#1e2d47] border border-slate-700/40 rounded-2xl p-10 text-center text-[#7b9ab8] text-sm">
                    Bu filtrede abonelik bulunamadı.
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map(row => (
                        <SubscriptionRowCard
                            key={row.subscriptionId}
                            row={row}
                            onOpenBusiness={() => row.businessId && navigate(`/applications/${row.businessId}`)}
                        />
                    ))}
                </div>
            )}

            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} loading={loading} />
        </div>
    );
}
