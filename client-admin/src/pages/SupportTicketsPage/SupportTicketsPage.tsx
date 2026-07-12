import React, { useState } from 'react';
import { IconSupport, IconCheck, IconX, IconUser, IconBuilding, IconChevronRight, IconAlertCircle } from '../../components/Icons';
import SearchInput from '../../components/SearchInput';
import Pagination from '../../components/Pagination';
import { useSupportTickets, SupportTicket, SupportAudience, SupportTicketStatus } from './hooks/useSupportTickets';

// ─── Sabitler ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SupportTicketStatus, { label: string; badge: string }> = {
    pending:  { label: 'Beklemede',  badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
    answered: { label: 'Yanıtlandı', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    reviewed: { label: 'İncelendi',  badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
};

const AUDIENCE_TABS = [
    { key: 'business' as const, label: 'İşletme' },
    { key: 'user'     as const, label: 'Kullanıcı' },
];

const FILTER_TABS = [
    { key: 'pending'  as const, label: 'Bekleyen' },
    { key: 'answered' as const, label: 'Yanıtlanan' },
    { key: 'reviewed' as const, label: 'İncelenen' },
];

// Sunucudaki kategori key'lerinin Türkçe etiketleri (iki audience birleşik).
const CATEGORY_LABELS: Record<string, string> = {
    // Kullanıcı
    MATCH_RESERVATION: 'Maç/Rezervasyon',
    TEAM: 'Takım',
    TECHNICAL: 'Teknik Sorun',
    ACCOUNT: 'Hesap',
    SUGGESTION: 'Öneri',
    OTHER: 'Diğer',
    // İşletme
    RESERVATION: 'Rezervasyon',
    PAYMENT_SUBSCRIPTION: 'Ödeme/Abonelik',
    ACCOUNT_OWNER: 'Hesap/Yetkili',
};

const categoryLabel = (key: string) => CATEGORY_LABELS[key] ?? key;

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('tr-TR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

const submitterName = (t: SupportTicket) =>
    t.audience === 'business'
        ? (t.owner?.business?.name || t.owner?.fullName || 'Bilinmiyor')
        : (t.user?.full_name || t.user?.username || 'Bilinmiyor');

// ─── Talep Kartı ──────────────────────────────────────────────────────────────

const TicketCard: React.FC<{ ticket: SupportTicket; onClick: () => void }> = ({ ticket, onClick }) => {
    const cfg = STATUS_CONFIG[ticket.status];
    const Icon = ticket.audience === 'business' ? IconBuilding : IconUser;

    return (
        <div
            onClick={onClick}
            className="bg-[#1e2d47] border border-slate-700/40 rounded-2xl p-5 cursor-pointer hover:border-slate-500/60 hover:bg-[#243458] transition-all flex items-center gap-4 group"
        >
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-sky-400" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#dde8f5] font-black text-sm truncate">{submitterName(ticket)}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 bg-sky-500/15 text-sky-300 border-sky-500/30">
                        {categoryLabel(ticket.category)}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${cfg.badge}`}>
                        {cfg.label}
                    </span>
                </div>
                <p className="text-slate-400 text-xs mt-1 truncate">{ticket.message}</p>
                <p className="text-slate-600 text-[10px] mt-1">{fmtDate(ticket.createdAt)}</p>
            </div>

            <IconChevronRight size={16} className="text-slate-500 group-hover:text-sky-400 shrink-0 transition-colors" />
        </div>
    );
};

// ─── Detay Modalı ─────────────────────────────────────────────────────────────

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex items-start justify-between gap-3 py-1.5">
        <span className="text-slate-500 text-xs shrink-0">{label}</span>
        <span className="text-[#dde8f5] text-xs font-bold text-right break-all">{value || '—'}</span>
    </div>
);

const TicketDetailModal: React.FC<{
    ticket: SupportTicket;
    processing: boolean;
    onClose: () => void;
    onReply: (reply: string) => void;
    onMarkReviewed: () => void;
}> = ({ ticket, processing, onClose, onReply, onMarkReviewed }) => {
    const [reply, setReply] = useState('');
    const isPending = ticket.status === 'pending';
    const cfg = STATUS_CONFIG[ticket.status];
    const biz = ticket.owner?.business;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="w-full max-w-lg bg-[#0f1827] border border-slate-600/50 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="bg-[#1a2d4a] px-5 py-4 flex items-center justify-between border-b border-slate-700/40 shrink-0">
                    <div className="flex items-center gap-2">
                        <IconSupport size={16} className="text-sky-400" />
                        <h2 className="text-[#dde8f5] font-black text-base">
                            Destek Talebi — {ticket.audience === 'business' ? 'İşletme' : 'Kullanıcı'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
                        <IconX size={18} />
                    </button>
                </div>

                {/* İçerik */}
                <div className="p-5 space-y-4 overflow-y-auto">

                    {/* Başvuran bilgisi */}
                    <div className="bg-slate-800/60 rounded-xl p-3.5">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                            {ticket.audience === 'business' ? 'İşletme Bilgileri' : 'Kullanıcı Bilgileri'}
                        </p>
                        {ticket.audience === 'business' ? (
                            ticket.owner ? (
                                <div className="divide-y divide-slate-700/40">
                                    <InfoRow label="İşletme" value={biz?.name} />
                                    <InfoRow label="Şehir / İlçe" value={[biz?.city, biz?.district].filter(Boolean).join(' / ')} />
                                    <InfoRow label="İşletme Telefonu" value={biz?.phone} />
                                    <InfoRow label="Yetkili" value={ticket.owner.fullName} />
                                    <InfoRow label="Yetkili Telefonu" value={ticket.owner.phone} />
                                    <InfoRow label="Yetkili E-posta" value={ticket.owner.email} />
                                    {(!biz || biz.deletedAt) && (
                                        <p className="text-red-400/80 text-[10px] font-bold pt-2">Silinmiş işletme</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-red-400/80 text-xs font-bold">Hesap silinmiş</p>
                            )
                        ) : (
                            ticket.user ? (
                                <div className="divide-y divide-slate-700/40">
                                    <InfoRow label="Ad Soyad" value={ticket.user.full_name} />
                                    <InfoRow label="Kullanıcı Adı" value={ticket.user.username ? `@${ticket.user.username}` : null} />
                                    <InfoRow label="Telefon" value={ticket.user.phone} />
                                    <InfoRow label="Konum (İlçe)" value={ticket.user.location} />
                                    <InfoRow label="E-posta" value={ticket.user.email} />
                                </div>
                            ) : (
                                <p className="text-red-400/80 text-xs font-bold">Hesap silinmiş</p>
                            )
                        )}
                    </div>

                    {/* Talep içeriği */}
                    <div className="bg-slate-800/60 rounded-xl p-3.5">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-sky-500/15 text-sky-300 border-sky-500/30">
                                {categoryLabel(ticket.category)}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                                {cfg.label}
                            </span>
                            <span className="ml-auto text-slate-600 text-[10px]">{fmtDate(ticket.createdAt)}</span>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{ticket.message}</p>
                    </div>

                    {/* Mevcut yanıt */}
                    {ticket.adminReply && (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5">
                            <p className="text-emerald-400/70 text-[10px] font-bold uppercase tracking-wider mb-1.5">Gönderilen Yanıt</p>
                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{ticket.adminReply}</p>
                            {ticket.repliedAt && (
                                <p className="text-slate-600 text-[10px] mt-1.5">{fmtDate(ticket.repliedAt)}</p>
                            )}
                        </div>
                    )}

                    {/* Aksiyonlar — sadece bekleyen taleplerde */}
                    {isPending && (
                        <div className="space-y-2">
                            <textarea
                                value={reply}
                                onChange={e => setReply(e.target.value)}
                                maxLength={2000}
                                rows={4}
                                placeholder="Yanıtınızı yazın... Gönderildiğinde başvurana bildirim iletilir."
                                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-sm text-[#dde8f5] placeholder-slate-600 focus:outline-none focus:border-sky-500/60 resize-none"
                            />
                            <button
                                onClick={() => onReply(reply)}
                                disabled={processing || !reply.trim()}
                                className="w-full flex items-center justify-center gap-2 bg-sky-700 hover:bg-sky-600 text-white py-3 rounded-xl font-black text-sm transition-all disabled:opacity-50"
                            >
                                <IconCheck size={15} /> Yanıtla ve Bildir
                            </button>
                            <button
                                onClick={onMarkReviewed}
                                disabled={processing}
                                className="w-full flex items-center justify-center gap-1.5 bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600 text-slate-300 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-50"
                            >
                                İncelendi Olarak İşaretle
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

const SupportTicketsPage: React.FC = () => {
    const {
        tickets, total, totalPages, page, setPage, search, setSearch, loading,
        audience, setAudience, statusFilter, setStatusFilter,
        selectedTicket, setSelectedTicket,
        processing, toast,
        handleReply, handleMarkReviewed,
    } = useSupportTickets();

    return (
        <div className="p-6 max-w-4xl mx-auto">

            {/* Toast */}
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
                    <IconSupport size={18} className="text-sky-400" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-[#dde8f5]">Destek Talepleri</h1>
                    <p className="text-[#7b9ab8] text-xs">İşletme ve kullanıcı destek başvuruları</p>
                </div>
                <span className="ml-auto text-[#7b9ab8] text-sm font-bold">{total} kayıt</span>
            </div>

            {/* Audience sekmeleri */}
            <div className="flex gap-2 mb-3">
                {AUDIENCE_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setAudience(tab.key as SupportAudience)}
                        className={`px-5 py-2 rounded-xl text-sm font-black border transition-all ${
                            audience === tab.key
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                : 'border-slate-700 text-[#7b9ab8] hover:bg-white/5 hover:text-[#dde8f5]'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Durum sekmeleri */}
            <div className="flex gap-2 mb-4">
                {FILTER_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setStatusFilter(tab.key)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                            statusFilter === tab.key
                                ? STATUS_CONFIG[tab.key].badge
                                : 'border-slate-700 text-[#7b9ab8] hover:bg-white/5 hover:text-[#dde8f5]'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="mb-5">
                <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder={audience === 'business' ? 'İşletme veya yetkili ara...' : 'Kullanıcı ara...'}
                />
            </div>

            {/* Liste */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white/5 border border-slate-700/40 rounded-2xl p-5 animate-pulse h-20" />
                    ))}
                </div>
            ) : tickets.length === 0 ? (
                <div className="text-center py-24">
                    <div className="w-16 h-16 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
                        <IconSupport size={28} className="text-slate-600" />
                    </div>
                    <p className="font-bold text-[#dde8f5] mb-1">Destek talebi bulunamadı</p>
                    <p className="text-[#7b9ab8] text-sm">
                        {statusFilter === 'pending' ? 'Bekleyen talep yok.' : 'Bu kategoride kayıt yok.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tickets.map(ticket => (
                        <TicketCard
                            key={ticket.id}
                            ticket={ticket}
                            onClick={() => setSelectedTicket(ticket)}
                        />
                    ))}
                </div>
            )}

            {!loading && (
                <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
            )}

            {/* Detay Modalı */}
            {selectedTicket && (
                <TicketDetailModal
                    ticket={selectedTicket}
                    processing={processing}
                    onClose={() => setSelectedTicket(null)}
                    onReply={(reply) => handleReply(selectedTicket.id, reply)}
                    onMarkReviewed={() => handleMarkReviewed(selectedTicket.id)}
                />
            )}
        </div>
    );
};

export default SupportTicketsPage;
