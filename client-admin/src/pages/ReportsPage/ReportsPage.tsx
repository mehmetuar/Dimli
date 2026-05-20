import React from 'react';
import { IconFlag, IconBan, IconCheck, IconX, IconUser, IconChevronRight, IconAlertCircle } from '../../components/Icons';
import { useReports, Report } from './hooks/useReports';

// ─── Sabitler ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    pending:   { label: 'Bekleyen',   badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
    reviewed:  { label: 'İncelendi',  badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    dismissed: { label: 'Yoksayıldı', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
} as const;

const FILTER_TABS = [
    { key: 'pending'   as const, label: 'Bekleyen' },
    { key: 'reviewed'  as const, label: 'İncelendi' },
    { key: 'dismissed' as const, label: 'Yoksayıldı' },
];

// ─── Yardımcı: tarih formatı ──────────────────────────────────────────────────

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('tr-TR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

// ─── Rapor Kartı ──────────────────────────────────────────────────────────────

const ReportCard: React.FC<{ report: Report; onClick: () => void }> = ({ report, onClick }) => {
    const cfg = STATUS_CONFIG[report.status];
    const reporterName = report.reporter?.full_name || report.reporter?.username || 'Bilinmiyor';
    const reportedName = report.reportedUser?.full_name || report.reportedUser?.username || 'Bilinmiyor';

    return (
        <div
            onClick={onClick}
            className="bg-[#1e2d47] border border-slate-700/40 rounded-2xl p-5 cursor-pointer hover:border-slate-500/60 hover:bg-[#243458] transition-all flex items-center gap-4 group"
        >
            {/* Sol — ikon */}
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <IconFlag size={18} className="text-orange-400" />
            </div>

            {/* Orta — içerik */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#dde8f5] font-black text-sm truncate">{reportedName}</span>
                    {report.reportedUser?.isChatBanned && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1 shrink-0">
                            <IconBan size={10} /> Yasaklı
                        </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${cfg.badge}`}>
                        {cfg.label}
                    </span>
                </div>
                <p className="text-[#7b9ab8] text-xs mt-0.5">
                    Şikayet eden: <span className="text-slate-300">{reporterName}</span>
                </p>
                {report.note && (
                    <p className="text-slate-500 text-xs mt-1 truncate">"{report.note}"</p>
                )}
                <p className="text-slate-600 text-[10px] mt-1">{fmtDate(report.createdAt)}</p>
            </div>

            {/* Sağ */}
            <IconChevronRight size={16} className="text-slate-500 group-hover:text-orange-400 shrink-0 transition-colors" />
        </div>
    );
};

// ─── Detay Modalı ─────────────────────────────────────────────────────────────

const ReportDetailModal: React.FC<{
    report: Report;
    processing: boolean;
    onClose: () => void;
    onReview: () => void;
    onDismiss: () => void;
    onBanAndReview: () => void;
    onUnban: () => void;
}> = ({ report, processing, onClose, onReview, onDismiss, onBanAndReview, onUnban }) => {
    const reporterName  = report.reporter?.full_name  || report.reporter?.username  || 'Bilinmiyor';
    const reportedName  = report.reportedUser?.full_name || report.reportedUser?.username || 'Bilinmiyor';
    const isBanned      = report.reportedUser?.isChatBanned ?? false;
    const isPending     = report.status === 'pending';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="w-full max-w-lg bg-[#0f1827] border border-slate-600/50 rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="bg-[#1a2d4a] px-5 py-4 flex items-center justify-between border-b border-slate-700/40">
                    <div className="flex items-center gap-2">
                        <IconFlag size={16} className="text-orange-400" />
                        <h2 className="text-[#dde8f5] font-black text-base">Şikayet Detayı</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
                        <IconX size={18} />
                    </button>
                </div>

                {/* İçerik */}
                <div className="p-5 space-y-4">

                    {/* Kullanıcı kartları */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Şikayet eden */}
                        <div className="bg-slate-800/60 rounded-xl p-3.5">
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Şikayet Eden</p>
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                                    <IconUser size={12} className="text-slate-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[#dde8f5] text-sm font-bold truncate">{reporterName}</p>
                                    {report.reporter?.username && (
                                        <p className="text-slate-500 text-[10px] truncate">@{report.reporter.username}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Şikayet edilen */}
                        <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3.5">
                            <p className="text-orange-400/70 text-[10px] font-bold uppercase tracking-wider mb-1.5">Şikayet Edilen</p>
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                                    <IconUser size={12} className="text-orange-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[#dde8f5] text-sm font-bold truncate">{reportedName}</p>
                                    {report.reportedUser?.username && (
                                        <p className="text-slate-500 text-[10px] truncate">@{report.reportedUser.username}</p>
                                    )}
                                </div>
                            </div>
                            {isBanned && (
                                <div className="mt-2 flex items-center gap-1 text-red-300 text-[10px] font-bold">
                                    <IconBan size={10} /> Chat yasağı aktif
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Not */}
                    {report.note && (
                        <div className="bg-slate-800/60 rounded-xl p-3.5">
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Kullanıcı Notu</p>
                            <p className="text-slate-300 text-sm leading-relaxed">"{report.note}"</p>
                        </div>
                    )}

                    {/* Meta */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-800/40 rounded-xl p-3">
                            <p className="text-slate-600 mb-0.5">Tarih</p>
                            <p className="text-slate-300 font-medium">{fmtDate(report.createdAt)}</p>
                        </div>
                        <div className="bg-slate-800/40 rounded-xl p-3">
                            <p className="text-slate-600 mb-0.5">Durum</p>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_CONFIG[report.status].badge}`}>
                                {STATUS_CONFIG[report.status].label}
                            </span>
                        </div>
                    </div>

                    {/* Aksiyonlar — sadece bekleyen şikayetlerde */}
                    {isPending && (
                        <div className="pt-1 space-y-2">
                            {/* Chat ban */}
                            {!isBanned ? (
                                <button
                                    onClick={onBanAndReview}
                                    disabled={processing}
                                    className="w-full flex items-center justify-center gap-2 bg-amber-600/15 hover:bg-amber-600/25 border border-amber-500/40 text-amber-300 py-3 rounded-xl font-black text-sm transition-all disabled:opacity-50"
                                >
                                    <IconBan size={15} />
                                    Chat Yasağı Uygula + İncele
                                </button>
                            ) : (
                                <button
                                    onClick={onUnban}
                                    disabled={processing}
                                    className="w-full flex items-center justify-center gap-2 bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600 text-slate-300 py-3 rounded-xl font-black text-sm transition-all disabled:opacity-50"
                                >
                                    <IconBan size={15} />
                                    Chat Yasağını Kaldır
                                </button>
                            )}

                            {/* İncele / Yoksay */}
                            <div className="flex gap-2">
                                <button
                                    onClick={onDismiss}
                                    disabled={processing}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-50"
                                >
                                    <IconX size={14} /> Yoksay
                                </button>
                                <button
                                    onClick={onReview}
                                    disabled={processing}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-50"
                                >
                                    <IconCheck size={14} /> İncele
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

const ReportsPage: React.FC = () => {
    const {
        reports, loading, statusFilter, setStatusFilter,
        selectedReport, setSelectedReport,
        processing, toast,
        handleUpdateStatus, handleChatBanAndReview, handleChatUnban,
    } = useReports();

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
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <IconFlag size={18} className="text-orange-400" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-[#dde8f5]">Kullanıcı Şikayetleri</h1>
                    <p className="text-[#7b9ab8] text-xs">Uygunsuz içerik ve kullanıcı bildirimleri</p>
                </div>
                <span className="ml-auto text-[#7b9ab8] text-sm font-bold">{reports.length} kayıt</span>
            </div>

            {/* Filtre sekmeleri */}
            <div className="flex gap-2 mb-6">
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

            {/* Liste */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white/5 border border-slate-700/40 rounded-2xl p-5 animate-pulse h-20" />
                    ))}
                </div>
            ) : reports.length === 0 ? (
                <div className="text-center py-24">
                    <div className="w-16 h-16 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
                        <IconFlag size={28} className="text-slate-600" />
                    </div>
                    <p className="font-bold text-[#dde8f5] mb-1">Şikayet bulunamadı</p>
                    <p className="text-[#7b9ab8] text-sm">
                        {statusFilter === 'pending' ? 'Bekleyen şikayet yok.' : 'Bu kategoride kayıt yok.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {reports.map(report => (
                        <ReportCard
                            key={report.id}
                            report={report}
                            onClick={() => setSelectedReport(report)}
                        />
                    ))}
                </div>
            )}

            {/* Detay Modalı */}
            {selectedReport && (
                <ReportDetailModal
                    report={selectedReport}
                    processing={processing}
                    onClose={() => setSelectedReport(null)}
                    onReview={() => handleUpdateStatus(selectedReport.id, 'reviewed')}
                    onDismiss={() => handleUpdateStatus(selectedReport.id, 'dismissed')}
                    onBanAndReview={() => handleChatBanAndReview(selectedReport)}
                    onUnban={() => handleChatUnban(selectedReport.reportedUserId)}
                />
            )}
        </div>
    );
};

export default ReportsPage;
