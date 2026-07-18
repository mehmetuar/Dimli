import React from 'react';
import { Repeat, X, Users } from 'lucide-react';
import { teamLogoSrc, teamInitialsAvatar } from '../../../../utils/teamColors';

const DAY_LABELS: Record<string, string> = {
    Monday: 'Pazartesi',
    Tuesday: 'Salı',
    Wednesday: 'Çarşamba',
    Thursday: 'Perşembe',
    Friday: 'Cuma',
    Saturday: 'Cumartesi',
    Sunday: 'Pazar',
};

interface ClosureTeamLite {
    id: string;
    name: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
}

interface RecurringClosuresSectionProps {
    closures: {
        id: string;
        dayOfWeek: string;
        startTime: string;
        endTime: string;
        // Abone takım ataması (varsa) — sunucu team/opponentTeam ilişkileriyle döner
        team?: ClosureTeamLite | null;
        opponentTeam?: ClosureTeamLite | null;
    }[];
    removingClosureId: string | null;
    onRemove: (id: string) => void;
    disabled?: boolean;
}

export const RecurringClosuresSection: React.FC<RecurringClosuresSectionProps> = ({
    closures,
    removingClosureId,
    onRemove,
    disabled = false,
}) => {
    return (
        <div className="bg-slate-800/70 rounded-2xl border border-slate-700/60 overflow-hidden"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
            <div className="px-4 py-3.5 border-b border-slate-700/50"
                style={{ background: 'linear-gradient(90deg, rgba(249,115,22,0.06) 0%, transparent 100%)' }}>
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-orange-500/15 rounded-lg border border-orange-500/20">
                        <Repeat className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-[clamp(13px,3.8vw,15px)] font-black text-white">Sürekli Kapatılan Saatler</h2>
                            {closures.length > 0 && (
                                <span className="text-[clamp(9px,2.5vw,11px)] font-black text-orange-400 bg-orange-500/15 border border-orange-500/20 rounded-full px-2 py-0.5 leading-none">
                                    {closures.length}
                                </span>
                            )}
                        </div>
                        <p className="text-[clamp(9px,2.5vw,11px)] text-slate-400 mt-0.5">
                            Dashboard'dan "Sürekli Kapat" ile işaretlenen haftalık sabit rezervasyonlar
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4">
                {closures.length > 0 ? (
                    <div className="space-y-2">
                        {closures.map((closure) => (
                            <div key={closure.id}
                                className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
                                <div className="flex-1 min-w-0">
                                    <div className="text-white font-bold text-[clamp(13px,3.5vw,15px)]">
                                        Her {DAY_LABELS[closure.dayOfWeek] || closure.dayOfWeek}
                                    </div>
                                    <div className="text-orange-400 font-mono font-black text-[clamp(12px,3.2vw,14px)] mt-0.5">
                                        {closure.startTime} – {closure.endTime}
                                    </div>
                                    {closure.team && (
                                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                            <Users className="w-3 h-3 text-emerald-400 shrink-0" />
                                            {[closure.team, closure.opponentTeam].filter(Boolean).map((t, i) => (
                                                <React.Fragment key={t!.id}>
                                                    {i > 0 && <span className="text-slate-500 font-black italic text-[10px]">VS</span>}
                                                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/25 rounded-full pl-0.5 pr-2 py-0.5">
                                                        <img
                                                            src={teamLogoSrc(t)}
                                                            alt={t!.name}
                                                            className="w-4 h-4 rounded-full object-cover"
                                                            onError={(e) => { const el = e.currentTarget; el.onerror = null; el.src = teamInitialsAvatar(t!.name); }}
                                                        />
                                                        <span className="text-emerald-300 text-[10px] font-bold truncate max-w-[90px]">{t!.name}</span>
                                                    </span>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRemove(closure.id)}
                                    disabled={disabled || removingClosureId === closure.id}
                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center py-8 bg-slate-900/40 rounded-xl border border-dashed border-slate-700/60">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-3">
                            <Repeat className="w-6 h-6 text-slate-500" />
                        </div>
                        <p className="text-slate-400 text-sm font-bold mb-1">Henüz sürekli kapatılan bir saat yok</p>
                        <p className="text-slate-600 text-[clamp(10px,2.8vw,12px)] text-center max-w-[240px]">
                            Dashboard'da bir saat slotuna tıklayıp "Sürekli Kapat" seçeneğini kullanarak ekleyebilirsiniz
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
