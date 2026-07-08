import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Swords, Users, MapPin, Calendar, Clock, ChevronRight } from 'lucide-react';
import { useModalBodyClass } from '../../../../utils/useModalBodyClass';
import { useTeamRequests } from '../hooks/useTeamRequests';
import { PlayerDetailModal } from '../../../../components/Modals/PlayerDetailModal';
import { addOneHour } from '../../../../utils/time';

interface TeamRequestsModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamId?: string;
    isLeader: boolean; // kaptan veya yardımcı kaptan → iptal/geri al yetkisi
}

type Tab = 'CHALLENGES' | 'JOKERS';

const MATCH_TYPE_LABEL: Record<string, string> = {
    kendi_aramizda: 'Kendi Aramızda',
    rakip_araniyor: 'Rakip Aranıyor',
};

const formatMatchDate = (date?: string, time?: string) => {
    if (!date) return '';
    const d = new Date(`${date}T${time || '00:00'}:00`);
    if (isNaN(d.getTime())) return `${date} ${time || ''}`.trim();
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
};

// Maç saat aralığı: başlangıç–bitiş (uygulama-geneli 1 saat maç)
const timeRange = (time?: string) => {
    if (!time) return '';
    const end = addOneHour(time);
    return end ? `${time} – ${end}` : time;
};

// Joker davet nesnesini oyuncu kartı (PlayerDetailModal) Player şekline map'ler
const jokerToPlayer = (j: any) => ({
    id: j.jokerId,
    name: j.name,
    isJoker: true,
    position: j.position,
    foot: j.foot,
    birthDate: j.birthDate,
    secondaryPosition: j.secondaryPosition,
    location: j.location ?? '',
    nationality: j.nationality,
    avatarUrl: j.avatarUrl ?? '',
    favoritePitchIds: j.favoriteBusinessIds ?? [],
});

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'Cevap Bekleniyor', cls: 'text-orange-400' },
    ACCEPTED: { label: 'Kabul Edildi', cls: 'text-turf-400' },
    JOINED: { label: 'Katıldı', cls: 'text-turf-400' },
};

export const TeamRequestsModal: React.FC<TeamRequestsModalProps> = ({
    isOpen,
    onClose,
    teamId,
    isLeader,
}) => {
    useModalBodyClass(isOpen);
    const [tab, setTab] = useState<Tab>('CHALLENGES');
    const [confirm, setConfirm] = useState<{ message: string; run: () => Promise<void> } | null>(null);
    const [busy, setBusy] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);

    const { challenges, jokerGroups, loading, cancelChallenge, cancelJokerInvite } =
        useTeamRequests(teamId, isOpen);

    if (!isOpen) return null;

    const runConfirm = async () => {
        if (!confirm) return;
        setBusy(true);
        try {
            await confirm.run();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'İşlem başarısız.');
        } finally {
            setBusy(false);
            setConfirm(null);
        }
    };

    const tabBtn = (key: Tab, label: string, count: number) => (
        <button
            onClick={() => setTab(key)}
            className={`flex-1 py-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-xl transition-all !whitespace-nowrap ${
                tab === key ? 'bg-turf-500 text-white shadow-lg shadow-turf-500/20' : 'text-slate-500 hover:text-slate-300'
            }`}
        >
            {label} {count > 0 && <span className={tab === key ? "opacity-90" : "opacity-70"}>({count})</span>}
        </button>
    );

    return createPortal(
        <>
            <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
                <div 
                    className="bg-slate-800 w-full max-w-lg max-h-[85vh] rounded-[2.5rem] border border-slate-700/50 overflow-hidden relative shadow-2xl flex flex-col animate-slide-up"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-700/50 relative overflow-hidden shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-slate-900" />
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 bg-slate-900/50 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-10 backdrop-blur-sm"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="bg-blue-500/20 p-3 rounded-2xl border border-blue-500/20 shadow-lg shadow-blue-500/10">
                                <Swords className="w-6 h-6 text-blue-400" />
                            </div>
                            <div className="pr-10 min-w-0 flex-1">
                                <h3 className="text-[clamp(16px,5vw,22px)] font-sport font-black text-white uppercase italic tracking-wide truncate">
                                    Takım İstekleri
                                </h3>
                                <p className="text-[clamp(11px,3vw,13px)] text-slate-400 truncate">
                                    {isLeader ? 'Görüntüle ve geri çek' : 'Görüntüleme'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="px-4 sm:px-6 pt-5 pb-1">
                        <div className="flex p-1 bg-slate-900/60 rounded-2xl gap-1 border border-slate-700/50">
                            {tabBtn('CHALLENGES', 'Meydan Okumalar', challenges.length)}
                            {tabBtn('JOKERS', 'Joker Davetleri', jokerGroups.length)}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-slate-400 text-sm font-bold animate-pulse">Yükleniyor...</p>
                            </div>
                        ) : tab === 'CHALLENGES' ? (
                            challenges.length === 0 ? (
                                <EmptyState icon={<Swords className="w-12 h-12 text-slate-600" />} title="Meydan Okuma Yok" desc="Maç Pazarı'ndan bir ilana meydan okuduğunuzda burada görünür." />
                            ) : (
                                challenges.map((c) => (
                                    <ChallengeCard
                                        key={c.id}
                                        challenge={c}
                                        canCancel={isLeader && c.status === 'PENDING'}
                                        onCancel={() =>
                                            setConfirm({
                                                message: `${c.match?.team?.name || 'Rakip'} takımına gönderdiğin meydan okumayı geri çekmek istiyor musun?`,
                                                run: () => cancelChallenge(c.id),
                                            })
                                        }
                                    />
                                ))
                            )
                        ) : jokerGroups.length === 0 ? (
                            <EmptyState icon={<Users className="w-12 h-12 text-slate-600" />} title="Joker Daveti Yok" desc="Bir maça joker davet ettiğinizde burada maç bazında görünür." />
                        ) : (
                            jokerGroups.map((g) => (
                                <JokerGroupCard
                                    key={g.matchId}
                                    group={g}
                                    isLeader={isLeader}
                                    onPlayerTap={(j) => setSelectedPlayer(jokerToPlayer(j))}
                                    onCancel={(jokerId, name) =>
                                        setConfirm({
                                            message: `${name} için gönderdiğin joker davetini geri almak istiyor musun?`,
                                            run: () => cancelJokerInvite(g.matchId, jokerId),
                                        })
                                    }
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* İç onay katmanı (z-[90] → modalın üstünde) */}
            {confirm && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center px-6 bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-800 w-full max-w-xs rounded-[2rem] border border-slate-700/80 p-6 text-center shadow-2xl animate-scale-in">
                        <p className="text-white font-bold text-sm mb-6 leading-relaxed">{confirm.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirm(null)}
                                disabled={busy}
                                className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-600 transition-colors disabled:opacity-50"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={runConfirm}
                                disabled={busy}
                                className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-400 transition-colors disabled:opacity-50"
                            >
                                {busy ? '...' : 'Geri Al'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Oyuncu kartı */}
            <PlayerDetailModal
                isOpen={!!selectedPlayer}
                onClose={() => setSelectedPlayer(null)}
                player={selectedPlayer}
                zClass="z-[80]"
            />
        </>,
        document.body,
    );
};

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-slate-700/50 shadow-inner">
            {icon}
        </div>
        <div>
            <p className="text-white font-black text-lg mb-1">{title}</p>
            <p className="text-slate-400 text-sm max-w-[260px] mx-auto">{desc}</p>
        </div>
    </div>
);

// Meydan okuma durum pill'i
const StatusPill: React.FC<{ status: string }> = ({ status }) => {
    const map: Record<string, { label: string; cls: string }> = {
        PENDING: { label: 'Cevap Bekleniyor', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
        ACCEPTED: { label: 'Kabul Edildi', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
        JOINED: { label: 'Katıldı', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
    };
    const s = map[status] || { label: status, cls: 'bg-slate-700/50 text-slate-300 border-slate-600/50' };
    return (
        <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border !whitespace-nowrap shadow-sm ${s.cls}`}>
            {s.label}
        </span>
    );
};

const ChallengeCard: React.FC<{ challenge: any; canCancel: boolean; onCancel: () => void }> = ({
    challenge,
    canCancel,
    onCancel,
}) => {
    const opponent = challenge.match?.team?.name || 'Rakip Takım';
    const business = challenge.match?.pitch?.business?.name || 'İşletme';
    const district = challenge.match?.pitch?.business?.district;
    const pitch = challenge.match?.pitch?.name || 'Saha';
    return (
        <div className="bg-slate-900/40 rounded-3xl border border-blue-500/10 overflow-hidden relative group hover:border-blue-500/30 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 border-b border-slate-700/40 relative z-10">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-blue-500/10 p-2 rounded-xl shrink-0">
                        <Swords className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-white font-bold text-[clamp(13px,4vw,15px)] truncate">{opponent}</span>
                </div>
                <StatusPill status={challenge.status} />
            </div>
            
            <div className="p-4 sm:p-5 space-y-3 relative z-10">
                <div className="flex items-center gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/30">
                    <Calendar className="w-4 h-4 text-turf-400 shrink-0" />
                    <div className="min-w-0">
                        <div className="text-white font-bold text-sm truncate">{formatMatchDate(challenge.match?.date, challenge.match?.time)}</div>
                        <div className="text-slate-400 text-xs truncate mt-0.5">{timeRange(challenge.match?.time)}</div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/30">
                    <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                    <div className="min-w-0">
                        <div className="text-white font-bold text-sm truncate">{business}</div>
                        <div className="text-slate-400 text-xs truncate mt-0.5">{district ? `${pitch} · ${district}` : pitch}</div>
                    </div>
                </div>

                {canCancel && (
                    <button
                        onClick={onCancel}
                        className="w-full mt-2 bg-slate-800/80 border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 font-bold text-[clamp(12px,3.5vw,14px)] py-3 rounded-xl transition-all"
                    >
                        İsteği Geri Çek
                    </button>
                )}
            </div>
        </div>
    );
};

const JokerGroupCard: React.FC<{
    group: any;
    isLeader: boolean;
    onPlayerTap: (joker: any) => void;
    onCancel: (jokerId: string, name: string) => void;
}> = ({ group, isLeader, onPlayerTap, onCancel }) => {
    const business = group.businessName || 'İşletme';
    const pitch = group.pitchName || 'Saha';
    const title = group.opponentTeamName
        ? `${group.opponentTeamName}`
        : MATCH_TYPE_LABEL[group.matchType] || 'Maç';
        
    return (
        <div className="bg-slate-900/40 rounded-3xl border border-turf-500/10 overflow-hidden relative group hover:border-turf-500/30 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-turf-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="px-4 sm:px-5 py-4 border-b border-slate-700/40 relative z-10">
                <div className="flex items-center gap-3 min-w-0 mb-3">
                    <div className="bg-turf-500/10 p-2 rounded-xl shrink-0">
                        <Users className="w-4 h-4 text-turf-400" />
                    </div>
                    <span className="text-white font-bold text-[clamp(14px,4.5vw,16px)] leading-tight truncate">{title}</span>
                </div>
                
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[clamp(11px,3.2vw,12px)] text-slate-300 bg-slate-800/40 py-1.5 px-3 rounded-lg w-fit border border-slate-700/30">
                        <Calendar className="w-3.5 h-3.5 text-turf-400" />
                        <span className="font-medium">{formatMatchDate(group.date, group.time)}</span>
                        <span className="text-slate-500 mx-1">•</span>
                        <Clock className="w-3.5 h-3.5 text-orange-400" />
                        <span className="font-medium">{timeRange(group.time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[clamp(11px,3.2vw,12px)] text-slate-400 bg-slate-800/40 py-1.5 px-3 rounded-lg w-fit border border-slate-700/30">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate">{business}{group.district ? ` · ${group.district}` : ''}</span>
                    </div>
                </div>
            </div>

            <div className="p-3 sm:p-4 space-y-2 relative z-10">
                {group.jokers.map((j: any) => {
                    const avatar = j.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(j.name)}&background=1a2e35&color=4ade80&size=96`;
                    const st = STATUS_LABEL[j.status] || { label: j.status, cls: 'text-slate-300' };
                    const canCancel = isLeader && j.status === 'PENDING';
                    
                    return (
                        <div
                            key={`${j.jokerId}-${j.status}`}
                            onClick={() => onPlayerTap(j)}
                            className="bg-slate-800/60 rounded-2xl p-3 sm:p-4 hover:bg-slate-800/80 transition-colors cursor-pointer border border-slate-700/30 hover:border-slate-600 flex flex-col gap-3"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-slate-900/50 ${st.cls}`}>
                                    {st.label}
                                </span>
                                {canCancel && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onCancel(j.jokerId, j.name); }}
                                        className="shrink-0 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-red-500/20 transition-all"
                                    >
                                        Geri Al
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-3 sm:gap-4">
                                <img src={avatar} alt={j.name} loading="lazy" className="w-12 h-12 rounded-full object-cover border-2 border-slate-600/50 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-white font-bold text-[clamp(14px,4vw,15px)] leading-tight truncate">{j.name}</div>
                                    <div className="text-turf-400 font-medium text-[11px] mt-1 truncate">{j.position || 'Mevki belirtilmemiş'}</div>
                                </div>
                                <div className="bg-slate-700/50 p-1.5 rounded-full">
                                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
