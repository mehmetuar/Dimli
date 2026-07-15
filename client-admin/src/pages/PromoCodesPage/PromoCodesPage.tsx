import React, { useState } from 'react';
import { IconTicket, IconCheck, IconX, IconAlertCircle, IconChevronRight, IconBuilding } from '../../components/Icons';
import SearchInput from '../../components/SearchInput';
import Pagination from '../../components/Pagination';
import { usePromoCodes, PromoCode, PromoStatusFilter, CreatePromoForm } from './hooks/usePromoCodes';

// ─── Sabitler ─────────────────────────────────────────────────────────────────

const FILTER_TABS: { key: PromoStatusFilter; label: string }[] = [
    { key: 'all',      label: 'Tümü' },
    { key: 'active',   label: 'Aktif' },
    { key: 'inactive', label: 'Pasif' },
    { key: 'used',     label: 'Dolu' },
];

const DURATION_OPTIONS: { label: string; value: number | null }[] = [
    { label: '3 Ay',  value: 3 },
    { label: '6 Ay',  value: 6 },
    { label: '12 Ay', value: 12 },
    { label: 'Süresiz', value: null },
];

const durationLabel = (months: number | null) =>
    months === null ? 'Süresiz' : `${months} Ay`;

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('tr-TR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

const fmtDay = (iso: string) =>
    new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });

// ─── Kod Kartı ────────────────────────────────────────────────────────────────

const CodeCard: React.FC<{
    code: PromoCode;
    expanded: boolean;
    onToggleExpand: () => void;
    onToggleActive: () => void;
    onCopy: (code: string) => void;
    processing: boolean;
}> = ({ code, expanded, onToggleExpand, onToggleActive, onCopy, processing }) => {
    const usedUp = code.usedCount >= code.maxRedemptions;
    const statusBadge = !code.isActive
        ? { label: 'Pasif', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/40' }
        : usedUp
            ? { label: 'Dolu', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' }
            : { label: 'Aktif', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };

    return (
        <div className="bg-[#1e2d47] border border-slate-700/40 rounded-2xl p-5">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                    <IconTicket size={18} className="text-sky-400" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => onCopy(code.code)}
                            className="text-[#dde8f5] font-black text-sm font-mono tracking-wide hover:text-sky-300 transition-colors"
                            title="Kopyala"
                        >
                            {code.code}
                        </button>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusBadge.cls}`}>
                            {statusBadge.label}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 bg-sky-500/15 text-sky-300 border-sky-500/30">
                            {durationLabel(code.durationMonths)}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-slate-400 text-xs">
                            Kullanım: <span className="font-bold text-[#dde8f5]">{code.usedCount}/{code.maxRedemptions}</span>
                        </span>
                        {code.note && <span className="text-slate-500 text-xs truncate">· {code.note}</span>}
                        {code.expiresAt && (
                            <span className="text-slate-500 text-xs">· Geçerlilik: {fmtDay(code.expiresAt)}</span>
                        )}
                    </div>
                    <p className="text-slate-600 text-[10px] mt-1">{fmtDate(code.createdAt)}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={onToggleActive}
                        disabled={processing}
                        className={`text-xs font-black px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                            code.isActive
                                ? 'border-red-500/30 text-red-300 hover:bg-red-500/10'
                                : 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10'
                        }`}
                    >
                        {code.isActive ? 'Devre Dışı' : 'Etkinleştir'}
                    </button>
                    {code.redemptions.length > 0 && (
                        <button
                            onClick={onToggleExpand}
                            className="text-slate-500 hover:text-sky-400 transition-colors p-1"
                            title="Kullananları göster"
                        >
                            <IconChevronRight size={18} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
                        </button>
                    )}
                </div>
            </div>

            {/* Kullananlar */}
            {expanded && code.redemptions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/40 space-y-2">
                    {code.redemptions.map(r => (
                        <div key={r.id} className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-3 py-2">
                            <IconBuilding size={14} className="text-slate-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[#dde8f5] text-xs font-bold truncate">
                                    {r.businessName || r.ownerName || 'Bilinmiyor'}
                                </p>
                                <p className="text-slate-500 text-[10px] truncate">{r.email || '—'}</p>
                            </div>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 bg-slate-600/20 text-slate-400 border-slate-600/30">
                                {r.context === 'registration' ? 'Kayıtta' : 'Mevcut'}
                            </span>
                            <span className="text-slate-600 text-[10px] shrink-0">{fmtDate(r.redeemedAt)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Kod Üretme Modalı ──────────────────────────────────────────────────────────

const CreateModal: React.FC<{
    processing: boolean;
    onClose: () => void;
    onCreate: (form: CreatePromoForm) => void;
}> = ({ processing, onClose, onCreate }) => {
    const [count, setCount] = useState(1);
    const [durationMonths, setDurationMonths] = useState<number | null>(null);
    const [maxRedemptions, setMaxRedemptions] = useState(1);
    const [note, setNote] = useState('');
    const [expiresAt, setExpiresAt] = useState('');

    const submit = () =>
        onCreate({ count, durationMonths, maxRedemptions, note, expiresAt });

    const numField = (
        label: string, value: number, set: (n: number) => void, min: number, max: number,
    ) => (
        <div className="flex-1">
            <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{label}</label>
            <input
                type="number" min={min} max={max} value={value}
                onChange={e => set(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
                className="w-full mt-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-[#dde8f5] focus:outline-none focus:border-sky-500/60"
            />
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="w-full max-w-md bg-[#0f1827] border border-slate-600/50 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="bg-[#1a2d4a] px-5 py-4 flex items-center justify-between border-b border-slate-700/40 shrink-0">
                    <div className="flex items-center gap-2">
                        <IconTicket size={16} className="text-sky-400" />
                        <h2 className="text-[#dde8f5] font-black text-base">Davet Kodu Üret</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
                        <IconX size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto">
                    <div className="flex gap-3">
                        {numField('Adet', count, setCount, 1, 50)}
                        {numField('Kullanım Limiti', maxRedemptions, setMaxRedemptions, 1, 10000)}
                    </div>

                    <div>
                        <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Ücretsiz Süre</label>
                        <div className="grid grid-cols-4 gap-2 mt-1">
                            {DURATION_OPTIONS.map(opt => (
                                <button
                                    key={opt.label}
                                    onClick={() => setDurationMonths(opt.value)}
                                    className={`py-2 rounded-xl text-xs font-black border transition-all ${
                                        durationMonths === opt.value
                                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                            : 'border-slate-700 text-[#7b9ab8] hover:bg-white/5'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Not / Etiket (opsiyonel)</label>
                        <input
                            type="text" value={note} maxLength={120}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Partner adı / kampanya"
                            className="w-full mt-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-[#dde8f5] placeholder-slate-600 focus:outline-none focus:border-sky-500/60"
                        />
                    </div>

                    <div>
                        <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Kod Geçerlilik Sonu (opsiyonel)</label>
                        <input
                            type="date" value={expiresAt}
                            onChange={e => setExpiresAt(e.target.value)}
                            className="w-full mt-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-[#dde8f5] focus:outline-none focus:border-sky-500/60"
                        />
                        <p className="text-slate-600 text-[10px] mt-1">Kodun kullanılabildiği son tarih (verilen ücretsiz süre değil).</p>
                    </div>

                    <button
                        onClick={submit}
                        disabled={processing}
                        className="w-full flex items-center justify-center gap-2 bg-sky-700 hover:bg-sky-600 text-white py-3 rounded-xl font-black text-sm transition-all disabled:opacity-50"
                    >
                        <IconCheck size={15} /> {count} Kod Üret
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Üretilen Kodlar Modalı ──────────────────────────────────────────────────────

const GeneratedModal: React.FC<{
    codes: PromoCode[];
    onClose: () => void;
    onCopy: (text: string) => void;
}> = ({ codes, onClose, onCopy }) => {
    const allText = codes.map(c => c.code).join('\n');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="w-full max-w-md bg-[#0f1827] border border-slate-600/50 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="bg-[#1a2d4a] px-5 py-4 flex items-center justify-between border-b border-slate-700/40 shrink-0">
                    <div className="flex items-center gap-2">
                        <IconCheck size={16} className="text-emerald-400" />
                        <h2 className="text-[#dde8f5] font-black text-base">{codes.length} Kod Üretildi</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
                        <IconX size={18} />
                    </button>
                </div>
                <div className="p-5 space-y-2 overflow-y-auto">
                    {codes.map(c => (
                        <button
                            key={c.id}
                            onClick={() => onCopy(c.code)}
                            className="w-full flex items-center justify-between bg-slate-800/60 hover:bg-slate-800 rounded-xl px-4 py-3 transition-colors group"
                        >
                            <span className="text-[#dde8f5] font-black text-sm font-mono tracking-wide">{c.code}</span>
                            <span className="text-slate-500 text-[10px] group-hover:text-sky-400">Kopyala</span>
                        </button>
                    ))}
                </div>
                <div className="p-5 pt-0 shrink-0">
                    <button
                        onClick={() => onCopy(allText)}
                        className="w-full bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600 text-slate-200 py-2.5 rounded-xl font-black text-sm transition-all"
                    >
                        Tümünü Kopyala
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

const PromoCodesPage: React.FC = () => {
    const {
        codes, total, totalPages, page, setPage, search, setSearch, loading,
        statusFilter, setStatusFilter,
        processing, toast,
        generated, setGenerated,
        showCreate, setShowCreate,
        createCodes, toggleActive,
    } = usePromoCodes();

    const [expandedId, setExpandedId] = useState<string | null>(null);

    const copy = (text: string) => {
        navigator.clipboard?.writeText(text).catch(() => {});
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
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

            {/* Başlık */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                    <IconTicket size={18} className="text-sky-400" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-[#dde8f5]">Promosyon Kodları</h1>
                    <p className="text-[#7b9ab8] text-xs">Davet/partner kodları ile ücretsiz işletme erişimi</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="ml-auto flex items-center gap-2 bg-sky-700 hover:bg-sky-600 text-white px-4 py-2.5 rounded-xl font-black text-sm transition-all"
                >
                    <IconTicket size={15} /> Kod Üret
                </button>
            </div>

            {/* Durum sekmeleri */}
            <div className="flex gap-2 mb-4">
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
                <span className="ml-auto self-center text-[#7b9ab8] text-sm font-bold">{total} kod</span>
            </div>

            <div className="mb-5">
                <SearchInput value={search} onChange={setSearch} placeholder="Kod veya not ara..." />
            </div>

            {/* Liste */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white/5 border border-slate-700/40 rounded-2xl p-5 animate-pulse h-20" />
                    ))}
                </div>
            ) : codes.length === 0 ? (
                <div className="text-center py-24">
                    <div className="w-16 h-16 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
                        <IconTicket size={28} className="text-slate-600" />
                    </div>
                    <p className="font-bold text-[#dde8f5] mb-1">Kod bulunamadı</p>
                    <p className="text-[#7b9ab8] text-sm">Yeni bir davet kodu üreterek başlayın.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {codes.map(code => (
                        <CodeCard
                            key={code.id}
                            code={code}
                            expanded={expandedId === code.id}
                            onToggleExpand={() => setExpandedId(expandedId === code.id ? null : code.id)}
                            onToggleActive={() => toggleActive(code)}
                            onCopy={copy}
                            processing={processing}
                        />
                    ))}
                </div>
            )}

            {!loading && (
                <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
            )}

            {showCreate && (
                <CreateModal
                    processing={processing}
                    onClose={() => setShowCreate(false)}
                    onCreate={createCodes}
                />
            )}

            {generated && (
                <GeneratedModal
                    codes={generated}
                    onClose={() => setGenerated(null)}
                    onCopy={copy}
                />
            )}
        </div>
    );
};

export default PromoCodesPage;
