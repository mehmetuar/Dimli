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
            className={`flex-1 py-2.5 text-xs font-bold uppercase rounded-lg transition-all !whitespace-nowrap ${
                tab === key ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
        >
            {label} {count > 0 && <span className="opacity-70">({count})</span>}
        </button>
    );

    return createPortal(
        <>
            <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                <div className="bg-slate-800 w-full max-w-lg max-h-[85vh] rounded-3xl border border-slate-700 overflow-hidden relative shadow-2xl animate-scale-in flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 relative">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 bg-slate-900/50 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-500/10 p-3 rounded-xl">
                                <Swords className="w-6 h-6 text-blue-400" />
                            </div>
                            <div className="pr-10">
                                <h3 className="text-[clamp(16px,5.5vw,24px)] font-sport font-bold text-white uppercase italic tracking-wide !whitespace-nowrap overflow-hidden text-ellipsis">
                                    Takım İstekleri
                                </h3>
                                <p className="text-sm text-slate-400">
                                    {isLeader ? 'Görüntüle ve geri çek' : 'Görüntüleme'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="px-4 pt-4">
                        <div className="flex p-1 bg-slate-900 rounded-xl gap-1">
                            {tabBtn('CHALLENGES', 'Meydan Okumalar', challenges.length)}
                            {tabBtn('JOKERS', 'Joker Davetleri', jokerGroups.length)}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-slate-400 text-sm">Yükleniyor...</p>
                            </div>
                        ) : tab === 'CHALLENGES' ? (
                            challenges.length === 0 ? (
                                <EmptyState icon={<Swords className="w-10 h-10 text-slate-600 mx-auto" />} title="Gönderilmiş meydan okuma yok" desc="Maç Pazarı'ndan bir ilana meydan okuduğunuzda burada görünür." />
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
                            <EmptyState icon={<Users className="w-10 h-10 text-slate-600 mx-auto" />} title="Joker daveti yok" desc="Bir maça joker davet ettiğinizde burada maç bazında görünür." />
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

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-700 bg-slate-900/50">
                        <button
                            onClick={onClose}
                            className="w-full bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-600 transition-colors"
                        >
                            Kapat
                        </button>
                    </div>

                    {/* İç onay katmanı (z-[90] → modalın üstünde) */}
                    {confirm && (
                        <div className="absolute inset-0 z-[90] flex items-center justify-center px-6 bg-black/70 backdrop-blur-sm rounded-3xl">
                            <div className="bg-slate-800 w-full max-w-xs rounded-2xl border border-slate-700 p-5 text-center">
                                <p className="text-white font-semibold text-sm mb-5">{confirm.message}</p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setConfirm(null)}
                                        disabled={busy}
                                        className="flex-1 bg-slate-700 text-white font-bold py-2.5 rounded-xl hover:bg-slate-600 transition-colors disabled:opacity-50"
                                    >
                                        Vazgeç
                                    </button>
                                    <button
                                        onClick={runConfirm}
                                        disabled={busy}
                                        className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50"
                                    >
                                        {busy ? '...' : 'Geri Al'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Oyuncu kartı — açık modalın ÜSTÜNDE (z-[80] > z-[70]); kapatınca modal açık kalır */}
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
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">{icon}</div>
        <p className="text-white font-bold">{title}</p>
        <p className="text-slate-400 text-sm max-w-[260px]">{desc}</p>
    </div>
);

// Meydan okuma durum pill'i (kart başlığında sağ üstte)
const StatusPill: React.FC<{ status: string }> = ({ status }) => {
    const map: Record<string, { label: string; cls: string }> = {
        PENDING: { label: 'Cevap Bekleniyor', cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
        ACCEPTED: { label: 'Kabul Edildi', cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
        JOINED: { label: 'Katıldı', cls: 'bg-green-500/15 text-green-400 border-green-500/30' },
    };
    const s = map[status] || { label: status, cls: 'bg-slate-700 text-slate-300 border-slate-600' };
    return (
        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border !whitespace-nowrap ${s.cls}`}>
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
        <div className="bg-slate-900/50 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="px-4 py-2.5 flex items-center justify-between gap-2 border-b border-slate-700/60">
                <div className="flex items-center gap-2 min-w-0">
                    <Swords className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-white font-bold text-sm truncate">{opponent}</span>
                </div>
                <StatusPill status={challenge.status} />
            </div>
            <div className="p-4 space-y-2.5">
                <Row icon={<Calendar className="w-4 h-4 text-turf-400" />} main={formatMatchDate(challenge.match?.date, challenge.match?.time)} sub={timeRange(challenge.match?.time)} />
                <Row icon={<MapPin className="w-4 h-4 text-blue-400" />} main={business} sub={district ? `${pitch} · ${district}` : pitch} />
                {canCancel && (
                    <button
                        onClick={onCancel}
                        className="w-full mt-1 bg-slate-800 border border-red-900/40 text-red-400 hover:text-red-300 hover:border-red-800 font-bold text-sm py-2.5 rounded-xl transition-colors"
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
        <div className="bg-slate-900/50 rounded-2xl border border-slate-700 overflow-hidden">
            {/* Maç başlığı — tarih + saat aralığı + saha (font clamp, taşma yok) */}
            <div className="px-4 py-3 border-b border-slate-700/60">
                <div className="flex items-center gap-2 min-w-0">
                    <Users className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-white font-bold text-[clamp(13px,4vw,16px)] leading-tight break-words">{title}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1.5">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-turf-500" /> {formatMatchDate(group.date, group.time)}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-orange-400" /> {timeRange(group.time)}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 min-w-0">
                    <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                    <span className="break-words">{business}{group.district ? ` · ${group.district}` : ''}</span>
                </div>
            </div>

            {/* Davet edilen jokerler — tıklanabilir kart, isim TAM görünür */}
            <div className="p-3 space-y-2">
                {group.jokers.map((j: any) => {
                    const avatar = j.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(j.name)}&background=1a2e35&color=4ade80&size=96`;
                    const st = STATUS_LABEL[j.status] || { label: j.status, cls: 'text-slate-300' };
                    const canCancel = isLeader && j.status === 'PENDING';
                    return (
                        <div
                            key={`${j.jokerId}-${j.status}`}
                            onClick={() => onPlayerTap(j)}
                            className="bg-slate-800/60 rounded-xl p-3 active:bg-slate-800 transition-colors cursor-pointer"
                        >
                            {/* Üst satır: küçük durum etiketi (sol) + Geri Al (sağ) */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <span className={`text-[9px] font-black uppercase tracking-wider ${st.cls}`}>
                                    {st.label}
                                </span>
                                {canCancel && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onCancel(j.jokerId, j.name); }}
                                        className="shrink-0 text-red-400 hover:text-red-300 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-red-900/40 hover:border-red-800 transition-colors"
                                    >
                                        Geri Al
                                    </button>
                                )}
                            </div>
                            {/* Gövde: avatar + tam isim + mevki + ok */}
                            <div className="flex items-center gap-3">
                                <img src={avatar} alt={j.name} loading="lazy" className="w-11 h-11 rounded-full object-cover border border-slate-600 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-white font-bold text-[clamp(13px,3.8vw,15px)] leading-tight break-words">{j.name}</div>
                                    <div className="text-slate-400 text-xs mt-0.5 truncate">{j.position || 'Mevki belirtilmemiş'}</div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const Row: React.FC<{ icon: React.ReactNode; main: string; sub?: string }> = ({ icon, main, sub }) => (
    <div className="flex items-center gap-3">
        <div className="bg-slate-800 p-2 rounded-lg shrink-0 border border-slate-700">{icon}</div>
        <div className="min-w-0">
            <div className="text-white font-bold text-sm truncate">{main}</div>
            {sub && <div className="text-slate-400 text-xs truncate">{sub}</div>}
        </div>
    </div>
);
