import React, { useEffect, useRef, useState } from 'react';
import { X, Users, Repeat, Swords, Trash2, Check, Loader2 } from 'lucide-react';
import api from '../../../../services/api';
import { useModalBodyClass } from '../../../../utils/useModalBodyClass';
import { teamLogoSrc, teamInitialsAvatar } from '../../../../utils/teamColors';

// Sabit kapatmaya abone takım atama/yönetme modalı. Takım seçimi yalnız takım
// kodu (ABC-123) ile birebir aramadır — tüm takımlar asla listeye yüklenmez.
// API çağrıları modal içinde (JoinTeamModal emsali); değişiklik sonrası
// onChanged ile dashboard tazelenir.

interface TeamLite {
    id: string;
    name: string;
    shortId?: string | null;
    logoUrl?: string | null;
    primaryColor?: string | null;
}

interface AssignSubscriberModalProps {
    isOpen: boolean;
    closureId: string | null;
    pitchId: string | null;
    dayLabel: string;
    timeLabel: string;
    onClose: () => void;
    onChanged: () => void;
}

const CODE_PATTERN = /^[A-Z]{3}-\d{3}$/;

// Kod girdisini normalize et: büyük harf + Türkçe karakter düzeltmesi (İ→I).
const normalizeCode = (raw: string) =>
    raw.toUpperCase().replace(/İ/g, 'I').replace(/\s/g, '').slice(0, 7);

const TeamPreview: React.FC<{ team: TeamLite }> = ({ team }) => (
    <div className="flex items-center gap-3 bg-slate-900/60 border border-emerald-500/30 rounded-xl p-3 mt-2">
        <div className="w-10 h-10 bg-slate-900 rounded-full border border-slate-600 overflow-hidden flex items-center justify-center shrink-0">
            <img
                src={teamLogoSrc(team)}
                alt={team.name}
                className="w-full h-full object-cover"
                onError={(e) => { const el = e.currentTarget; el.onerror = null; el.src = teamInitialsAvatar(team.name); }}
            />
        </div>
        <div className="min-w-0 flex-1">
            <div className="text-white font-bold text-sm truncate">{team.name}</div>
            <div className="text-emerald-400 text-[11px] font-mono font-bold">#{team.shortId}</div>
        </div>
        <Check className="w-5 h-5 text-emerald-400 shrink-0" />
    </div>
);

// Tek kod girişi + birebir arama önizlemesi.
const CodeInput: React.FC<{
    label: string;
    value: string;
    onChange: (v: string) => void;
    team: TeamLite | null;
    searching: boolean;
    notFound: boolean;
}> = ({ label, value, onChange, team, searching, notFound }) => (
    <div>
        <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">{label}</label>
        <div className="relative mt-1">
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(normalizeCode(e.target.value))}
                placeholder="Takım kodu (örn: KNY-042)"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white font-mono font-bold tracking-widest placeholder:font-sans placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 text-[15px]"
            />
            {searching && (
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
            )}
        </div>
        {team && <TeamPreview team={team} />}
        {notFound && !searching && (
            <p className="text-red-400 text-xs font-bold mt-2">Bu kodla bir takım bulunamadı.</p>
        )}
    </div>
);

export const AssignSubscriberModal: React.FC<AssignSubscriberModalProps> = ({
    isOpen,
    closureId,
    pitchId,
    dayLabel,
    timeLabel,
    onClose,
    onChanged,
}) => {
    useModalBodyClass(isOpen);

    const [mode, setMode] = useState<'single' | 'rival'>('single');
    const [code1, setCode1] = useState('');
    const [code2, setCode2] = useState('');
    const [team1, setTeam1] = useState<TeamLite | null>(null);
    const [team2, setTeam2] = useState<TeamLite | null>(null);
    const [searching1, setSearching1] = useState(false);
    const [searching2, setSearching2] = useState(false);
    const [notFound1, setNotFound1] = useState(false);
    const [notFound2, setNotFound2] = useState(false);
    // Mevcut atama (varsa) — modal açılınca sahanın kural listesinden çekilir.
    const [current, setCurrent] = useState<{ team: TeamLite | null; opponentTeam: TeamLite | null } | null>(null);
    const [loadingCurrent, setLoadingCurrent] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [removeConfirm, setRemoveConfirm] = useState(false);
    const [error, setError] = useState('');
    const debounce1 = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debounce2 = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Açılışta durumu sıfırla + mevcut atamayı yükle.
    useEffect(() => {
        if (!isOpen || !closureId || !pitchId) return;
        setMode('single');
        setCode1(''); setCode2('');
        setTeam1(null); setTeam2(null);
        setNotFound1(false); setNotFound2(false);
        setRemoveConfirm(false);
        setError('');
        setCurrent(null);
        setLoadingCurrent(true);
        api.get(`/reservations/recurring-closures/pitch/${pitchId}`)
            .then((res) => {
                const closure = (res.data || []).find((c: any) => c.id === closureId);
                if (closure?.team) {
                    setCurrent({ team: closure.team, opponentTeam: closure.opponentTeam ?? null });
                }
            })
            .catch(() => { /* mevcut atama gösterilemezse sadece atama akışı kalır */ })
            .finally(() => setLoadingCurrent(false));
    }, [isOpen, closureId, pitchId]);

    // Kod → birebir takım araması (debounce'lu). Tam koda ulaşmadan istek atılmaz.
    const lookup = (
        code: string,
        setTeam: (t: TeamLite | null) => void,
        setSearching: (b: boolean) => void,
        setNotFound: (b: boolean) => void,
        debounceRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    ) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setTeam(null);
        setNotFound(false);
        if (!CODE_PATTERN.test(code)) { setSearching(false); return; }
        setSearching(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await api.get(`/teams/search/${encodeURIComponent(code)}`);
                const match = (res.data || []).find(
                    (t: any) => (t.shortId || '').toUpperCase() === code,
                ) ?? (res.data || [])[0] ?? null;
                setTeam(match);
                setNotFound(!match);
            } catch {
                setNotFound(true);
            } finally {
                setSearching(false);
            }
        }, 350);
    };

    useEffect(() => { lookup(code1, setTeam1, setSearching1, setNotFound1, debounce1); }, [code1]);
    useEffect(() => { lookup(code2, setTeam2, setSearching2, setNotFound2, debounce2); }, [code2]);

    if (!isOpen || !closureId) return null;

    const sameTeam = mode === 'rival' && team1 && team2 && team1.id === team2.id;
    const canSubmit =
        !submitting && !!team1 && (mode === 'single' || (!!team2 && !sameTeam));

    const handleAssign = async () => {
        if (!canSubmit || !team1) return;
        setSubmitting(true);
        setError('');
        try {
            await api.patch(`/reservations/recurring-closures/${closureId}/team`, {
                teamShortId: team1.shortId,
                ...(mode === 'rival' && team2 ? { opponentTeamShortId: team2.shortId } : {}),
            });
            onChanged();
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Atama başarısız oldu.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemove = async () => {
        setSubmitting(true);
        setError('');
        try {
            await api.delete(`/reservations/recurring-closures/${closureId}/team`);
            onChanged();
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.message || 'İşlem başarısız oldu.');
        } finally {
            setSubmitting(false);
            setRemoveConfirm(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-slate-800 w-[min(calc(100vw-2rem),420px)] rounded-2xl border border-slate-700 max-h-[85vh] overflow-y-auto animate-scale-in shadow-2xl p-[clamp(1rem,4vw,1.375rem)]"
                style={{ overscrollBehavior: 'contain' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-[clamp(1.05rem,5vw,1.25rem)] font-black text-white leading-tight flex items-center gap-2">
                            <Repeat className="w-5 h-5 text-emerald-400 shrink-0" />
                            Abone Takım
                        </h3>
                        <p className="text-slate-400 text-[clamp(0.72rem,3.2vw,0.8rem)] font-medium mt-0.5">
                            Her {dayLabel} {timeLabel}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-700/50 rounded-full hover:bg-slate-600 text-slate-300 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {loadingCurrent ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                    </div>
                ) : current ? (
                    /* ── Mevcut atama: göster + kaldır ── */
                    <div className="space-y-3">
                        <p className="text-slate-300 text-[13px] leading-relaxed">
                            Bu saate abone takım atanmış durumda. Aboneliği kaldırdığınızda takımın abone sohbeti kapanır ve üyeler bilgilendirilir.
                        </p>
                        {current.team && <TeamPreview team={current.team} />}
                        {current.opponentTeam && (
                            <>
                                <div className="flex items-center justify-center text-slate-500 font-black italic text-xs">VS</div>
                                <TeamPreview team={current.opponentTeam} />
                            </>
                        )}
                        {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
                        {removeConfirm ? (
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={() => setRemoveConfirm(false)}
                                    className="flex-1 bg-slate-700/50 hover:bg-slate-600 text-white py-3 rounded-xl font-bold text-sm transition-all"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    onClick={handleRemove}
                                    disabled={submitting}
                                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Kaldırılıyor…' : 'Evet, Kaldır'}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setRemoveConfirm(true)}
                                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4 shrink-0" />
                                <span>Aboneliği Kaldır</span>
                            </button>
                        )}
                    </div>
                ) : (
                    /* ── Atama akışı ── */
                    <div className="space-y-4">
                        <p className="text-slate-400 text-[12px] leading-relaxed">
                            Takım kodunu girerek bu saate abone takım atayın. Atanan takım için kalıcı bir abone sohbeti oluşturulur — işletme onayı gerekmez.
                        </p>

                        {/* Mod seçimi */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setMode('single')}
                                className={`py-2.5 rounded-xl font-bold text-[12px] transition-all flex items-center justify-center gap-1.5 border ${mode === 'single'
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                                    : 'bg-slate-700/40 text-slate-400 border-slate-600/50'}`}
                            >
                                <Users className="w-4 h-4 shrink-0" />
                                Tek Takım
                            </button>
                            <button
                                onClick={() => setMode('rival')}
                                className={`py-2.5 rounded-xl font-bold text-[12px] transition-all flex items-center justify-center gap-1.5 border ${mode === 'rival'
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                                    : 'bg-slate-700/40 text-slate-400 border-slate-600/50'}`}
                            >
                                <Swords className="w-4 h-4 shrink-0" />
                                Rakipli Çift Takım
                            </button>
                        </div>

                        <CodeInput
                            label={mode === 'rival' ? '1. Takım' : 'Takım'}
                            value={code1}
                            onChange={setCode1}
                            team={team1}
                            searching={searching1}
                            notFound={notFound1}
                        />
                        {mode === 'rival' && (
                            <CodeInput
                                label="2. Takım (Rakip)"
                                value={code2}
                                onChange={setCode2}
                                team={team2}
                                searching={searching2}
                                notFound={notFound2}
                            />
                        )}
                        {sameTeam && (
                            <p className="text-red-400 text-xs font-bold">İki takım kodu aynı olamaz.</p>
                        )}
                        {error && <p className="text-red-400 text-xs font-bold">{error}</p>}

                        <button
                            onClick={handleAssign}
                            disabled={!canSubmit}
                            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:shadow-none"
                        >
                            <Check className="w-4 h-4 shrink-0" />
                            <span>{submitting ? 'Atanıyor…' : 'Takımı Ata ve Sohbeti Aç'}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
