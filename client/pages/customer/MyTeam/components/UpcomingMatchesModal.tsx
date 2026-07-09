import React from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, MapPin, Users, CheckCircle, Navigation, Swords } from 'lucide-react';
import { useModalBodyClass } from '../../../../utils/useModalBodyClass';
import { useLocationContext } from '../../../../contexts/LocationContext';
import { calculateDistance } from '../../../../utils/location';
import { teamInitialsAvatar } from '../../../../utils/teamColors';
import { addOneHour } from '../../../../utils/time';

interface UpcomingMatch {
    id: string;
    slotTime: string;
    status: string;
    /** Sunucunun eşleşen slottan hesapladığı bitiş saati ("HH:mm"); eski sunucuda yok */
    endTime?: string | null;
    pitch?: {
        name?: string;
        timeSlots?: { startTime: string; endTime: string }[];
        business?: {
            name?: string;
            latitude?: number;
            longitude?: number;
            address?: string;
            district?: string;
        };
    };
    team?: {
        id: string;
        name: string;
        logoUrl?: string;
        primaryColor?: string;
        secondaryColor?: string;
        level?: string;
    };
    opponentTeam?: {
        id: string;
        name: string;
        logoUrl?: string;
        primaryColor?: string;
        secondaryColor?: string;
        level?: string;
    };
}

interface UpcomingMatchesModalProps {
    isOpen: boolean;
    onClose: () => void;
    matches: UpcomingMatch[];
    currentTeamId?: string;
    isLoading?: boolean;
}

export const UpcomingMatchesModal: React.FC<UpcomingMatchesModalProps> = ({
    isOpen,
    onClose,
    matches,
    currentTeamId,
    isLoading = false,
}) => {
    useModalBodyClass(isOpen);
    const { coords } = useLocationContext();

    if (!isOpen) return null;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    return createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            {/* Modal Container */}
            <div 
                className="bg-slate-800 w-full max-w-lg max-h-[85vh] rounded-3xl border border-slate-700/50 overflow-hidden relative shadow-2xl flex flex-col animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-700/50 relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-turf-600/20 to-slate-900" />
                    
                    {/* z-20: başlık satırı da z-10 — buton altta kalırsa dokunuşları başlık yutar */}
                    <button
                        onClick={onClose}
                        aria-label="Kapat"
                        className="absolute top-3 right-3 bg-slate-900/50 p-3 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 active:bg-slate-700 transition-colors z-20 backdrop-blur-sm shadow-sm"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-3 relative z-10">
                        <div className="bg-turf-500/20 p-3 rounded-2xl border border-turf-500/20 shadow-lg shadow-turf-500/10">
                            <Calendar className="w-6 h-6 text-turf-400" />
                        </div>
                        <div className="pr-10">
                            <h3 className="text-[clamp(16px,5vw,22px)] font-sport font-black text-white uppercase italic tracking-wide">
                                Yaklaşan Maçlar
                            </h3>
                            <p className="text-[clamp(11px,3vw,13px)] text-slate-400">İşletme tarafından kesinleştirilmiş maçlar</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-10 h-10 border-3 border-turf-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-400 text-sm font-bold animate-pulse">Yükleniyor...</p>
                        </div>
                    ) : matches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                            <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-slate-700/50 shadow-inner">
                                <Calendar className="w-12 h-12 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-white font-black text-lg mb-1">Yaklaşan maç yok</p>
                                <p className="text-slate-400 text-sm max-w-[260px] mx-auto">
                                    İşletme tarafından onaylanmış gelecek bir maçınız bulunmuyor.
                                </p>
                            </div>
                        </div>
                    ) : (
                        matches.map((match) => {
                            // Bitiş saati: sunucu endTime → (eski sunucu) timeSlots lookup → +1sa
                            const slotStartTime = formatTime(match.slotTime);
                            const endTime = match.endTime
                                ?? match.pitch?.timeSlots?.find(ts => ts.startTime === slotStartTime)?.endTime
                                ?? addOneHour(slotStartTime);

                            const businessName = match.pitch?.business?.name || 'İşletme';
                            const pitchName = match.pitch?.name || 'Saha';
                            
                            // Distance calculation
                            const businessLat = match.pitch?.business?.latitude;
                            const businessLng = match.pitch?.business?.longitude;
                            const distanceKm = coords && businessLat != null && businessLng != null
                                ? calculateDistance(coords.lat, coords.lng, businessLat, businessLng)
                                : null;

                            // Determine Home and Away for display logic
                            const isHome = match.team?.id === currentTeamId;
                            const myTeam = isHome ? match.team : match.opponentTeam;
                            const otherTeam = isHome ? match.opponentTeam : match.team;

                            return (
                                <div
                                    key={match.id}
                                    className="bg-slate-900/40 rounded-3xl border border-turf-500/20 overflow-hidden hover:border-turf-500/40 transition-all duration-300 relative group"
                                >
                                    {/* Glassmorphism Background Highlight */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-turf-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    {/* Status bar */}
                                    <div className="bg-turf-500/10 px-4 py-2.5 flex items-center justify-between border-b border-turf-500/10 relative z-10">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-turf-400" />
                                            <span className="text-turf-400 text-[10px] font-black uppercase tracking-widest">
                                                Kesinleştirildi
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-4 sm:p-5 relative z-10">
                                        {/* Match Date & Time */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 bg-slate-900/50 p-3 rounded-2xl border border-slate-800">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-turf-900/30 p-2.5 rounded-xl border border-turf-500/20 shadow-inner">
                                                    <Calendar className="w-5 h-5 text-turf-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-white font-bold text-sm truncate">{formatDate(match.slotTime)}</div>
                                                    <div className="flex items-center gap-1.5 text-turf-400 text-xs font-black tracking-wide mt-0.5">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {slotStartTime}{endTime ? ` - ${endTime}` : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Teams Section */}
                                        {otherTeam ? (
                                            <div className="flex items-center justify-between gap-2 mb-5">
                                                {/* My Team */}
                                                <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                                                    <div
                                                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black text-white shadow-lg border border-slate-700 overflow-hidden relative"
                                                        style={{
                                                            background: myTeam?.primaryColor
                                                                ? `linear-gradient(135deg, ${myTeam.primaryColor}, ${myTeam.secondaryColor || myTeam.primaryColor})`
                                                                : 'linear-gradient(135deg, #1e40af, #3b82f6)',
                                                        }}
                                                    >
                                                        {myTeam?.logoUrl ? (
                                                            <img src={myTeam.logoUrl} alt="" className="w-full h-full object-cover" onError={(e) => { const el = e.currentTarget; el.onerror = null; el.src = teamInitialsAvatar(myTeam?.name); }} />
                                                        ) : (
                                                            myTeam?.name?.charAt(0) || 'S'
                                                        )}
                                                    </div>
                                                    <span className="text-white font-bold text-xs sm:text-sm text-center leading-tight truncate w-full">
                                                        {myTeam?.name || 'Takımınız'}
                                                    </span>
                                                </div>

                                                {/* VS Badge */}
                                                <div className="flex flex-col items-center shrink-0 px-1 sm:px-2">
                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-xl">
                                                        <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                                                    </div>
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">VS</span>
                                                </div>

                                                {/* Opponent Team */}
                                                <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                                                    <div
                                                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black text-white shadow-lg border border-slate-700 overflow-hidden relative"
                                                        style={{
                                                            background: otherTeam.primaryColor
                                                                ? `linear-gradient(135deg, ${otherTeam.primaryColor}, ${otherTeam.secondaryColor || otherTeam.primaryColor})`
                                                                : 'linear-gradient(135deg, #dc2626, #f87171)',
                                                        }}
                                                    >
                                                        {otherTeam.logoUrl ? (
                                                            <img src={otherTeam.logoUrl} alt="" className="w-full h-full object-cover" onError={(e) => { const el = e.currentTarget; el.onerror = null; el.src = teamInitialsAvatar(otherTeam?.name); }} />
                                                        ) : (
                                                            otherTeam.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <span className="text-white font-bold text-xs sm:text-sm text-center leading-tight truncate w-full">
                                                        {otherTeam.name}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center gap-3 mb-5 py-2">
                                                <div
                                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-black text-white shadow-lg border border-slate-700 overflow-hidden relative"
                                                    style={{
                                                        background: myTeam?.primaryColor
                                                            ? `linear-gradient(135deg, ${myTeam.primaryColor}, ${myTeam.secondaryColor || myTeam.primaryColor})`
                                                            : 'linear-gradient(135deg, #1e40af, #3b82f6)',
                                                    }}
                                                >
                                                    {myTeam?.logoUrl ? (
                                                        <img src={myTeam.logoUrl} alt="" className="w-full h-full object-cover" onError={(e) => { const el = e.currentTarget; el.onerror = null; el.src = teamInitialsAvatar(myTeam?.name); }} />
                                                    ) : (
                                                        myTeam?.name?.charAt(0) || 'S'
                                                    )}
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-white font-bold text-sm sm:text-base leading-tight block">
                                                        {myTeam?.name || 'Takımınız'}
                                                    </span>
                                                    <span className="text-slate-400 font-bold text-xs mt-1 block">
                                                        Kendi Aramızda
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Business & Location Info */}
                                        <div className="bg-slate-900/50 p-3 sm:p-4 rounded-2xl border border-slate-800 flex items-center gap-3 sm:gap-4">
                                            <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20 shadow-inner shrink-0">
                                                <MapPin className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-white font-bold text-sm truncate">{businessName}</div>
                                                <div className="text-slate-400 text-xs truncate mt-0.5">{pitchName}</div>
                                                {match.pitch?.business?.address && (
                                                    <div className="text-slate-500 text-[10px] truncate mt-0.5">
                                                        {match.pitch.business.address}
                                                    </div>
                                                )}
                                            </div>
                                            {distanceKm != null && (
                                                <div className="shrink-0 bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                                                    <Navigation className="w-3 h-3 text-turf-500" />
                                                    <span className="text-xs font-bold text-white">{distanceKm} km</span>
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
