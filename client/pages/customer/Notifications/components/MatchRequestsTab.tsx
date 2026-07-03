import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Handshake, Swords, Check, X, ShieldCheck, UserPlus, MessageSquare, Banknote, Users, Navigation } from 'lucide-react';
import { Challenge } from '../../../../types';
import { Notification } from '../hooks/useNotifications';
import { useLocationContext } from '../../../../contexts/LocationContext';
import { calculateDistance } from '../../../../utils/location';

// match_type → kullanıcı etiketi
const MATCH_TYPE_LABELS: Record<string, string> = {
    kendi_aramizda: 'Kendi Aramızda',
    rakip_araniyor: 'Rakip Aranıyor',
};

// "23:00" → "00:00" — maç süresi uygulama genelinde 1 saat (chatUtils matchEndTime ile tutarlı).
// Geçerli HH:MM parse edilemezse null döner (çağıran tek değere düşer).
const addOneHour = (time?: string): string | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(time || '');
    if (!m) return null;
    const h = Number(m[1]);
    if (h > 23 || Number(m[2]) > 59) return null;
    return `${String((h + 1) % 24).padStart(2, '0')}:${m[2]}`;
};

interface MatchRequestsTabProps {
    matchRequests: Challenge[];
    rematchProposals: Notification[];
    jokerInvites: Notification[];
    setSelectedTeamId: (id: string) => void;
    handleAcceptChallenge: (id: string) => void;
    handleRejectChallenge: (id: string) => void;
    handleAcceptRematchFromNotif: (n: Notification) => void;
    handleAcceptJokerInvite: (n: Notification) => void;
    handleRejectJokerInvite: (n: Notification) => void;
}

export const MatchRequestsTab: React.FC<MatchRequestsTabProps> = ({
    matchRequests, rematchProposals, jokerInvites,
    setSelectedTeamId, handleAcceptChallenge, handleRejectChallenge,
    handleAcceptRematchFromNotif, handleAcceptJokerInvite, handleRejectJokerInvite
}) => {
    const navigate = useNavigate();
    const { coords } = useLocationContext();

    // Joker davetinde sahanın jokere uzaklığı (km) — coords veya saha koordinatı yoksa null
    const getJokerDistanceKm = (metadata: any): number | null => {
        if (!coords || metadata?.businessLat == null || metadata?.businessLng == null) return null;
        return calculateDistance(coords.lat, coords.lng, metadata.businessLat, metadata.businessLng);
    };

    if (matchRequests.length === 0 && rematchProposals.length === 0 && jokerInvites.length === 0) {
        return (
            <div className="text-center py-12 opacity-50">
                <Handshake className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Bekleyen maç isteği yok.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {matchRequests.map(request => (
                <div key={request.id} className="p-4 rounded-2xl border flex gap-4 items-center transition-all cursor-pointer group relative overflow-hidden bg-slate-800 border-slate-700 hover:border-turf-500/50 hover:bg-slate-800/80">
                    <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-turf-600/10 to-transparent pointer-events-none"></div>
                    <div className="relative cursor-pointer hover:scale-105 transition-transform" onClick={(e) => { e.stopPropagation(); if (request.fromTeamId) setSelectedTeamId(request.fromTeamId); }}>
                        <img src={request.fromTeam?.logoUrl || '/default-team-logo.png'} alt={request.fromTeam?.name || 'Rakip Takım'} className="w-16 h-16 rounded-full object-cover border-2 border-slate-600 group-hover:border-turf-500 transition-colors bg-slate-900" />
                    </div>
                    <div className="flex-1 min-w-0 relative z-10">
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-white text-lg truncate group-hover:text-turf-400 transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); if (request.fromTeamId) setSelectedTeamId(request.fromTeamId); }}>
                                {request.fromTeam?.name || 'Rakip Takım'}
                            </h3>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{new Date(request.createdAt).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            <Calendar className="w-3 h-3 text-turf-500" />
                            <span className="text-white font-bold">{request.match ? `${new Date(request.match.date).toLocaleDateString('tr-TR')} ${request.match.time}` : 'Tarih Bilinmiyor'}</span>
                        </div>
                        {(request.match as any)?.pitch && (
                            <div className="flex items-center gap-1 text-xs text-turf-400 mt-1 mb-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="font-semibold truncate">{(request.match as any).pitch.business?.name ? `${(request.match as any).pitch.business.name} · ${(request.match as any).pitch.name}` : (request.match as any).pitch.name}</span>
                            </div>
                        )}
                        {request.note && <p className="text-xs text-slate-300 italic mb-1 line-clamp-1">"{request.note}"</p>}
                        <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleAcceptChallenge(request.id); }} className="flex-1 py-2 bg-turf-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20">
                                <Check className="w-3 h-3" /> Kabul Et
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleRejectChallenge(request.id); }} className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-900/50 hover:text-red-400 transition-colors">
                                <X className="w-3 h-3" /> Reddet
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {rematchProposals.length > 0 && (
                <>
                    {matchRequests.length > 0 && (
                        <div className="border-t border-slate-700 my-4 pt-2">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Swords className="w-4 h-4 text-turf-500" /> Rövanş Teklifleri</p>
                        </div>
                    )}
                    {rematchProposals.map(notif => (
                        <div key={notif.id} className="p-4 rounded-2xl border flex gap-4 items-start transition-all relative overflow-hidden bg-slate-800 border-slate-700 hover:border-turf-500/50">
                            <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-turf-600/10 to-transparent pointer-events-none"></div>
                            <div className="w-12 h-12 rounded-full bg-turf-500/20 flex items-center justify-center flex-shrink-0"><Swords className="w-6 h-6 text-turf-500" /></div>
                            <div className="flex-1 min-w-0 relative z-10">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-white text-base">{notif.metadata?.proposerTeamName || 'Rövanş Teklifi'}</h3>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{new Date(notif.createdAt).toLocaleDateString('tr-TR')}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                    <Calendar className="w-3 h-3 text-turf-500" />
                                    <span className="text-white font-bold">{notif.metadata?.matchDate && notif.metadata?.matchTime ? `${new Date(notif.metadata.matchDate).toLocaleDateString('tr-TR')} ${notif.metadata.matchTime}` : 'Tarih Bilinmiyor'}</span>
                                </div>
                                {(notif.metadata?.businessName || notif.metadata?.pitchName) && (
                                    <div className="flex items-center gap-1 text-xs text-turf-400 mt-1 mb-2">
                                        <MapPin className="w-3 h-3 flex-shrink-0" />
                                        <span className="font-semibold truncate">{notif.metadata.businessName} · {notif.metadata.pitchName}</span>
                                    </div>
                                )}
                                <div className="flex gap-2 mt-2">
                                    <button onClick={() => handleAcceptRematchFromNotif(notif)} className="flex-1 py-2 bg-turf-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20"><Check className="w-3 h-3" /> Kabul Et</button>
                                    <button onClick={() => navigate('/chat', { state: { channelId: notif.metadata?.channelId } })} className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-900/50 hover:text-blue-400 transition-colors"><MessageSquare className="w-3 h-3" /> Sohbete Git</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {jokerInvites.length > 0 && (
                <>
                    <div className={`${(matchRequests.length > 0 || rematchProposals.length > 0) ? "border-t border-slate-700 pt-2 my-4" : "mb-4"}`}>
                        <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-turf-500" /> Joker Kartı Daveti (Tek Maçlık)</p>
                    </div>
                    {jokerInvites.map(notif => {
                        const meta = notif.metadata || {};
                        const distanceKm = getJokerDistanceKm(meta);
                        const matchTypeLabel = meta.matchType ? (MATCH_TYPE_LABELS[meta.matchType] || meta.matchType) : null;
                        const hasDetails = meta.businessName || meta.pitchName || meta.businessDistrict || meta.businessAddress || meta.pitchPrice != null;
                        return (
                        <div key={notif.id} className="p-4 rounded-2xl border transition-all relative overflow-hidden bg-slate-800 border-turf-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                            <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-turf-600/10 to-transparent pointer-events-none"></div>
                            {/* Üst: ikon + takım + tarih */}
                            <div className="flex gap-3 items-start relative z-10">
                                <div className={`relative flex-shrink-0 z-20 ${meta.teamId ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`} onClick={(e) => { if (meta.teamId) { e.stopPropagation(); setSelectedTeamId(meta.teamId); } }}>
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-turf-400 to-green-600 flex items-center justify-center shadow-lg shadow-turf-500/30">
                                        <UserPlus className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className={`font-bold text-white text-base truncate ${meta.teamId ? 'cursor-pointer hover:text-turf-400 transition-colors z-20' : ''}`} onClick={(e) => { if (meta.teamId) { e.stopPropagation(); setSelectedTeamId(meta.teamId); } }}>
                                            {meta.teamName || 'Bilinmeyen Takım'}
                                        </h3>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase flex-shrink-0 ml-2">{new Date(notif.createdAt).toLocaleDateString('tr-TR')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                        <Calendar className="w-3 h-3 text-turf-500 flex-shrink-0" />
                                        <span className="text-white font-bold">{meta.matchDate && meta.matchTime ? `${new Date(meta.matchDate).toLocaleDateString('tr-TR')} · ${meta.matchTime}${addOneHour(meta.matchTime) ? ` - ${addOneHour(meta.matchTime)}` : ''}` : 'Tarih Bilinmiyor'}</span>
                                        {meta.playerCount && matchTypeLabel && (
                                            <span className="text-slate-400 truncate">· {meta.playerCount} Kişilik</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Maç bilgi paneli: saha + konum + ücret + uzaklık */}
                            {hasDetails && (
                                <div className="mt-3 rounded-xl bg-slate-900/60 border border-slate-700/50 divide-y divide-slate-700/40 relative z-10">
                                    {(meta.businessName || meta.pitchName) && (
                                        <div className="flex items-center gap-2 px-3 py-2">
                                            <MapPin className="w-3.5 h-3.5 text-turf-400 flex-shrink-0" />
                                            <span className="text-xs font-semibold text-white truncate">{meta.businessName ? `${meta.businessName} · ` : ''}{meta.pitchName}</span>
                                            {distanceKm != null && (
                                                <span className="ml-auto text-[11px] font-bold text-turf-400 bg-turf-900/30 px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1">
                                                    <Navigation className="w-2.5 h-2.5" /> {distanceKm} km
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {(meta.businessDistrict || meta.businessAddress) && (
                                        <div className="flex items-start gap-2 px-3 py-2">
                                            <Navigation className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                {meta.businessDistrict && <span className="text-xs font-semibold text-white">{meta.businessDistrict}</span>}
                                                {meta.businessAddress && <p className="text-[11px] text-slate-400 line-clamp-1">{meta.businessAddress}</p>}
                                            </div>
                                            {distanceKm != null && !(meta.businessName || meta.pitchName) && (
                                                <span className="ml-auto text-[11px] font-bold text-turf-400 bg-turf-900/30 px-2 py-0.5 rounded-full flex-shrink-0">{distanceKm} km</span>
                                            )}
                                        </div>
                                    )}
                                    {meta.pitchPrice != null && (
                                        <div className="flex items-center gap-2 px-3 py-2">
                                            <Banknote className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                            <span className="text-xs font-bold text-white">₺{Number(meta.pitchPrice).toLocaleString('tr-TR')}</span>
                                            <span className="text-[11px] text-slate-400">/ saat (saha ücreti)</span>
                                        </div>
                                    )}
                                    {meta.playerCount && matchTypeLabel && (
                                        <div className="flex items-center gap-2 px-3 py-2">
                                            <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                            <span className="text-xs text-slate-300"><span className="font-bold text-white">{meta.playerCount}</span> Kişilik <span className="text-white">{matchTypeLabel}</span></span>
                                        </div>
                                    )}
                                </div>
                            )}
                            {meta.note && <p className="text-xs text-slate-300 italic mt-2 line-clamp-1 relative z-10">"{meta.note}"</p>}
                            <div className="flex gap-2 mt-3 relative z-10">
                                <button onClick={() => handleAcceptJokerInvite(notif)} className="flex-1 py-2 bg-gradient-to-r from-turf-600 to-green-500 text-white rounded-lg text-xs font-black uppercase italic flex items-center justify-center gap-1 hover:scale-[1.02] transition-transform shadow-lg shadow-turf-600/20"><Check className="w-3 h-3" /> Kabul Et</button>
                                <button onClick={() => handleRejectJokerInvite(notif)} className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-900/50 hover:text-red-400 transition-colors"><X className="w-3 h-3" /> Reddet</button>
                            </div>
                        </div>
                        );
                    })}
                </>
            )}
        </div>
    );
};
