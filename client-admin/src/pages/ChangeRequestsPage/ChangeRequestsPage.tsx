import React from 'react';
import { useChangeRequests } from './hooks/useChangeRequests';

type RequestType = 'CUSTOM_FACILITY' | 'PHOTO_UPDATE';
type RequestStatus = 'pending' | 'approved' | 'rejected';

const TYPE_LABELS: Record<RequestType, string> = {
    CUSTOM_FACILITY: 'Manuel İmkan',
    PHOTO_UPDATE: 'Fotoğraf Güncelleme',
};

const STATUS_STYLES: Record<RequestStatus, string> = {
    pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    approved: 'bg-green-500/20 text-green-300 border-green-500/40',
    rejected: 'bg-red-500/20 text-red-300 border-red-500/40',
};

const STATUS_LABELS: Record<RequestStatus, string> = {
    pending: 'Bekliyor',
    approved: 'Onaylandı',
    rejected: 'Reddedildi',
};

export default function ChangeRequestsPage() {
    const {
        requests, loading, statusFilter, setStatusFilter,
        selectedRequest, openRequest, closeRequest,
        rejectReason, setRejectReason,
        showRejectInput, setShowRejectInput,
        processing,
        handleApprove, handleReject,
    } = useChangeRequests();

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-black text-[#dde8f5]">Değişiklik İstekleri</h1>
                <p className="text-[#7b9ab8] text-sm mt-1">
                    İşletmelerin saha ayarlarında admin onayı gerektiren değişiklik talepleri.
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

            {loading ? (
                <div className="flex items-center justify-center py-20 text-[#7b9ab8]">
                    Yükleniyor...
                </div>
            ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#7b9ab8]">
                    <p className="text-lg font-bold mb-1">İstek Bulunamadı</p>
                    <p className="text-sm">Bu durumda henüz değişiklik isteği yok.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map(req => (
                        <div
                            key={req.id}
                            className="bg-[#0f1827] border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between gap-4"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[req.status]}`}>
                                        {STATUS_LABELS[req.status]}
                                    </span>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/20">
                                        {TYPE_LABELS[req.type]}
                                    </span>
                                </div>
                                <p className="text-[#dde8f5] font-bold text-sm truncate">
                                    {req.businessName ?? '—'} · {req.pitchName ?? '—'}
                                </p>
                                <p className="text-[#7b9ab8] text-xs mt-0.5">
                                    {new Date(req.createdAt).toLocaleDateString('tr-TR', {
                                        day: 'numeric', month: 'long', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
                                    })}
                                </p>
                                {req.status === 'rejected' && req.rejectionReason && (
                                    <p className="text-red-400 text-xs mt-1 truncate">
                                        Red: {req.rejectionReason}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => openRequest(req)}
                                className="shrink-0 bg-[#1a2d4a] hover:bg-[#1f3557] text-[#dde8f5] text-sm font-bold px-4 py-2 rounded-xl border border-slate-600/40 transition-colors"
                            >
                                İncele
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                    <div className="w-full max-w-lg bg-[#0f1827] border border-slate-600/50 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-[#1a2d4a] px-5 py-4 flex items-center justify-between border-b border-slate-700/40">
                            <div>
                                <h2 className="text-[#dde8f5] font-black text-base">
                                    {TYPE_LABELS[selectedRequest.type]} İsteği
                                </h2>
                                <p className="text-[#7b9ab8] text-xs mt-0.5">
                                    {selectedRequest.businessName} · {selectedRequest.pitchName}
                                </p>
                            </div>
                            <button onClick={closeRequest} className="text-slate-500 hover:text-slate-200 transition-colors p-1">
                                ✕
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {selectedRequest.type === 'CUSTOM_FACILITY' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
                                        <p className="text-[#7b9ab8] text-xs font-bold mb-2 uppercase tracking-wider">Mevcut İmkanlar</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(selectedRequest.currentData?.facilities || []).length > 0
                                                ? selectedRequest.currentData.facilities.map((f: string) => (
                                                    <span key={f} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-lg">{f}</span>
                                                ))
                                                : <span className="text-slate-500 text-xs">—</span>
                                            }
                                        </div>
                                    </div>
                                    <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/30">
                                        <p className="text-orange-400 text-xs font-bold mb-2 uppercase tracking-wider">Eklemek İstenen</p>
                                        <span className="text-[#dde8f5] font-black text-sm">
                                            {selectedRequest.requestedData?.facility ?? '—'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {selectedRequest.type === 'PHOTO_UPDATE' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-800/60 rounded-xl overflow-hidden border border-slate-700/40">
                                        <p className="text-[#7b9ab8] text-xs font-bold px-3 py-2 uppercase tracking-wider">Mevcut Fotoğraf</p>
                                        {selectedRequest.currentData?.imageUrl ? (
                                            <img src={selectedRequest.currentData.imageUrl} alt="Mevcut" className="w-full aspect-video object-cover" />
                                        ) : (
                                            <div className="w-full aspect-video flex items-center justify-center text-slate-600 text-xs">Fotoğraf yok</div>
                                        )}
                                    </div>
                                    <div className="bg-orange-500/10 rounded-xl overflow-hidden border border-orange-500/30">
                                        <p className="text-orange-400 text-xs font-bold px-3 py-2 uppercase tracking-wider">Yeni Fotoğraf</p>
                                        {selectedRequest.requestedData?.imageUrl ? (
                                            <img src={selectedRequest.requestedData.imageUrl} alt="Yeni" className="w-full aspect-video object-cover" />
                                        ) : (
                                            <div className="w-full aspect-video flex items-center justify-center text-slate-600 text-xs">Görüntü yok</div>
                                        )}
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

                            {selectedRequest.status === 'pending' ? (
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
                                                onClick={() => handleApprove(selectedRequest.id)}
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
                                                onClick={() => handleReject(selectedRequest.id)}
                                                disabled={processing || !rejectReason.trim()}
                                                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                                            >
                                                {processing ? 'Gönderiliyor...' : 'Reddi Gönder'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className={`p-3 rounded-xl border text-sm font-bold text-center ${STATUS_STYLES[selectedRequest.status]}`}>
                                    Bu istek {STATUS_LABELS[selectedRequest.status].toLowerCase()}.
                                    {selectedRequest.status === 'rejected' && selectedRequest.rejectionReason && (
                                        <p className="font-normal mt-1">Sebep: {selectedRequest.rejectionReason}</p>
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
