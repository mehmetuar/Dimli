import React from 'react';
import { X, Users, Phone, AlertTriangle, Check, MessageSquare, Star, Trophy, Repeat, History, PhoneCall } from 'lucide-react';
import { Clock } from 'lucide-react';
import { useModalBodyClass } from '../../../../utils/useModalBodyClass';
import { telHref } from '../../../../utils/phone';
import { teamLogoSrc, teamInitialsAvatar } from '../../../../utils/teamColors';

// İsteğin geliş zamanı — kart sağ üstünde küçük gösterim ("3 Tem 15:16").
const formatRequestTime = (createdAt?: string): string => {
    if (!createdAt) return '';
    const d = new Date(createdAt);
    return `${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
};

interface SlotDetailModalProps {
    selectedDate: string;
    selectedSlot: any;
    setSelectedSlot: (slot: any) => void;
    handleAcceptCancelRequest: (id: string) => void;
    handleRejectCancelRequest: (id: string) => void;
    openActionModal: (type: 'APPROVE' | 'SEND_NOTE', id: string) => void;
    handleCancelClick: (id: string) => void;
    handleRejectMatchRequest: (id: string) => void;
    handleManualFillSlot: (pitchId: string, slotTime: string) => void;
    handleRecurringCloseSlot: (pitchId: string, slotTime: string, startTime: string, endTime: string) => void;
    handleRemoveRecurringClosure: (recurringClosureId: string) => void;
}

export const SlotDetailModal: React.FC<SlotDetailModalProps> = ({
    selectedDate,
    selectedSlot,
    setSelectedSlot,
    handleAcceptCancelRequest,
    handleRejectCancelRequest,
    openActionModal,
    handleCancelClick,
    handleRejectMatchRequest,
    handleManualFillSlot,
    handleRecurringCloseSlot,
    handleRemoveRecurringClosure
}) => {
    const [playerWarning, setPlayerWarning] = React.useState<{
        isOpen: boolean; message: string; reservationId: string;
    }>({ isOpen: false, message: '', reservationId: '' });
    useModalBodyClass(!!selectedSlot);

    if (!selectedSlot) return null;

    const isSlotPast = (() => {
        const [hours, minutes] = selectedSlot.startTime.split(':').map(Number);
        const slotDate = new Date(selectedDate);
        slotDate.setHours(hours, minutes, 0, 0);
        return slotDate < new Date();
    })();

    return (
        <>
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedSlot(null)}>
            <div className="bg-slate-800 w-[min(calc(100vw-2rem),448px)] rounded-2xl p-[clamp(0.875rem,4vw,1.375rem)] border border-slate-700 max-h-[90vh] overflow-y-auto animate-scale-in shadow-2xl" style={{ overscrollBehavior: 'contain' }} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-[clamp(1.25rem,6vw,1.5rem)] font-black text-white leading-tight">{selectedSlot.startTime} - {selectedSlot.endTime}</h3>
                        <p className="text-slate-400 text-[clamp(0.75rem,3.5vw,0.875rem)] font-medium">
                            {isSlotPast
                                ? selectedSlot.status === 'FULL'
                                    ? 'Oynanmış Maç'
                                    : 'Geçmiş Saat'
                                : selectedSlot.status === 'FULL'
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

                                {/* İsteğin geliş zamanı — sağ üstte küçük (kapatma kartlarında yok) */}
                                {res.createdAt && res.team && (
                                    <div className="flex justify-end -mt-2 mb-2">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                            <History className="w-3 h-3" />
                                            İstek: {formatRequestTime(res.createdAt)}
                                        </span>
                                    </div>
                                )}

                                {res.type === 'DIRECT' && !res.team ? (
                                    <div className="flex flex-col items-center justify-center py-4">
                                        <div className="w-16 h-16 bg-slate-900 rounded-full mb-3 border-2 border-slate-600 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                                            {res.recurringClosureId ? (
                                                <Repeat className="w-6 h-6 text-orange-400" />
                                            ) : (
                                                <Clock className="w-6 h-6 text-slate-400" />
                                            )}
                                        </div>
                                        <h4 className="text-[clamp(1.1rem,5vw,1.25rem)] font-black text-white uppercase tracking-wider text-center mb-1">
                                            {res.recurringClosureId ? 'SÜREKLİ DOLU' : 'MANUEL DOLU'}
                                        </h4>
                                        <p className="text-slate-400 text-[clamp(0.7rem,3vw,0.75rem)] text-center mb-5 max-w-[220px] mx-auto">
                                            {res.recurringClosureId
                                                ? 'Bu saat sürekli kapatma kuralı nedeniyle her hafta otomatik olarak kapatılıyor.'
                                                : 'Bu saat işletme tarafından manuel olarak kapatılmıştır.'}
                                        </p>
                                        {/* Geçmiş saatte boşa çıkarma/kaldırma anlamsız → butonlar gizli */}
                                        {!isSlotPast && (res.recurringClosureId ? (
                                            <div className="flex flex-col gap-2 w-full px-4">
                                                <button
                                                    onClick={() => handleCancelClick(res.id)}
                                                    className="w-full bg-slate-700/50 hover:bg-slate-600 text-white py-[clamp(0.6rem,2.5vw,0.75rem)] rounded-xl font-bold text-[clamp(0.7rem,3.5vw,0.875rem)] transition-all flex items-center justify-center gap-2 border border-slate-600/50"
                                                >
                                                    <X className="w-[clamp(0.9rem,3.5vw,1.1rem)] h-[clamp(0.9rem,3.5vw,1.1rem)] text-red-400 shrink-0" />
                                                    <span>Sadece Bu Haftayı Boşa Çıkar</span>
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveRecurringClosure(res.recurringClosureId)}
                                                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 py-[clamp(0.6rem,2.5vw,0.75rem)] rounded-xl font-bold text-[clamp(0.7rem,3.5vw,0.875rem)] transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Repeat className="w-[clamp(0.9rem,3.5vw,1.1rem)] h-[clamp(0.9rem,3.5vw,1.1rem)] shrink-0" />
                                                    <span>Sürekli Kapatmayı Kaldır</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 w-full px-4">
                                                <button
                                                    onClick={() => handleCancelClick(res.id)}
                                                    className="w-full bg-slate-700/50 hover:bg-slate-600 text-white py-[clamp(0.6rem,2.5vw,0.75rem)] rounded-xl font-bold text-[clamp(0.7rem,3.5vw,0.875rem)] transition-all flex items-center justify-center gap-2 border border-slate-600/50"
                                                >
                                                    <X className="w-[clamp(0.9rem,3.5vw,1.1rem)] h-[clamp(0.9rem,3.5vw,1.1rem)] text-red-400 shrink-0" />
                                                    <span>Saati Boşa Çıkar</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        {/* TEAM 1 (Requester) */}
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="w-14 h-14 bg-slate-900 rounded-full border-2 border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                                                {res.team ? (
                                                    <img src={teamLogoSrc(res.team)} alt={res.team?.name} className="w-full h-full object-cover" onError={(e) => { const el = e.currentTarget; el.onerror = null; el.src = teamInitialsAvatar(res.team?.name); }} />
                                                ) : (
                                                    <Users className="w-6 h-6 text-slate-500" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-sport font-black text-[clamp(0.95rem,4.5vw,1.125rem)] text-white italic truncate">{res.team?.name || 'Bilinmeyen Takım'}</div>
                                                <div className="bg-slate-900/50 rounded-lg p-[clamp(0.5rem,2vw,0.625rem)] mt-1 border border-slate-700/50">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Kaptan</div>
                                                            <div className="text-sm font-bold text-slate-200 truncate">{res.team?.captain?.full_name || 'Bilinmiyor'}</div>
                                                            <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                                                <Phone className="w-3 h-3" />
                                                                {res.team?.captain?.phone || 'Tel Yok'}
                                                            </div>
                                                        </div>
                                                        {res.team?.captain?.phone && (
                                                            <a
                                                                href={telHref(res.team.captain.phone)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="w-10 h-10 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0 active:scale-95 transition-all"
                                                                title="Kaptanı Ara"
                                                            >
                                                                <PhoneCall className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-3 mt-2 pt-2 border-t border-slate-700/50">
                                                        <div className="flex items-center gap-1" title="Fair Play Skoru">
                                                            <Star className="w-3 h-3 text-green-500 fill-green-500/20" />
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
                                                <div className="relative bg-slate-800 px-3 text-orange-500 font-black text-[clamp(0.75rem,3.5vw,0.875rem)] flex items-center gap-1 text-center">
                                                    <Users className="w-[clamp(0.875rem,3.5vw,1rem)] h-[clamp(0.875rem,3.5vw,1rem)] shrink-0" /> KENDİ ARAMIZDA (Tek Takım)
                                                </div>
                                            </div>
                                        )}

                                        {/* TEAM 2 (Opponent) - If exists */}
                                        {res.opponentTeam && (
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="w-14 h-14 bg-slate-900 rounded-full border-2 border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                                                    {res.opponentTeam ? (
                                                        <img src={teamLogoSrc(res.opponentTeam)} alt={res.opponentTeam?.name} className="w-full h-full object-cover" onError={(e) => { const el = e.currentTarget; el.onerror = null; el.src = teamInitialsAvatar(res.opponentTeam?.name); }} />
                                                    ) : (
                                                        <Users className="w-6 h-6 text-slate-500" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-sport font-black text-[clamp(0.95rem,4.5vw,1.125rem)] text-white italic truncate">{res.opponentTeam?.name}</div>
                                                    <div className="bg-slate-900/50 rounded-lg p-[clamp(0.5rem,2vw,0.625rem)] mt-1 border border-slate-700/50">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Kaptan</div>
                                                                <div className="text-sm font-bold text-slate-200 truncate">{res.opponentTeam?.captain?.full_name || 'Bilinmiyor'}</div>
                                                                <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                                                    <Phone className="w-3 h-3" />
                                                                    {res.opponentTeam?.captain?.phone || 'Tel Yok'}
                                                                </div>
                                                            </div>
                                                            {res.opponentTeam?.captain?.phone && (
                                                                <a
                                                                    href={telHref(res.opponentTeam.captain.phone)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-10 h-10 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0 active:scale-95 transition-all"
                                                                    title="Kaptanı Ara"
                                                                >
                                                                    <PhoneCall className="w-4 h-4" />
                                                                </a>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-3 mt-2 pt-2 border-t border-slate-700/50">
                                                            <div className="flex items-center gap-1" title="Fair Play Skoru">
                                                                <Star className="w-3 h-3 text-green-500 fill-green-500/20" />
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
                                            {isSlotPast && res.status === 'APPROVED' ? (
                                                /* Geçmiş + onaylı = oynanmış maç — yalnız görüntüleme */
                                                <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold bg-emerald-500/10 py-3 rounded-xl border border-emerald-500/20">
                                                    <Trophy className="w-5 h-5" />
                                                    <span>Oynandı</span>
                                                </div>
                                            ) : isSlotPast && res.status !== 'REJECTED' ? (
                                                /* Geçmiş + onaylanmamış (PENDING/EXPIRED) = süresi geçmiş istek — pasif */
                                                <div className="flex flex-col items-center gap-1 text-slate-400 font-bold bg-slate-700/20 py-3 rounded-xl border border-slate-600/30">
                                                    <div className="flex items-center gap-2">
                                                        <History className="w-5 h-5" />
                                                        <span>Süresi Geçti</span>
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-slate-500">Onaylanmamış rezervasyon isteği</span>
                                                </div>
                                            ) : res.status === 'APPROVED' ? (
                                                <div className="space-y-2">
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
                                                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-[clamp(0.5rem,2vw,0.625rem)] rounded-xl font-bold text-[clamp(0.75rem,3.5vw,0.875rem)] transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <MessageSquare className="w-4 h-4 text-orange-400 shrink-0" />
                                                            <span>Not Gönder</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancelClick(res.id)}
                                                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 hover:border-red-500/50 p-[clamp(0.5rem,2vw,0.625rem)] rounded-xl transition-all flex items-center justify-center"
                                                            title="Onayı Geri Al"
                                                        >
                                                            <X className="w-5 h-5 shrink-0" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : res.status === 'REJECTED' ? (
                                                <div className="flex items-center justify-center gap-2 text-red-500 font-bold bg-red-900/10 py-3 rounded-xl border border-red-500/20">
                                                    <X className="w-5 h-5" />
                                                    <span>Reddedildi (Pasif)</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2">
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
                                                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-[clamp(0.75rem,3vw,1rem)] rounded-xl font-bold text-[clamp(0.8rem,4vw,0.95rem)] transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 group"
                                                    >
                                                        <div className="bg-white/20 p-1 rounded-full group-hover:scale-110 transition-transform shrink-0">
                                                            <Check className="w-4 h-4 shrink-0" />
                                                        </div>
                                                        <span>Bu İsteği Onayla</span>
                                                    </button>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => openActionModal('SEND_NOTE', res.id)}
                                                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-[clamp(0.625rem,2.5vw,0.875rem)] rounded-xl font-bold text-[clamp(0.8rem,4vw,0.875rem)] transition-all flex items-center justify-center gap-2"
                                                            title="Mesaj Gönder"
                                                        >
                                                            <MessageSquare className="w-4 h-4 text-orange-400 shrink-0" />
                                                            <span>Not</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectMatchRequest(res.id)}
                                                            className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 py-[clamp(0.625rem,2.5vw,0.875rem)] rounded-xl font-bold text-[clamp(0.8rem,4vw,0.875rem)] transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <X className="w-4 h-4 shrink-0" />
                                                            <span>Reddet</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    ) : isSlotPast ? (
                        /* Geçmiş + boş: bu saat rezervasyonsuz geçti — pasif bilgi */
                        <div className="text-center py-[clamp(2rem,10vw,3rem)] px-4 flex flex-col items-center bg-slate-900/30 rounded-2xl border border-dashed border-slate-700/50">
                            <div className="w-[clamp(3.5rem,15vw,4.5rem)] h-[clamp(3.5rem,15vw,4.5rem)] bg-slate-800/80 rounded-full flex items-center justify-center mb-4 border border-slate-700 shadow-inner">
                                <History className="w-[40%] h-[40%] text-slate-500" />
                            </div>
                            <p className="text-slate-300 text-[clamp(0.95rem,4.5vw,1.1rem)] font-black uppercase tracking-wide mb-1">Bu Saat Boş Geçti</p>
                            <p className="text-slate-500 text-[clamp(0.75rem,3.5vw,0.85rem)] font-medium max-w-[220px] leading-relaxed">Bu saat diliminde rezervasyon yapılmadı.</p>
                        </div>
                    ) : (
                        <div className="text-center py-[clamp(2rem,10vw,3rem)] px-4 flex flex-col items-center bg-slate-900/30 rounded-2xl border border-dashed border-slate-700/50">
                            <div className="w-[clamp(3.5rem,15vw,4.5rem)] h-[clamp(3.5rem,15vw,4.5rem)] bg-slate-800/80 rounded-full flex items-center justify-center mb-4 border border-slate-700 shadow-inner">
                                <Clock className="w-[40%] h-[40%] text-slate-500" />
                            </div>
                            <p className="text-slate-400 text-[clamp(0.85rem,4vw,1rem)] font-medium max-w-[200px] leading-relaxed">Bu saat için henüz bir istek bulunmuyor.</p>
                        </div>
                    )}

                    {selectedSlot.status !== 'FULL' && !isSlotPast && (
                        <div className="mt-4 border-t border-slate-700 pt-4 space-y-2">
                                <button
                                    onClick={() => {
                                        const manualFillDate = `${selectedDate}T${selectedSlot.startTime.padStart(5, '0')}:00`;
                                        handleManualFillSlot(selectedSlot.pitchId, manualFillDate);
                                    }}
                                    className="w-full bg-slate-700/50 hover:bg-slate-700 text-white py-[clamp(0.75rem,3vw,1rem)] px-4 rounded-xl font-bold text-[clamp(0.75rem,3.5vw,0.875rem)] transition-all flex items-center justify-center gap-2 border border-slate-600/50 hover:border-slate-500"
                                >
                                    <AlertTriangle className="w-[clamp(1.1rem,4vw,1.25rem)] h-[clamp(1.1rem,4vw,1.25rem)] text-orange-400 shrink-0" />
                                    <span className="truncate">Sadece Bu Tarihi Kapat</span>
                                </button>
                                <button
                                    onClick={() => {
                                        const slotDate = `${selectedDate}T${selectedSlot.startTime.padStart(5, '0')}:00`;
                                        handleRecurringCloseSlot(selectedSlot.pitchId, slotDate, selectedSlot.startTime, selectedSlot.endTime);
                                    }}
                                    className="w-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 py-[clamp(0.75rem,3vw,1rem)] px-4 rounded-xl font-bold text-[clamp(0.75rem,3.5vw,0.875rem)] transition-all flex items-center justify-center gap-2"
                                >
                                    <Repeat className="w-[clamp(1.1rem,4vw,1.25rem)] h-[clamp(1.1rem,4vw,1.25rem)] shrink-0" />
                                    <span className="truncate">Her {new Date(selectedDate).toLocaleDateString('tr-TR', { weekday: 'long' })} Sürekli Kapat</span>
                                </button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {playerWarning.isOpen && (
            <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-slate-800 w-[min(calc(100vw-2rem),384px)] rounded-3xl border border-orange-500/30 p-[clamp(1.25rem,5vw,1.5rem)] animate-scale-in">
                    <div className="flex items-center gap-3 mb-3">
                        <AlertTriangle className="w-[clamp(1.25rem,5vw,1.5rem)] h-[clamp(1.25rem,5vw,1.5rem)] text-orange-400 shrink-0" />
                        <h3 className="text-[clamp(1.1rem,5vw,1.25rem)] font-bold text-white leading-tight">Kadro Uyarısı</h3>
                    </div>
                    <p className="text-slate-300 text-[clamp(0.75rem,3.5vw,0.875rem)] mb-5 leading-relaxed">{playerWarning.message}</p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setPlayerWarning({ isOpen: false, message: '', reservationId: '' })}
                            className="flex-1 bg-slate-700/50 text-white font-bold py-[clamp(0.75rem,3vw,1rem)] rounded-xl hover:bg-slate-600 transition-colors text-[clamp(0.8rem,3.5vw,0.9rem)]"
                        >
                            İptal
                        </button>
                        <button
                            onClick={() => {
                                setPlayerWarning({ isOpen: false, message: '', reservationId: '' });
                                openActionModal('APPROVE', playerWarning.reservationId);
                            }}
                            className="flex-1 bg-orange-600 text-white font-bold py-[clamp(0.75rem,3vw,1rem)] rounded-xl hover:bg-orange-500 transition-colors text-[clamp(0.8rem,3.5vw,0.9rem)] shadow-lg shadow-orange-600/20"
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
