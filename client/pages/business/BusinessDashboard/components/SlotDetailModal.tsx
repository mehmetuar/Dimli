import React from 'react';
import { X, Users, Phone, AlertTriangle, Check, MessageSquare, Star, Trophy } from 'lucide-react';
import { Clock } from 'lucide-react';

interface SlotDetailModalProps {
    selectedDate: string;
    selectedSlot: any;
    setSelectedSlot: (slot: any) => void;
    handleAcceptCancelRequest: (id: string) => void;
    handleRejectCancelRequest: (id: string) => void;
    openActionModal: (type: 'APPROVE' | 'SEND_NOTE', id: string) => void;
    handleCancelClick: (id: string) => void;
    handleManualFillSlot: (pitchId: string, slotTime: string) => void;
}

export const SlotDetailModal: React.FC<SlotDetailModalProps> = ({
    selectedDate,
    selectedSlot,
    setSelectedSlot,
    handleAcceptCancelRequest,
    handleRejectCancelRequest,
    openActionModal,
    handleCancelClick,
    handleManualFillSlot
}) => {
    const [playerWarning, setPlayerWarning] = React.useState<{
        isOpen: boolean; message: string; reservationId: string;
    }>({ isOpen: false, message: '', reservationId: '' });

    if (!selectedSlot) return null;

    return (
        <>
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedSlot(null)}>
            <div className="bg-slate-800 w-full max-w-md rounded-2xl p-6 border border-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-white">{selectedSlot.startTime} - {selectedSlot.endTime}</h3>
                        <p className="text-slate-400 text-sm">
                            {selectedSlot.status === 'FULL'
                                ? 'Kesinleşmiş Maç'
                                : selectedSlot.reservations?.[0]?.matchAnnouncement?.matchType === 'kendi_aramizda'
                                    ? 'Kendi Aramızda İstekleri'
                                    : 'Rezervasyon İstekleri'}
                        </p>
                    </div>
                    <button onClick={() => setSelectedSlot(null)} className="p-2 bg-slate-700/50 rounded-full hover:bg-slate-600 text-slate-300 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    {selectedSlot.reservations.length > 0 ? (
                        selectedSlot.reservations.map((res: any) => (
                            <div key={res.id} className={`p-5 rounded-2xl border transition-all ${res.status === 'APPROVED'
                                ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-orange-500/30 ring-1 ring-orange-500/20'
                                : res.status === 'REJECTED'
                                    ? 'bg-slate-800/50 border-red-900/30 opacity-75'
                                    : 'bg-slate-800 border-slate-700'
                                }`}>

                                {res.type === 'DIRECT' && !res.team ? (
                                    <div className="flex flex-col items-center justify-center py-4">
                                        <div className="w-16 h-16 bg-slate-900 rounded-full mb-3 border-2 border-slate-600 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                                            <Clock className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <h4 className="text-xl font-black text-white uppercase tracking-wider text-center mb-1">MANUEL DOLU</h4>
                                        <p className="text-slate-400 text-xs text-center mb-5 max-w-[200px] mx-auto">Bu saat işletme tarafından manuel olarak kapatılmıştır.</p>
                                        <div className="flex gap-2 w-full px-4">
                                            <button
                                                onClick={() => handleCancelClick(res.id)}
                                                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                            >
                                                <X className="w-4 h-4 text-red-400" />
                                                Saati Boşa Çıkar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* TEAM 1 (Requester) */}
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="w-14 h-14 bg-slate-900 rounded-full border-2 border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                                                {res.team?.logoUrl ? (
                                                    <img src={res.team.logoUrl} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Users className="w-6 h-6 text-slate-500" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-sport font-black text-lg text-white italic truncate">{res.team?.name || 'Bilinmeyen Takım'}</div>
                                                <div className="bg-slate-900/50 rounded-lg p-2 mt-1 border border-slate-700/50">
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Kaptan</div>
                                                    <div className="text-sm font-bold text-slate-200 truncate">{res.team?.captain?.full_name || 'Bilinmiyor'}</div>
                                                    <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                                        <Phone className="w-3 h-3" />
                                                        {res.team?.captain?.phone || 'Tel Yok'}
                                                    </div>
                                                    <div className="flex gap-3 mt-2 pt-2 border-t border-slate-700/50">
                                                        <div className="flex items-center gap-1" title="Fair Play Skoru">
                                                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500/20" />
                                                            <span className="text-[10px] font-bold text-slate-300">{res.team?.fairPlayScore || '0.0'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1" title="Oynadığı Maç Sayısı">
                                                            <Trophy className="w-3 h-3 text-blue-400" />
                                                            <span className="text-[10px] font-bold text-slate-300">{res.team?.playedMatchCount || 0} Maç</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* VS Badge if Opponent Exists or if Kendi Aramızda indicated */}
                                        {res.opponentTeam && (
                                            <div className="relative flex items-center justify-center py-2 mb-4">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-slate-700/50"></div>
                                                </div>
                                                <div className="relative bg-slate-800 px-3 text-slate-500 font-black italic">VS</div>
                                            </div>
                                        )}
                                        {!res.opponentTeam && res.matchAnnouncement?.matchType === 'kendi_aramizda' && (
                                            <div className="relative flex items-center justify-center py-2 mb-4">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-slate-700/50"></div>
                                                </div>
                                                <div className="relative bg-slate-800 px-3 text-orange-500 font-black italic flex items-center gap-1">
                                                    <Users className="w-4 h-4" /> KENDİ ARAMIZDA (Tek Takım)
                                                </div>
                                            </div>
                                        )}

                                        {/* TEAM 2 (Opponent) - If exists */}
                                        {res.opponentTeam && (
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="w-14 h-14 bg-slate-900 rounded-full border-2 border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                                                    {res.opponentTeam?.logoUrl ? (
                                                        <img src={res.opponentTeam.logoUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Users className="w-6 h-6 text-slate-500" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-sport font-black text-lg text-white italic truncate">{res.opponentTeam?.name}</div>
                                                    <div className="bg-slate-900/50 rounded-lg p-2 mt-1 border border-slate-700/50">
                                                        <div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Kaptan</div>
                                                        <div className="text-sm font-bold text-slate-200 truncate">{res.opponentTeam?.captain?.full_name || 'Bilinmiyor'}</div>
                                                        <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            {res.opponentTeam?.captain?.phone || 'Tel Yok'}
                                                        </div>
                                                        <div className="flex gap-3 mt-2 pt-2 border-t border-slate-700/50">
                                                            <div className="flex items-center gap-1" title="Fair Play Skoru">
                                                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500/20" />
                                                                <span className="text-[10px] font-bold text-slate-300">{res.opponentTeam?.fairPlayScore || '0.0'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1" title="Oynadığı Maç Sayısı">
                                                                <Trophy className="w-3 h-3 text-blue-400" />
                                                                <span className="text-[10px] font-bold text-slate-300">{res.opponentTeam?.playedMatchCount || 0} Maç</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* STATUS & ACTIONS */}
                                        <div className="mt-4 pt-4 border-t border-slate-700/50">
                                            {res.status === 'APPROVED' ? (
                                                <div className="space-y-3">
                                                    {res.cancelRequested ? (
                                                        <div className="flex flex-col gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 p-1 px-2 bg-orange-500 text-white text-[10px] font-bold rounded-bl-lg uppercase">Talep</div>
                                                            <div className="flex items-center gap-2 text-orange-400 font-bold">
                                                                <AlertTriangle className="w-5 h-5" />
                                                                <span>Maç İptal İsteği!</span>
                                                            </div>
                                                            <p className="text-xs text-slate-300">Bu maç takım tarafından iptal edilmek isteniyor.</p>
                                                            <div className="flex gap-2 mt-2">
                                                                <button
                                                                    onClick={() => handleAcceptCancelRequest(res.id)}
                                                                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/30 py-2 rounded-lg font-bold text-sm transition-all"
                                                                >
                                                                    İptali Onayla
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectCancelRequest(res.id)}
                                                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-bold text-sm transition-all"
                                                                >
                                                                    Reddet
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-2 text-green-400 font-bold bg-green-500/10 py-3 rounded-xl border border-green-500/20">
                                                            <Check className="w-5 h-5" />
                                                            <span>Kesinleşmiş Rezervasyon</span>
                                                        </div>
                                                    )}
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => openActionModal('SEND_NOTE', res.id)}
                                                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <MessageSquare className="w-4 h-4 text-orange-400" />
                                                            Not Gönder
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancelClick(res.id)}
                                                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 hover:border-red-500/50 p-2 rounded-xl transition-all"
                                                            title="Onayı Geri Al"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : res.status === 'REJECTED' ? (
                                                <div className="flex items-center justify-center gap-2 text-red-500 font-bold bg-red-900/10 py-3 rounded-xl border border-red-500/20">
                                                    <X className="w-5 h-5" />
                                                    <span>Reddedildi (Pasif)</span>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const required = res.matchAnnouncement?.playerCount;
                                                            const homeCount = res.team?.playerCount;
                                                            const isKendiAramizda = !res.opponentTeam;

                                                            if (required == null) {
                                                                openActionModal('APPROVE', res.id);
                                                                return;
                                                            }

                                                            let warningMsg = '';

                                                            if (isKendiAramizda) {
                                                                // Kendi aramızda: tüm oyuncular bu takımda, required * 2 gerekli
                                                                const totalRequired = required * 2;
                                                                if (homeCount !== undefined && homeCount < totalRequired) {
                                                                    warningMsg = `${res.team?.name} takımının kadrosunda ${totalRequired} oyuncu bulunmuyor. Lütfen oyuncu sayılarının eksiksiz olduğunu teyit edin`;
                                                                }
                                                            } else {
                                                                const awayCount = res.opponentTeam?.playerCount;
                                                                const hasHomeWarning = homeCount !== undefined && homeCount < required;
                                                                const hasAwayWarning = awayCount !== undefined && awayCount < required;

                                                                if (hasHomeWarning && hasAwayWarning) {
                                                                    warningMsg = `${res.team?.name} Ve ${res.opponentTeam?.name} takımlarının kadrosunda ${required} oyuncu bulunmuyor. Lütfen oyuncu sayılarını teyit ediniz`;
                                                                } else if (hasHomeWarning) {
                                                                    warningMsg = `${res.team?.name} takımının kadrosunda ${required} oyuncu bulunmuyor. Lütfen oyuncu sayılarının eksiksiz olduğunu teyit edin`;
                                                                } else if (hasAwayWarning) {
                                                                    warningMsg = `${res.opponentTeam?.name} takımının kadrosunda ${required} oyuncu bulunmuyor. Lütfen oyuncu sayılarının eksiksiz olduğunu teyit edin`;
                                                                }
                                                            }

                                                            if (warningMsg) {
                                                                setPlayerWarning({ isOpen: true, message: warningMsg, reservationId: res.id });
                                                            } else {
                                                                openActionModal('APPROVE', res.id);
                                                            }
                                                        }}
                                                        className="flex-[2] bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 group"
                                                    >
                                                        <div className="bg-white/20 p-1 rounded-full group-hover:scale-110 transition-transform">
                                                            <Check className="w-4 h-4" />
                                                        </div>
                                                        Bu İsteği Onayla
                                                    </button>
                                                    <button
                                                        onClick={() => openActionModal('SEND_NOTE', res.id)}
                                                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                                        title="Mesaj Gönder"
                                                    >
                                                        <MessageSquare className="w-4 h-4 text-orange-400" />
                                                        Not
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-slate-500 py-12 flex flex-col items-center bg-slate-800/50 rounded-2xl border border-dashed border-slate-700">
                            <Clock className="w-12 h-12 text-slate-700 mb-3" />
                            <p>Bu saat için henüz bir istek bulunmuyor.</p>
                        </div>
                    )}

                    {selectedSlot.status !== 'FULL' && (
                        <div className="mt-4 border-t border-slate-700 pt-4">
                            <button
                                onClick={() => {
                                    const manualFillDate = `${selectedDate}T${selectedSlot.startTime.padStart(5, '0')}:00`;
                                    handleManualFillSlot(selectedSlot.pitchId, manualFillDate);
                                }}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-slate-600"
                            >
                                <AlertTriangle className="w-5 h-5 text-orange-400" />
                                İşletme Olarak Saati Kapat (Doluya Çevir)
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {playerWarning.isOpen && (
            <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
                <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-orange-500/30 p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <AlertTriangle className="w-6 h-6 text-orange-400 shrink-0" />
                        <h3 className="text-lg font-bold text-white">Kadro Uyarısı</h3>
                    </div>
                    <p className="text-slate-300 text-sm mb-5">{playerWarning.message}</p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setPlayerWarning({ isOpen: false, message: '', reservationId: '' })}
                            className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-600 transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            onClick={() => {
                                setPlayerWarning({ isOpen: false, message: '', reservationId: '' });
                                openActionModal('APPROVE', playerWarning.reservationId);
                            }}
                            className="flex-1 bg-orange-600 text-white font-bold py-3 rounded-xl hover:bg-orange-500 transition-colors"
                        >
                            Yine de Onayla
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};
