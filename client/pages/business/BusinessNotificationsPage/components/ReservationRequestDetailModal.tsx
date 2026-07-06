import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Users, Star, MapPin, CalendarDays, Clock, ArrowRight, History } from 'lucide-react';
import { useModalBodyClass } from '../../../../utils/useModalBodyClass';
import { BusinessNotification, ReservationRequestTeam, levelLabel, matchTypeLabel } from '../types';
import { teamInitialsAvatar } from '../../../../utils/teamColors';

interface ReservationRequestDetailModalProps {
    notification: BusinessNotification | null; // null → kapalı
    onClose: () => void;
}

export const ReservationRequestDetailModal: React.FC<ReservationRequestDetailModalProps> = ({
    notification,
    onClose,
}) => {
    const navigate = useNavigate();
    useModalBodyClass(!!notification); // navbar'ı gizler (agent.md §26)

    if (!notification) return null;

    const m = notification.metadata ?? {};
    const team = m.team ?? null;
    const opponent = m.opponentTeam ?? null;
    const badge = matchTypeLabel(m.matchType);
    const isKendiAramizda = m.matchType === 'kendi_aramizda';

    // Saat aralığı: startTime–endTime; yoksa legacy time'a düş.
    const timeRange = m.startTime
        ? `${m.startTime}${m.endTime ? ` – ${m.endTime}` : ''}`
        : m.time || '';
    // Gün + tarih: "Cuma, 4 Temmuz"; parçalar eksikse mevcut olanı göster.
    const dateLine = [m.dayName, m.date].filter(Boolean).join(', ');
    // İstek zamanı: bildirimin oluşturulma anı (cihaz saati İstanbul).
    const createdAtDate = notification.createdAt ? new Date(notification.createdAt) : null;
    const requestedAt = createdAtDate
        ? `${createdAtDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} ${createdAtDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
        : '';

    // Tek takım kartı — rakipli maçta iki kez (VS ayırıcıyla) kullanılır.
    const renderTeamCard = (t: ReservationRequestTeam, label: string | null) => {
        const lvl = levelLabel(t.level);
        return (
            <div className="bg-slate-900/50 rounded-2xl border border-slate-700/60 p-4">
                <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-slate-900 rounded-full border-2 border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                        <img
                            src={t.logo || teamInitialsAvatar(t.name)}
                            alt={t.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { const el = e.currentTarget; el.onerror = null; el.src = teamInitialsAvatar(t.name); }}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        {label && (
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">{label}</div>
                        )}
                        <div className="font-sport font-black text-[clamp(1rem,4.5vw,1.15rem)] text-white italic truncate">
                            {t.name || 'Bilinmeyen Takım'}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            {lvl && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-700/60 border border-slate-600/50 text-[11px] font-bold text-slate-200">
                                    {lvl}
                                </span>
                            )}
                            {t.fairPlay != null && (
                                <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20"
                                    title={t.ratingCount ? `${t.ratingCount} değerlendirme` : 'Fair Play Skoru'}
                                >
                                    <Star className="w-3 h-3 text-green-500 fill-green-500/30" />
                                    <span className="text-[11px] font-bold text-slate-200">
                                        {Number(t.fairPlay).toFixed(1)}
                                    </span>
                                    {t.ratingCount ? (
                                        <span className="text-[10px] text-slate-500 font-semibold">({t.ratingCount})</span>
                                    ) : null}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Doğrudan dashboard'daki slot detay modalını açar (Onayla/Reddet orada);
    // openSlot metadata'sı yoksa yalnız ilgili tarihe gider.
    const goToRequest = () => {
        onClose();
        navigate('/business/dashboard', {
            state: {
                selectedDate: m.slotDateIso || m.date,
                openSlot:
                    m.pitchId && m.startTime
                        ? { pitchId: m.pitchId, startTime: m.startTime }
                        : undefined,
            },
        });
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-slate-800 w-[min(calc(100vw-2rem),448px)] max-h-[90vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="shrink-0 flex items-start justify-between gap-3 p-[clamp(1rem,4vw,1.375rem)] border-b border-slate-700/60">
                    <div className="min-w-0">
                        <h3 className="text-[clamp(1.05rem,5vw,1.35rem)] font-black text-white leading-tight">Rezervasyon İsteği</h3>
                        {badge && (
                            <span
                                className={`inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wide ${
                                    isKendiAramizda
                                        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                                        : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                }`}
                            >
                                <Users className="w-3 h-3" />
                                {badge}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-700/50 rounded-full hover:bg-slate-600 text-slate-300 hover:text-white transition-colors shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div
                    className="flex-1 overflow-y-auto p-[clamp(1rem,4vw,1.375rem)] space-y-4"
                    style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                >
                    {/* Detaylar — en önemli bilgiler önce: saha, tarih, saat */}
                    <div className="bg-slate-900/50 rounded-2xl border border-slate-700/60 divide-y divide-slate-700/50">
                        {m.pitchName && (
                            <div className="flex items-center gap-3 p-4">
                                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Saha</div>
                                    <div className="text-white font-bold text-[clamp(0.85rem,3.8vw,0.95rem)] truncate">{m.pitchName}</div>
                                </div>
                            </div>
                        )}
                        {dateLine && (
                            <div className="flex items-center gap-3 p-4">
                                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
                                    <CalendarDays className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tarih</div>
                                    <div className="text-white font-bold text-[clamp(0.85rem,3.8vw,0.95rem)] capitalize truncate">{dateLine}</div>
                                </div>
                            </div>
                        )}
                        {timeRange && (
                            <div className="flex items-center gap-3 p-4">
                                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Saat</div>
                                    <div className="text-white font-bold text-[clamp(0.85rem,3.8vw,0.95rem)]">{timeRange}</div>
                                </div>
                            </div>
                        )}
                        {requestedAt && (
                            <div className="flex items-center gap-3 p-4">
                                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
                                    <History className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">İstek Zamanı</div>
                                    <div className="text-white font-bold text-[clamp(0.85rem,3.8vw,0.95rem)]">{requestedAt}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Takım(lar) — rakipli maçta iki kart + VS, tek takımda etiketli kart */}
                    {team && opponent ? (
                        <div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1 mb-2">Takımlar</div>
                            {renderTeamCard(team, null)}
                            <div className="relative flex items-center justify-center py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-700/50"></div>
                                </div>
                                <div className="relative bg-slate-800 px-3 text-slate-500 font-black italic text-sm">VS</div>
                            </div>
                            {renderTeamCard(opponent, null)}
                        </div>
                    ) : team ? (
                        renderTeamCard(team, 'İsteği Gönderen Takım')
                    ) : null}
                </div>

                {/* Footer */}
                <div
                    className="shrink-0 p-[clamp(0.875rem,4vw,1.25rem)] border-t border-slate-700/60"
                    style={{ paddingBottom: 'max(clamp(0.875rem,4vw,1.25rem), env(safe-area-inset-bottom))' }}
                >
                    <button
                        onClick={goToRequest}
                        className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-black py-[clamp(0.75rem,3.5vw,0.95rem)] rounded-2xl transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
                    >
                        Rezervasyon İsteğine Git
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
