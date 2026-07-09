import React, { useEffect, useState } from 'react';
import { Trash2, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { pitchTypeLabel } from '../../../../utils/pitchType';

interface PitchSelectionModalProps {
    visible: boolean;
    pitches: any[];
    requiredCount: number;
    effectiveDateLabel?: string;
    loading: boolean;
    conflict: { pitchId: string; conflicts: any[] } | null;
    onClose: () => void;
    onConfirm: (selectedIds: string[]) => void;
}

export const PitchSelectionModal: React.FC<PitchSelectionModalProps> = ({
    visible, pitches, requiredCount, effectiveDateLabel, loading, conflict, onClose, onConfirm,
}) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        if (visible) setSelectedIds([]);
    }, [visible]);

    if (!visible) return null;

    const toggle = (id: string) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (prev.length >= requiredCount) return prev;
            return [...prev, id];
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-sm rounded-3xl border border-red-500/20 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
                <div className="px-6 pt-6 pb-4 text-center shrink-0">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Saha Seçimi Gerekli</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Yeni planınız {requiredCount === 1 ? '1 saha' : `${requiredCount} saha`} daha az kapasiteye sahip. Kaldırılacak {requiredCount === 1 ? 'sahayı' : 'sahaları'} seçin.
                        {' '}Seçilen {requiredCount === 1 ? 'saha' : 'sahalar'}, plan düşürme onaylandığında pasife alınır ve{effectiveDateLabel ? ` ${effectiveDateLabel} tarihinde` : ' fatura dönemi sonunda'} otomatik silinir; o tarihe kadar dilerseniz ayarlardan tekrar aktifleştirebilirsiniz.
                    </p>
                    <p className="text-orange-400 text-xs font-bold mt-2">
                        {selectedIds.length} / {requiredCount} seçildi
                    </p>
                </div>

                <div className="px-4 pb-2 space-y-2 overflow-y-auto flex-1">
                    {pitches.map((pitch) => {
                        const isSelected = selectedIds.includes(pitch.id);
                        const isDisabled = !isSelected && selectedIds.length >= requiredCount;
                        const hasConflict = conflict?.pitchId === pitch.id;
                        return (
                            <div key={pitch.id}>
                                <button
                                    onClick={() => !isDisabled && toggle(pitch.id)}
                                    disabled={isDisabled}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left
                                        ${isSelected
                                            ? 'bg-red-500/10 border-red-500/40'
                                            : isDisabled
                                                ? 'bg-slate-800/40 border-slate-700/40 opacity-50'
                                                : 'bg-slate-800 border-slate-700/60 hover:border-slate-500'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0
                                        ${isSelected ? 'bg-red-500 border-red-500' : 'border-slate-500'}`}>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-white truncate">{pitch.name}</p>
                                        <p className="text-slate-400 text-xs mt-0.5">
                                            {pitchTypeLabel(pitch.type)}
                                        </p>
                                    </div>
                                    {pitch.approvalStatus === 'pending' && (
                                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg border bg-orange-500/10 text-orange-400 border-orange-500/25 shrink-0">
                                            Onay Bekliyor
                                        </span>
                                    )}
                                </button>

                                {hasConflict && (
                                    <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-2">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                            <p className="text-red-300 text-xs leading-relaxed">
                                                Bu sahada plan geçiş tarihinden sonrasına kesinleşmiş maçlar var, bu saha kaldırılamıyor. Lütfen başka bir saha seçin.
                                            </p>
                                        </div>
                                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                            {conflict!.conflicts.map((c: any, i: number) => (
                                                <div key={i} className="bg-slate-900 px-3 py-2 rounded-lg border border-slate-700">
                                                    <p className="text-xs font-bold text-white">
                                                        {new Date(c.slotTime).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                        {' — '}
                                                        {new Date(c.slotTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">{c.teamName}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex gap-3 px-6 pt-4 pb-6 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={() => onConfirm(selectedIds)}
                        disabled={selectedIds.length !== requiredCount || loading}
                        className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {loading ? 'İşleniyor…' : 'Devam Et'}
                    </button>
                </div>
            </div>
        </div>
    );
};
