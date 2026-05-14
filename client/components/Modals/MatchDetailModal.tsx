import React from 'react';
import { X, Shield, Users, MapPin, Clock, Calendar, Phone, Star, Swords } from 'lucide-react';
import { useModalBodyClass } from '../../utils/useModalBodyClass';

interface TeamData {
    id: string;
    name: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    level?: string;
    fairPlayScore: number;
    wins: number;
    losses: number;
    playerCount: number;
    captain?: {
        id: string;
        name: string;
        phone?: string;
    };
}

interface MatchDetailData {
    homeTeam: TeamData | null;
    awayTeam: TeamData | null;
    match: {
        id: string;
        date: string;
        time: string;
        status: string;
        playerCount: number;
        description?: string;
    };
    reservation?: {
        id: string;
        status: string;
        slotTime: string;
    } | null;
    pitch?: {
        id: string;
        name: string;
        type?: string;
        pricePerHour?: number;
        business?: {
            id: string;
            name: string;
            phone?: string;
            address?: string;
        };
    } | null;
}

interface MatchDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: MatchDetailData | null;
    loading?: boolean;
}

const LEVEL_LABELS: Record<string, string> = {
    'BEGINNER': 'Başlangıç',
    'INTERMEDIATE': 'Orta',
    'ADVANCED': 'İyi',
    'PRO': 'Pro',
    'Başlangıç': 'Başlangıç',
    'Orta': 'Orta',
    'İyi': 'İyi',
    'Pro': 'Pro',
};

// Time-aware status — mirrors the channel list logic from Chat.tsx
const getMatchStatusConfig = (reservation?: { status: string; slotTime: string } | null) => {
    if (!reservation) {
        return { label: 'Beklemede', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', gradient: 'from-slate-500 to-slate-600', type: 'pending' as const };
    }

    const now = new Date();
    const slotDate = new Date(reservation.slotTime);
    const matchEndTime = new Date(slotDate.getTime() + 60 * 60 * 1000);

    if (now > slotDate && reservation.status !== 'APPROVED') {
        return { label: 'Oynanmamış Maç', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', gradient: 'from-red-500 to-rose-500', type: 'unplayed' as const };
    }
    if (reservation.status === 'PENDING') {
        return { label: 'Onay Bekliyor', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', gradient: 'from-orange-500 to-amber-500', type: 'pending' as const };
    }
    if (reservation.status === 'APPROVED' && now <= matchEndTime) {
        return { label: 'Kesinleşti', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', gradient: 'from-green-500 to-emerald-400', type: 'confirmed' as const };
    }
    if (reservation.status === 'APPROVED' && now > matchEndTime) {
        return { label: 'Oynanmış Maç', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', gradient: 'from-blue-500 to-indigo-400', type: 'played' as const };
    }
    if (reservation.status === 'REJECTED') {
        return { label: 'Reddedildi', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', gradient: 'from-red-500 to-rose-500', type: 'unplayed' as const };
    }
    return { label: 'Beklemede', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', gradient: 'from-slate-500 to-slate-600', type: 'pending' as const };
};

// Custom SVG status icon
const StatusIcon: React.FC<{ type: string; gradient: string }> = ({ type, gradient }) => {
    const size = 20;
    // Derive solid colors from gradient class for SVG fill
    const colorMap: Record<string, string> = {
        'from-green-500 to-emerald-400': '#22c55e',
        'from-orange-500 to-amber-500': '#f97316',
        'from-blue-500 to-indigo-400': '#3b82f6',
        'from-red-500 to-rose-500': '#ef4444',
        'from-slate-500 to-slate-600': '#64748b',
    };
    const fill = colorMap[gradient] || '#64748b';

    if (type === 'confirmed') {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" fill={fill} />
                <path d="M7.5 12.5l3 3 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    if (type === 'pending') {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" fill={fill} />
                <circle cx="12" cy="12" r="7.5" fill="none" stroke="white" strokeWidth="1.5" />
                <path d="M12 8v4.5l2.5 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    if (type === 'played') {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" fill={fill} />
                <circle cx="12" cy="12" r="4" fill="white" />
                <path d="M12 4v3M12 17v3M4 12h3M17 12h3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        );
    }
    // unplayed
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill={fill} />
            <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    );
};

const formatMatchDate = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        return {
            full: `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`,
            day: days[date.getDay()],
        };
    } catch {
        return { full: dateStr, day: '' };
    }
};

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ isOpen, onClose, data, loading }) => {
    useModalBodyClass(isOpen);
    if (!isOpen) return null;

    const statusConfig = getMatchStatusConfig(data?.reservation);
    const dateInfo = data?.match?.date ? formatMatchDate(data.match.date) : null;

    return (
        <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-gradient-to-b from-slate-800 to-slate-900 w-full max-w-lg rounded-t-3xl border-t border-slate-700 relative overflow-hidden animate-slide-up max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Decorative top gradient line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-turf-500 via-green-400 to-turf-600" />

                {/* Close Handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-slate-600" />
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-10 h-10 border-3 border-turf-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-slate-400 text-sm">Maç bilgileri yükleniyor...</span>
                    </div>
                ) : !data || data.homeTeam === null ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <span className="text-4xl">⚽</span>
                        <span className="text-slate-400 text-sm">Maç bilgisi bulunamadı.</span>
                    </div>
                ) : (
                    <div className="px-5 pb-8">

                        {/* ── TEAM VS TEAM HEADER ── */}
                        <div className="flex items-center justify-center gap-4 py-5">
                            {/* Home Team */}
                            <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                                <div
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg border-2 border-slate-600/50 overflow-hidden"
                                    style={{
                                        background: data.homeTeam.primaryColor
                                            ? `linear-gradient(135deg, ${data.homeTeam.primaryColor}, ${data.homeTeam.secondaryColor || data.homeTeam.primaryColor})`
                                            : 'linear-gradient(135deg, #1e40af, #3b82f6)',
                                    }}
                                >
                                    {data.homeTeam.logoUrl ? (
                                        <img src={data.homeTeam.logoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        data.homeTeam.name.charAt(0)
                                    )}
                                </div>
                                <span className="text-white font-bold text-sm text-center leading-tight truncate w-full">
                                    {data.homeTeam.name}
                                </span>
                                {data.homeTeam.level && (
                                    <span className="text-[10px] font-semibold text-turf-400 bg-turf-500/10 px-2 py-0.5 rounded-full">
                                        {LEVEL_LABELS[data.homeTeam.level] || data.homeTeam.level}
                                    </span>
                                )}
                            </div>

                            {/* VS Badge */}
                            <div className="flex flex-col items-center gap-1 shrink-0">
                                <div className="w-12 h-12 rounded-full bg-slate-700/80 border border-slate-600 flex items-center justify-center shadow-xl">
                                    <Swords className="w-5 h-5 text-turf-400" />
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">VS</span>
                            </div>

                            {/* Away Team */}
                            <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                                {data.awayTeam ? (
                                    <>
                                        <div
                                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg border-2 border-slate-600/50 overflow-hidden"
                                            style={{
                                                background: data.awayTeam.primaryColor
                                                    ? `linear-gradient(135deg, ${data.awayTeam.primaryColor}, ${data.awayTeam.secondaryColor || data.awayTeam.primaryColor})`
                                                    : 'linear-gradient(135deg, #dc2626, #f87171)',
                                            }}
                                        >
                                            {data.awayTeam.logoUrl ? (
                                                <img src={data.awayTeam.logoUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                data.awayTeam.name.charAt(0)
                                            )}
                                        </div>
                                        <span className="text-white font-bold text-sm text-center leading-tight truncate w-full">
                                            {data.awayTeam.name}
                                        </span>
                                        {data.awayTeam.level && (
                                            <span className="text-[10px] font-semibold text-turf-400 bg-turf-500/10 px-2 py-0.5 rounded-full">
                                                {LEVEL_LABELS[data.awayTeam.level] || data.awayTeam.level}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 rounded-2xl bg-slate-700 border-2 border-dashed border-slate-600 flex items-center justify-center">
                                            <span className="text-2xl">❓</span>
                                        </div>
                                        <span className="text-slate-500 font-bold text-sm">Rakip Bekleniyor</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* ── MATCH STATUS BADGE ── */}
                        <div className="flex justify-center mb-5">
                            <div className={`${statusConfig.bg} ${statusConfig.border} border px-4 py-2 rounded-full flex items-center gap-2.5`}>
                                <StatusIcon type={statusConfig.type} gradient={statusConfig.gradient} />
                                <span className={`text-sm font-bold ${statusConfig.color}`}>{statusConfig.label}</span>
                            </div>
                        </div>

                        {/* ── TEAM COMPARISON STATS ── */}
                        {data.homeTeam && data.awayTeam && (
                            <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-4 mb-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-3">Takım Karşılaştırması</h4>

                                {/* Oynanmış Maç */}
                                <div className="flex items-center justify-between py-2 border-b border-slate-700/30">
                                    <span className="text-sm font-bold text-white w-16 text-left">{data.homeTeam.playedMatchCount ?? 0}</span>
                                    <span className="text-[11px] text-slate-400 flex items-center gap-1"><Shield className="w-3 h-3" /> Oynanmış Maç</span>
                                    <span className="text-sm font-bold text-white w-16 text-right">{data.awayTeam.playedMatchCount ?? 0}</span>
                                </div>

                                {/* Fair Play */}
                                <div className="flex items-center justify-between py-2 border-b border-slate-700/30">
                                    <div className="flex items-center gap-1 w-16">
                                        <span className="text-sm font-bold text-green-500">{data.homeTeam.fairPlayScore.toFixed(1)}</span>
                                        {(data.homeTeam.fairPlayRatingCount ?? 0) > 0 && (
                                            <span className="text-[10px] text-slate-500">({data.homeTeam.fairPlayRatingCount})</span>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-slate-400 flex items-center gap-1"><Star className="w-3 h-3 text-green-500 fill-green-500" /> Fair Play</span>
                                    <div className="flex items-center justify-end gap-1 w-16">
                                        {(data.awayTeam.fairPlayRatingCount ?? 0) > 0 && (
                                            <span className="text-[10px] text-slate-500">({data.awayTeam.fairPlayRatingCount})</span>
                                        )}
                                        <span className="text-sm font-bold text-green-500">{data.awayTeam.fairPlayScore.toFixed(1)}</span>
                                    </div>
                                </div>

                                {/* Player Count */}
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-sm font-bold text-white w-16 text-left">{data.homeTeam.playerCount}</span>
                                    <span className="text-[11px] text-slate-400 flex items-center gap-1"><Users className="w-3 h-3" /> Kadro</span>
                                    <span className="text-sm font-bold text-white w-16 text-right">{data.awayTeam.playerCount}</span>
                                </div>
                            </div>
                        )}

                        {/* ── CAPTAINS ── */}
                        {(data.homeTeam?.captain || data.awayTeam?.captain) && (
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {[data.homeTeam, data.awayTeam].map((team, idx) => (
                                    <div key={idx} className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-3">
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                            {idx === 0 ? 'Ev Sahibi' : 'Deplasman'} Kaptan
                                        </div>
                                        {team?.captain ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
                                                    <span className="font-black text-[10px] text-yellow-900">C</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-bold text-white truncate">{team.captain.name}</div>
                                                    {team.captain.phone && (
                                                        <a href={`tel:${team.captain.phone}`} className="text-[10px] text-turf-400 flex items-center gap-0.5">
                                                            <Phone className="w-2.5 h-2.5" /> {team.captain.phone}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-500">Bilgi yok</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── MATCH INFO ── */}
                        <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-4 mb-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-3">Maç Bilgileri</h4>

                            <div className="space-y-3">
                                {/* Date */}
                                {dateInfo && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                            <Calendar className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">{dateInfo.full}</div>
                                            <div className="text-[10px] text-slate-400">{dateInfo.day}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Time */}
                                {data.match.time && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                            <Clock className="w-4 h-4 text-purple-400" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">{data.match.time}</div>
                                            <div className="text-[10px] text-slate-400">Başlangıç saati</div>
                                        </div>
                                    </div>
                                )}

                                {/* Player Count */}
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-turf-500/10 flex items-center justify-center">
                                        <Users className="w-4 h-4 text-turf-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white">{data.match.playerCount}v{data.match.playerCount}</div>
                                        <div className="text-[10px] text-slate-400">Oyuncu formatı</div>
                                    </div>
                                </div>

                                {/* Pitch */}
                                {data.pitch && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                            <MapPin className="w-4 h-4 text-orange-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white truncate">{data.pitch.name}</div>
                                            <div className="text-[10px] text-slate-400 truncate">
                                                {data.pitch.business?.name}{data.pitch.type ? ` • ${data.pitch.type === 'INDOOR' ? 'Kapalı' : 'Açık'}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Price */}
                                {data.pitch?.pricePerHour && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                                            <span className="text-yellow-400 text-sm font-bold">₺</span>
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">{data.pitch.pricePerHour} ₺/saat</div>
                                            <div className="text-[10px] text-slate-400">Takım başına ~{Math.round(data.pitch.pricePerHour / 2)} ₺</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── CALL BUSINESS BUTTON ── */}
                        {data.pitch?.business?.ownerPhone && (
                            <a
                                href={`tel:${data.pitch.business.ownerPhone}`}
                                className="w-full bg-gradient-to-r from-turf-600 to-green-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-turf-600/20 active:scale-95 transition-transform"
                            >
                                <Phone className="w-5 h-5" />
                                <span>Sahayı Ara</span>
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
