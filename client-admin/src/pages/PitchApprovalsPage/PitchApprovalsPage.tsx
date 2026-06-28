import React from 'react';
import SearchInput from '../../components/SearchInput';
import Pagination from '../../components/Pagination';
import { usePitchApprovals } from './hooks/usePitchApprovals';

type ApprovalStatus = 'pending' | 'approved' | 'rejected';

const STATUS_STYLES: Record<ApprovalStatus, string> = {
    pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    approved: 'bg-green-500/20 text-green-300 border-green-500/40',
    rejected: 'bg-red-500/20 text-red-300 border-red-500/40',
};

const STATUS_LABELS: Record<ApprovalStatus, string> = {
    pending: 'Bekliyor',
    approved: 'Onaylandı',
    rejected: 'Reddedildi',
};

const TYPE_LABELS: Record<string, string> = {
    INDOOR: 'Kapalı Saha',
    OUTDOOR: 'Açık Saha',
};

export default function PitchApprovalsPage() {
    const {
        pitches, total, totalPages, page, setPage, search, setSearch,
        loading, statusFilter, setStatusFilter,
        selectedPitch, openPitch, closePitch,
        rejectReason, setRejectReason,
        showRejectInput, setShowRejectInput,
        processing,
        handleApprove, handleReject,
    } = usePitchApprovals();

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-black text-[#dde8f5]">Saha Onayları</h1>
                <p className="text-[#7b9ab8] text-sm mt-1">
                    İşletmelerin abonelik planlarına eklediği yeni sahaların onay talepleri.
                </p>
            </div>

            <div className="flex gap-2 mb-6">
                {(['pending', 'approved', 'rejected'] as const).map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${statusFilter === s
                            ? STATUS_STYLES[s]
                            : 'border-slate-700 text-[#7b9ab8] hover:bg-white/5'
                            }`}
                    >
                        {STATUS_LABELS[s]}
                    </button>
                ))}
            </div>

            <div className="mb-5">
                <SearchInput value={search} onChange={setSearch} placeholder="İşletme veya saha adı ara..." />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-[#7b9ab8]">
                    Yükleniyor...
                </div>
            ) : pitches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#7b9ab8]">
                    <p className="text-lg font-bold mb-1">Saha Bulunamadı</p>
                    <p className="text-sm">Bu durumda henüz saha onay talebi yok.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {pitches.map(pitch => (
                        <div
                            key={pitch.id}
                            className="bg-[#0f1827] border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between gap-4"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[pitch.approvalStatus]}`}>
                                        {STATUS_LABELS[pitch.approvalStatus]}
                                    </span>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/20">
                                        {TYPE_LABELS[pitch.type] ?? pitch.type}
                                    </span>
                                </div>
                                <p className="text-[#dde8f5] font-bold text-sm truncate">
                                    {pitch.businessName ?? '—'} · {pitch.name}
                                </p>
                                <p className="text-[#7b9ab8] text-xs mt-0.5">
                                    {new Date(pitch.createdAt).toLocaleDateString('tr-TR', {
                                        day: 'numeric', month: 'long', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
                                    })}
                                </p>
                                {pitch.approvalStatus === 'rejected' && pitch.rejectionReason && (
                                    <p className="text-red-400 text-xs mt-1 truncate">
                                        Red: {pitch.rejectionReason}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => openPitch(pitch)}
                                className="shrink-0 bg-[#1a2d4a] hover:bg-[#1f3557] text-[#dde8f5] text-sm font-bold px-4 py-2 rounded-xl border border-slate-600/40 transition-colors"
                            >
                                İncele
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {!loading && (
                <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
            )}

            {selectedPitch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                    <div className="w-full max-w-lg bg-[#0f1827] border border-slate-600/50 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="bg-[#1a2d4a] px-5 py-4 flex items-center justify-between border-b border-slate-700/40 shrink-0">
                            <div>
                                <h2 className="text-[#dde8f5] font-black text-base">
                                    Yeni Saha Talebi
                                </h2>
                                <p className="text-[#7b9ab8] text-xs mt-0.5">
                                    {selectedPitch.businessName} · {selectedPitch.name}
                                </p>
                            </div>
                            <button onClick={closePitch} className="text-slate-500 hover:text-slate-200 transition-colors p-1">
                                ✕
                            </button>
                        </div>

                        <div className="p-5 space-y-4 overflow-y-auto">
                            {selectedPitch.imageUrl && (
                                <div className="bg-slate-800/60 rounded-xl overflow-hidden border border-slate-700/40">
                                    <img src={selectedPitch.imageUrl} alt={selectedPitch.name} className="w-full aspect-video object-cover" />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
                                    <p className="text-[#7b9ab8] text-xs font-bold mb-1 uppercase tracking-wider">Saha Adı</p>
                                    <p className="text-[#dde8f5] font-bold text-sm">{selectedPitch.name}</p>
                                </div>
                                <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
                                    <p className="text-[#7b9ab8] text-xs font-bold mb-1 uppercase tracking-wider">Tip</p>
                                    <p className="text-[#dde8f5] font-bold text-sm">{TYPE_LABELS[selectedPitch.type] ?? selectedPitch.type}</p>
                                </div>
                                <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
                                    <p className="text-[#7b9ab8] text-xs font-bold mb-1 uppercase tracking-wider">Saatlik Ücret</p>
                                    <p className="text-[#dde8f5] font-bold text-sm">{selectedPitch.pricePerHour} ₺</p>
                                </div>
                                <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
                                    <p className="text-[#7b9ab8] text-xs font-bold mb-1 uppercase tracking-wider">Çalışma Saatleri</p>
                                    <p className="text-[#dde8f5] font-bold text-sm">{selectedPitch.openTime} – {selectedPitch.closeTime}</p>
                                </div>
                            </div>

                            {selectedPitch.facilities && selectedPitch.facilities.length > 0 && (
                                <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
                                    <p className="text-[#7b9ab8] text-xs font-bold mb-2 uppercase tracking-wider">İmkanlar</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedPitch.facilities.map((f) => (
                                            <span key={f} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-lg">{f}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedPitch.timeSlots && selectedPitch.timeSlots.length > 0 && (
                                <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
                                    <p className="text-[#7b9ab8] text-xs font-bold mb-2 uppercase tracking-wider">Özel Saat Slotları</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedPitch.timeSlots.map((s, i) => (
                                            <span key={i} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-lg">
                                                {s.startTime} - {s.endTime}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {showRejectInput && (
                                <div>
                                    <label className="text-[#7b9ab8] text-xs font-bold block mb-2 uppercase tracking-wider">
                                        Red Sebebi *
                                    </label>
                                    <textarea
                                        value={rejectReason}
                                        onChange={e => setRejectReason(e.target.value)}
                                        placeholder="Red sebebini açıklayın..."
                                        rows={3}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-[#dde8f5] text-sm placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none"
                                        autoFocus
                                    />
                                </div>
                            )}

                            {selectedPitch.approvalStatus === 'pending' ? (
                                <div className="flex gap-3 pt-1">
                                    {!showRejectInput ? (
                                        <>
                                            <button
                                                onClick={() => setShowRejectInput(true)}
                                                disabled={processing}
                                                className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                                            >
                                                Reddet
                                            </button>
                                            <button
                                                onClick={() => handleApprove(selectedPitch.id)}
                                                disabled={processing}
                                                className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                                            >
                                                {processing ? 'İşleniyor...' : 'Onayla'}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                                                disabled={processing}
                                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                                            >
                                                Geri
                                            </button>
                                            <button
                                                onClick={() => handleReject(selectedPitch.id)}
                                                disabled={processing || !rejectReason.trim()}
                                                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                                            >
                                                {processing ? 'Gönderiliyor...' : 'Reddi Gönder'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className={`p-3 rounded-xl border text-sm font-bold text-center ${STATUS_STYLES[selectedPitch.approvalStatus]}`}>
                                    Bu saha {STATUS_LABELS[selectedPitch.approvalStatus].toLowerCase()}.
                                    {selectedPitch.approvalStatus === 'rejected' && selectedPitch.rejectionReason && (
                                        <p className="font-normal mt-1">Sebep: {selectedPitch.rejectionReason}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
