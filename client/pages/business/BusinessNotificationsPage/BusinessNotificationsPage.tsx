import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Calendar, Clock, ChevronRight, Users, Star, MapPin } from 'lucide-react';
import { getBusinessNotificationsPaged } from '../../../services/api';
import { getOwnerId } from '../../../services/authStorage';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
import { BusinessLoadingSpinner } from '../../../components/Business/BusinessLoadingSpinner';
import { stripNotificationEmoji } from '../../../utils/notificationText';
import { ReservationRequestDetailModal } from './components/ReservationRequestDetailModal';
import { BusinessNotification, levelLabel, matchTypeLabel } from './types';
import { teamInitialsAvatar } from '../../../utils/teamColors';

const PAGE_SIZE = 20;

export const BusinessNotificationsPage: React.FC = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<BusinessNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedRR, setSelectedRR] = useState<BusinessNotification | null>(null);

    // Sayfalama yarış korumaları (useNotifications/usePitchBooking deseni):
    // her reset bir "nesil" başlatır; eski yanıtlar reset'ten sonra uygulanmaz.
    const notificationsRef = useRef<BusinessNotification[]>(notifications);
    notificationsRef.current = notifications;
    const isFetchingRef = useRef(false);
    const fetchGenRef = useRef(0);

    // 20'şerli sunucu sayfalama + append + id-dedup (müşteri useNotifications aynası).
    const fetchNotifications = useCallback(async (reset: boolean) => {
        if (!reset && isFetchingRef.current) return;
        const ownerId = getOwnerId();
        if (!ownerId) { setLoading(false); return; }
        const gen = reset ? ++fetchGenRef.current : fetchGenRef.current;
        const offset = reset ? 0 : notificationsRef.current.length;
        isFetchingRef.current = true;
        if (!reset) setLoadingMore(true);
        try {
            const { items, hasMore: more } = await getBusinessNotificationsPaged({
                ownerId, limit: PAGE_SIZE, offset,
            });
            if (gen !== fetchGenRef.current) return; // daha yeni bir reset bunu geçersiz kıldı
            if (reset) {
                setNotifications(items as BusinessNotification[]);
            } else {
                // id-bazlı dedup: offset kayarsa aynı kayıt ikinci kez eklenmesin.
                setNotifications(prev => {
                    const seen = new Set(prev.map(n => n.id));
                    return [...prev, ...(items as BusinessNotification[]).filter(n => !seen.has(n.id))];
                });
            }
            setHasMore(more);
        } catch (error) {
            console.error('Failed to fetch business notifications:', error);
        } finally {
            if (gen === fetchGenRef.current) {
                isFetchingRef.current = false;
                setLoadingMore(false);
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void fetchNotifications(true);
    }, [fetchNotifications]);

    const loadMore = useCallback(() => {
        if (!hasMore || isFetchingRef.current) return;
        void fetchNotifications(false);
    }, [hasMore, fetchNotifications]);

    // Sonsuz kaydırma: alttan ~600px kala sonraki sayfayı çek (PitchBooking eşiği).
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 600) loadMore();
    }, [loadMore]);

    const handleNotificationClick = (notif: BusinessNotification) => {
        // Rezervasyon isteğinde zengin detay modalı; diğer tiplerde mevcut davranış.
        if (notif.type === 'RESERVATION_REQUEST') {
            setSelectedRR(notif);
            return;
        }
        if (notif.type === 'SUPPORT_REPLY') {
            navigate('/business/settings/support');
            return;
        }
        if (notif.metadata?.date) {
            navigate('/business/dashboard', { state: { selectedDate: notif.metadata.date } });
        }
    };

    // Zengin rezervasyon-isteği kartı — yalnız metadata.team varsa. Yoksa null döner
    // ve varsayılan (title/message) kart render edilir (graceful fallback).
    // Bilgi önceliği: 1) SAHA, 2) tarih + saat, 3) maç tipi + takım(lar).
    const renderReservationCard = (notif: BusinessNotification) => {
        const m = notif.metadata;
        if (!m?.team) return null;
        const team = m.team;
        const opponent = m.opponentTeam ?? null;
        const badge = matchTypeLabel(m.matchType);
        const isKendiAramizda = m.matchType === 'kendi_aramizda';
        const lvl = levelLabel(team.level);
        const timeRange = m.startTime
            ? `${m.startTime}${m.endTime ? `–${m.endTime}` : ''}`
            : m.time || '';
        const dateLine = [m.dayName, m.date].filter(Boolean).join(', ');

        const teamLogo = (t: { logo?: string | null; name?: string }) => (
            <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                <img
                    src={t.logo || teamInitialsAvatar(t.name)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { const el = e.currentTarget; el.onerror = null; el.src = teamInitialsAvatar(t.name); }}
                />
            </div>
        );

        return (
            <div className="flex-1 min-w-0">
                {/* Satır 1: SAHA (en önemli bilgi) + tarih pill */}
                <div className="flex justify-between items-start gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-orange-500" />
                        <span className="font-black text-white truncate" style={{ fontSize: 'clamp(0.85rem, 3.8vw, 1rem)' }}>
                            {m.pitchName || 'Saha'}
                        </span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap shrink-0">
                        {new Date(notif.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </span>
                </div>

                {/* Satır 2: gün + tarih + saat aralığı */}
                {(dateLine || timeRange) && (
                    <div className="flex items-center gap-1.5 mb-1.5 text-slate-300" style={{ fontSize: 'clamp(0.75rem, 3.2vw, 0.85rem)' }}>
                        <Clock className="w-3 h-3 shrink-0 text-slate-500" />
                        <span className="truncate capitalize font-semibold">
                            {dateLine}
                            {dateLine && timeRange ? ' • ' : ''}
                            {timeRange}
                        </span>
                    </div>
                )}

                {/* Satır 3: maç tipi rozeti + takım(lar) */}
                <div className="flex items-center gap-2 min-w-0">
                    {badge && (
                        <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide shrink-0 ${
                                isKendiAramizda
                                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                                    : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                            }`}
                        >
                            <Users className="w-2.5 h-2.5" />
                            {badge}
                        </span>
                    )}
                    {opponent ? (
                        /* Rakipli maç: iki takım kompakt — logo Ad vs logo Ad */
                        <span className="flex items-center gap-1.5 min-w-0" style={{ fontSize: 'clamp(0.72rem, 3vw, 0.82rem)' }}>
                            {teamLogo(team)}
                            <span className="font-bold text-slate-200 truncate max-w-[80px]">{team.name}</span>
                            <span className="text-[9px] font-black text-slate-500 italic shrink-0">VS</span>
                            {teamLogo(opponent)}
                            <span className="font-bold text-slate-200 truncate max-w-[80px]">{opponent.name}</span>
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 min-w-0" style={{ fontSize: 'clamp(0.72rem, 3vw, 0.82rem)' }}>
                            {teamLogo(team)}
                            <span className="font-bold text-slate-200 truncate">{team.name || 'Bilinmeyen Takım'}</span>
                            {lvl && (
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-700/60 border border-slate-600/50 text-[10px] font-bold text-slate-300 shrink-0">
                                    {lvl}
                                </span>
                            )}
                            {team.fairPlay != null && (
                                <span className="inline-flex items-center gap-0.5 shrink-0">
                                    <Star className="w-3 h-3 text-green-500 fill-green-500/30" />
                                    <span className="text-[10px] font-bold text-slate-300">{Number(team.fairPlay).toFixed(1)}</span>
                                </span>
                            )}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {/* Header */}
            <div className="bg-slate-900/95 backdrop-blur-md z-20 border-b border-slate-800 px-4 py-4 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="font-sport font-bold text-xl text-white">Bildirimler</h1>
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-black">İşletme Hareketleri</p>
                </div>
            </div>

            {/* Content */}
            <div
                className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                onScroll={handleScroll}
            >
            <div className="p-4 space-y-3 pb-business-nav" style={{ minHeight: 'calc(100% + 1px)' }}>
                {loading ? (
                    <div className="py-40 flex justify-center w-full">
                        <BusinessLoadingSpinner />
                    </div>
                ) : notifications.length > 0 ? (
                    notifications.map((notif) => {
                        const richCard = notif.type === 'RESERVATION_REQUEST' ? renderReservationCard(notif) : null;
                        return (
                            <button
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className="w-full rounded-2xl border bg-slate-800/40 border-slate-700/50 text-left transition-all relative group flex gap-3 hover:border-orange-500/40 active:scale-[0.98]"
                                style={{ padding: 'clamp(0.75rem, 3vw, 1.25rem)' }}
                            >
                                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shrink-0 shadow-inner">
                                    {notif.type === 'RESERVATION_REQUEST' ? <Calendar className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                                </div>

                                {richCard ?? (
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-black text-white leading-tight" style={{ fontSize: 'clamp(0.8rem, 3.5vw, 1rem)' }}>
                                                {stripNotificationEmoji(notif.title)}
                                            </h4>
                                            <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap ml-2 shrink-0">
                                                {new Date(notif.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                        <p className="text-slate-400 leading-relaxed line-clamp-2" style={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>
                                            {stripNotificationEmoji(notif.message)}
                                        </p>
                                    </div>
                                )}

                                <ChevronRight className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 transition-all group-hover:text-orange-500 group-hover:translate-x-1" />
                            </button>
                        );
                    })
                ) : (
                    <div className="py-40 flex flex-col items-center justify-center text-center px-10">
                        <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-slate-700">
                            <Bell className="w-12 h-12 text-slate-700" />
                        </div>
                        <h4 className="text-xl font-bold text-slate-400">Henüz bildirim yok</h4>
                        <p className="text-sm text-slate-600 mt-2">Maç istekleri ve önemli güncellemeler burada görünecek.</p>
                    </div>
                )}
                {loadingMore && (
                    <div className="py-6 flex justify-center">
                        <BusinessLoadingSpinner />
                    </div>
                )}
            </div>
            </div>

            <ReservationRequestDetailModal
                notification={selectedRR}
                onClose={() => setSelectedRR(null)}
            />

            <BusinessNavbar />
        </div>
    );
};
