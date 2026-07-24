import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Shield, Users, MapPin, Clock, Calendar, Phone, Star, Swords, Navigation, Repeat } from 'lucide-react';
import { useModalBodyClass } from '../../../../utils/useModalBodyClass';
import { useLocationContext } from '../../../../contexts/LocationContext';
import { calculateDistance } from '../../../../utils/location';
import { DirectionsConfirmModal } from '../../PitchBooking/components/DirectionsConfirmModal';
import { CaptainAvatar } from './CaptainAvatar';
import { teamInitialsAvatar } from '../../../../utils/teamColors';
import { pitchTypeShortLabel } from '../../../../utils/pitchType';

// Abone (sabit rezervasyon) sohbetinin detay modalı — MatchDetailModal'ın
// abonelik ikizi. Sunucu takım bloklarını maç detayıyla AYNI şekilde döndürdüğü
// için karşılaştırma/kaptan bölümleri birebir aynı okunur. Maç yerine haftalık
// kural gösterilir; "kendi aramızda" ve "rakipli" abonelik ayrımı belirtilir.

interface SubTeamData {
    id: string;
    name: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    level?: string;
    fairPlayScore: number;
    fairPlayRatingCount?: number;
    playedMatchCount?: number;
    playerCount: number;
    captain?: {
        id: string;
        name: string;
        phone?: string;
        avatarUrl?: string | null;
    } | null;
}

export interface SubscriptionDetailData {
    mode?: 'single' | 'rival';
    homeTeam?: SubTeamData | null;
    awayTeam?: SubTeamData | null;
    subscription?: {
        closureId: string;
        dayOfWeek: string;
        startTime: string;
        endTime: string;
        nextOccurrence: string | null;
    };
    pitch?: {
        id: string;
        name: string;
        type?: string | null;
        pricePerHour?: number | null;
        business: {
            id: string;
            name: string;
            phone?: string | null;
            ownerPhone?: string | null;
            address?: string | null;
            district?: string | null;
            latitude?: number | null;
            longitude?: number | null;
            isDeleted?: boolean;
        };
    };
}

// avatarData.subscription — sunucu detayına ulaşılamazsa kullanılan yedek.
export interface SubscriptionFallback {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    pitchName: string;
    businessName: string;
    homeTeamId: string | null;
    awayTeamId: string | null;
}

interface SubscriptionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: SubscriptionDetailData | null;
    fallback?: SubscriptionFallback | null;
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

const DAY_LABELS: Record<string, string> = {
    Monday: 'Pazartesi', Tuesday: 'Salı', Wednesday: 'Çarşamba', Thursday: 'Perşembe',
    Friday: 'Cuma', Saturday: 'Cumartesi', Sunday: 'Pazar',
};

const formatOccurrence = (iso: string): string => {
    try {
        const date = new Date(iso);
        const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch {
        return '';
    }
};

// Takım rozeti (logo + isim + seviye) — MatchDetailModal başlığının aynısı.
const TeamBadge: React.FC<{ team: SubTeamData; fallbackGradient: string }> = ({ team, fallbackGradient }) => (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
        <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg border-2 border-slate-600/50 overflow-hidden"
            style={{
                background: team.primaryColor
                    ? `linear-gradient(135deg, ${team.primaryColor}, ${team.secondaryColor || team.primaryColor})`
                    : fallbackGradient,
            }}
        >
            {team.logoUrl ? (
                <img src={team.logoUrl} alt="" className="w-full h-full object-cover" onError={(e) => { const el = e.currentTarget; el.onerror = null; el.src = teamInitialsAvatar(team.name); }} />
            ) : (
                team.name.charAt(0)
            )}
        </div>
        <span className="text-white font-bold text-sm text-center leading-tight truncate w-full">{team.name}</span>
        {team.level && (
            <span className="text-[10px] font-semibold text-turf-400 bg-turf-500/10 px-2 py-0.5 rounded-full">
                {LEVEL_LABELS[team.level] || team.level}
            </span>
        )}
    </div>
);

const CaptainCard: React.FC<{ team?: SubTeamData | null; title: string }> = ({ team, title }) => (
    <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-3">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{title}</div>
        {team?.captain ? (
            <div className="flex items-center gap-2">
                <CaptainAvatar avatarUrl={team.captain.avatarUrl} name={team.captain.name} />
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
);

export const SubscriptionDetailModal: React.FC<SubscriptionDetailModalProps> = ({
    isOpen, onClose, data, fallback, loading,
}) => {
    useModalBodyClass(isOpen);
    const { coords } = useLocationContext(); // hook — erken return'den ÖNCE
    const [showDirections, setShowDirections] = useState(false);
    if (!isOpen) return null;

    // Sunucu detayı yoksa (eski sunucu / ağ hatası) kanal avatarData'sından yedek.
    const sub = data?.subscription ?? (fallback
        ? { closureId: '', dayOfWeek: fallback.dayOfWeek, startTime: fallback.startTime, endTime: fallback.endTime, nextOccurrence: null }
        : null);
    const isRival = data ? data.mode === 'rival' : !!fallback?.awayTeamId;
    const business = data?.pitch?.business;
    const pitchName = data?.pitch?.name ?? fallback?.pitchName ?? '';
    const businessName = business?.name ?? fallback?.businessName ?? '';
    const distanceKm = coords && business?.latitude != null && business?.longitude != null
        ? calculateDistance(coords.lat, coords.lng, business.latitude, business.longitude)
        : null;
    const businessPhone = business?.phone || business?.ownerPhone;
    const dayLabel = sub ? (DAY_LABELS[sub.dayOfWeek] || sub.dayOfWeek) : '';

    return createPortal(
        <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-gradient-to-b from-slate-800 to-slate-900 w-full max-w-lg rounded-t-3xl border-t border-slate-700 relative overflow-x-hidden animate-slide-up max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Abone kimliği: yeşil şerit (chat'teki ABONE pilinin rengi) */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600" />

                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-slate-600" />
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-slate-400 text-sm">Abonelik bilgileri yükleniyor...</span>
                    </div>
                ) : !sub ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <span className="text-4xl">⚽</span>
                        <span className="text-slate-400 text-sm">Abonelik bilgisi bulunamadı.</span>
                    </div>
                ) : (
                    <div className="px-5 pb-8">

                        {/* ── TAKIM(LAR) ── */}
                        {data?.homeTeam && (
                            isRival && data.awayTeam ? (
                                <div className="flex items-center justify-center gap-4 py-5">
                                    <TeamBadge team={data.homeTeam} fallbackGradient="linear-gradient(135deg, #1e40af, #3b82f6)" />
                                    <div className="flex flex-col items-center gap-1 shrink-0">
                                        <div className="w-12 h-12 rounded-full bg-slate-700/80 border border-slate-600 flex items-center justify-center shadow-xl">
                                            <Swords className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">VS</span>
                                    </div>
                                    <TeamBadge team={data.awayTeam} fallbackGradient="linear-gradient(135deg, #dc2626, #f87171)" />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 py-5">
                                    <TeamBadge team={data.homeTeam} fallbackGradient="linear-gradient(135deg, #1e40af, #3b82f6)" />
                                </div>
                            )
                        )}

                        {/* ── ABONELİK TÜRÜ + DURUM ── */}
                        <div className="flex flex-col items-center gap-2 mb-5">
                            <div className="bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-full flex items-center gap-2">
                                <Repeat className="w-4 h-4 text-emerald-400" />
                                <span className="text-sm font-bold text-emerald-400">Aktif Abonelik</span>
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${isRival
                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                                : 'text-orange-400 bg-orange-500/10 border-orange-500/30'}`}>
                                {isRival ? 'Rakipli Abonelik' : 'Kendi Aramızda (Tek Takım)'}
                            </span>
                        </div>

                        {/* ── TAKIM KARŞILAŞTIRMASI (yalnız rakipli) ── */}
                        {isRival && data?.homeTeam && data?.awayTeam && (
                            <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-4 mb-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-3">Takım Karşılaştırması</h4>

                                <div className="flex items-center justify-between py-2 border-b border-slate-700/30">
                                    <span className="text-sm font-bold text-white w-16 text-left">{data.homeTeam.playedMatchCount ?? 0}</span>
                                    <span className="text-[11px] text-slate-400 flex items-center gap-1"><Shield className="w-3 h-3" /> Oynanmış Maç</span>
                                    <span className="text-sm font-bold text-white w-16 text-right">{data.awayTeam.playedMatchCount ?? 0}</span>
                                </div>

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

                                <div className="flex items-center justify-between py-2">
                                    <span className="text-sm font-bold text-white w-16 text-left">{data.homeTeam.playerCount}</span>
                                    <span className="text-[11px] text-slate-400 flex items-center gap-1"><Users className="w-3 h-3" /> Kadro</span>
                                    <span className="text-sm font-bold text-white w-16 text-right">{data.awayTeam.playerCount}</span>
                                </div>
                            </div>
                        )}

                        {/* ── TEK TAKIM İSTATİSTİĞİ ── */}
                        {!isRival && data?.homeTeam && (
                            <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-4 mb-4 grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <div className="text-sm font-bold text-white">{data.homeTeam.playedMatchCount ?? 0}</div>
                                    <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5"><Shield className="w-3 h-3" /> Maç</div>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-green-500">{data.homeTeam.fairPlayScore.toFixed(1)}</div>
                                    <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5"><Star className="w-3 h-3 text-green-500 fill-green-500" /> Fair Play</div>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">{data.homeTeam.playerCount}</div>
                                    <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5"><Users className="w-3 h-3" /> Kadro</div>
                                </div>
                            </div>
                        )}

                        {/* ── KAPTANLAR ── */}
                        {(data?.homeTeam?.captain || data?.awayTeam?.captain) && (
                            <div className={`grid gap-3 mb-4 ${isRival ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                <CaptainCard team={data?.homeTeam} title={isRival ? 'Ev Sahibi Kaptan' : 'Takım Kaptanı'} />
                                {isRival && <CaptainCard team={data?.awayTeam} title="Deplasman Kaptan" />}
                            </div>
                        )}

                        {/* ── ABONELİK BİLGİLERİ ── */}
                        <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-4 mb-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-3">Abonelik Bilgileri</h4>

                            <div className="space-y-3">
                                {/* Haftalık gün + saat */}
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                        <Repeat className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white">Her {dayLabel}</div>
                                        <div className="text-[10px] text-slate-400">Haftalık sabit rezervasyon</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                                        <Clock className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white">{sub.startTime} - {sub.endTime}</div>
                                        <div className="text-[10px] text-slate-400">Maç saati</div>
                                    </div>
                                </div>

                                {/* Sıradaki maç */}
                                {sub.nextOccurrence && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                            <Calendar className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">{formatOccurrence(sub.nextOccurrence)}</div>
                                            <div className="text-[10px] text-slate-400">Sıradaki maç</div>
                                        </div>
                                    </div>
                                )}

                                {/* Saha */}
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                                        <MapPin className="w-4 h-4 text-orange-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-white truncate">{pitchName}</div>
                                        <div className="text-[10px] text-slate-400 truncate">
                                            {businessName}{data?.pitch?.type ? ` • ${pitchTypeShortLabel(data.pitch.type)}` : ''}
                                        </div>
                                    </div>
                                    {distanceKm != null && (
                                        <span className="text-[11px] font-bold text-turf-400 bg-turf-900/30 px-2 py-1 rounded-full flex-shrink-0 flex items-center gap-1">
                                            <Navigation className="w-2.5 h-2.5" /> {distanceKm} km
                                        </span>
                                    )}
                                </div>

                                {/* Konum (ilçe + adres) */}
                                {(business?.district || business?.address) && (
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                                            <Navigation className="w-4 h-4 text-sky-400" />
                                        </div>
                                        <div className="min-w-0">
                                            {business?.district && <div className="text-sm font-bold text-white">{business.district}</div>}
                                            {business?.address && <p className="text-[10px] text-slate-400 line-clamp-2">{business.address}</p>}
                                        </div>
                                    </div>
                                )}

                                {/* Ücret */}
                                {data?.pitch?.pricePerHour ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                                            <span className="text-yellow-400 text-sm font-bold">₺</span>
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">{data.pitch.pricePerHour} ₺/saat</div>
                                            {isRival && (
                                                <div className="text-[10px] text-slate-400">Takım başına ~{Math.round(data.pitch.pricePerHour / 2)} ₺</div>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <p className="text-slate-500 text-[11px] leading-relaxed mb-4 text-center">
                            Bu sohbet, işletme tarafından takımınıza atanan sabit rezervasyon aboneliğine bağlıdır ve
                            işletme aboneliği sonlandırana kadar açık kalır.
                        </p>

                        {/* ── SAHAYI ARA + YOL TARİFİ ── */}
                        {(businessPhone || (business?.latitude != null && business?.longitude != null)) && (
                            <div className="flex gap-3">
                                {businessPhone && (
                                    <a
                                        href={`tel:${businessPhone}`}
                                        className="flex-1 bg-gradient-to-r from-turf-600 to-green-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-turf-600/20 active:scale-95 transition-transform"
                                    >
                                        <Phone className="w-5 h-5" />
                                        <span>Sahayı Ara</span>
                                    </a>
                                )}
                                {business?.latitude != null && business?.longitude != null && (
                                    <button
                                        onClick={() => setShowDirections(true)}
                                        className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                    >
                                        <Navigation className="w-5 h-5 text-turf-400" />
                                        <span>Yol Tarifi</span>
                                    </button>
                                )}
                            </div>
                        )}
                        <DirectionsConfirmModal
                            isOpen={showDirections}
                            onClose={() => setShowDirections(false)}
                            businessName={business?.name}
                            latitude={business?.latitude}
                            longitude={business?.longitude}
                        />
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
