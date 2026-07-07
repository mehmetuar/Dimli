import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookmarkPlus, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { PresetNote } from '../../../../services/presetNotes';
import { CharCountTextarea } from '../../../../components/UI/CharCountTextarea';
import { NOTE_CHAR_LIMITS } from '../../../../utils/noteLimits';

interface DashboardActionModalsProps {
    targetReservationId: string | null;
    actionType: 'APPROVE' | 'SEND_NOTE' | null;
    note: string;
    setNote: (note: string) => void;
    setTargetReservationId: (id: string | null) => void;
    setActionType: (type: 'APPROVE' | 'SEND_NOTE' | null) => void;
    handleTransaction: () => void;
    processing: boolean;
    presetNotes: PresetNote[];
    savePresetFromNote: (content: string) => Promise<{ ok: boolean; message: string }>;
}

export const DashboardActionModals: React.FC<DashboardActionModalsProps> = ({
    targetReservationId,
    actionType,
    note,
    setNote,
    setTargetReservationId,
    setActionType,
    handleTransaction,
    processing,
    presetNotes,
    savePresetFromNote,
}) => {
    const navigate = useNavigate();
    const [showPicker, setShowPicker] = useState(false);
    const [savingPreset, setSavingPreset] = useState(false);
    const [presetFeedback, setPresetFeedback] = useState<{ ok: boolean; message: string } | null>(null);

    if (!targetReservationId || !actionType) return null;

    const close = () => {
        setTargetReservationId(null);
        setActionType(null);
        setNote('');
        setShowPicker(false);
        setPresetFeedback(null);
    };

    const handleSavePreset = async () => {
        if (savingPreset) return;
        setSavingPreset(true);
        setPresetFeedback(null);
        const result = await savePresetFromNote(note);
        setPresetFeedback(result);
        setSavingPreset(false);
        setTimeout(() => setPresetFeedback(null), 2500);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
            <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 p-6 animate-scale-in max-h-[88vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-white mb-2 text-center">
                    {actionType === 'APPROVE' ? 'Rezervasyonu Onayla' : 'Takımlara Not Gönder'}
                </h3>

                <p className="text-slate-400 text-sm text-center mb-4">
                    {actionType === 'APPROVE'
                        ? 'Onay mesajıyla birlikte takımlara bir not iletmek ister misiniz?'
                        : 'Maç sahiplerinin göreceği bir not girin.'}
                </p>

                {/* Hazır notlardan seç */}
                {presetNotes.length > 0 ? (
                    <div className="mb-3">
                        <button
                            onClick={() => setShowPicker((s) => !s)}
                            className="w-full flex items-center justify-between bg-slate-900/70 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 active:scale-[0.99] transition-all"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <span className="font-semibold">Hazır notlardan seç</span>
                            {showPicker ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </button>
                        {showPicker && (
                            <div className="mt-2 max-h-40 overflow-y-auto space-y-1.5 pr-0.5">
                                {presetNotes.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            // Hazır not 100 karakteri aşarsa kırp (preset 500 char olabilir)
                                            setNote(p.content.slice(0, NOTE_CHAR_LIMITS.business));
                                            setShowPicker(false);
                                        }}
                                        className="w-full text-left bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-[13px] text-slate-200 leading-relaxed active:scale-[0.99] transition-all"
                                        style={{ WebkitTapHighlightColor: 'transparent' }}
                                    >
                                        {p.content}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-[11px] text-slate-500 text-center mb-3 leading-relaxed">
                        Henüz hazır notun yok. Aşağıya yazıp <span className="text-slate-300 font-semibold">"Bu notu kaydet"</span> ile ekleyebilirsin.
                    </p>
                )}

                <CharCountTextarea
                    value={note}
                    onChange={setNote}
                    placeholder="Örn: Lütfen 15 dk erken gelin (Opsiyonel)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-orange-500 min-h-[100px] resize-none"
                    maxChars={NOTE_CHAR_LIMITS.business}
                />

                {/* Bu notu kaydet + Notları Yönet */}
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={handleSavePreset}
                        disabled={savingPreset || !note.trim()}
                        className="flex items-center gap-1.5 text-[13px] font-semibold text-indigo-300 disabled:text-slate-600 disabled:cursor-not-allowed active:scale-95 transition-all"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <BookmarkPlus className="w-4 h-4" />
                        {savingPreset ? 'Kaydediliyor...' : 'Bu notu kaydet'}
                    </button>
                    <button
                        onClick={() => { close(); navigate('/business/settings/preset-notes'); }}
                        className="flex items-center gap-1 text-[12px] font-medium text-slate-400 active:scale-95 transition-all"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <Settings2 className="w-3.5 h-3.5" />
                        Notları Yönet
                    </button>
                </div>

                {presetFeedback && (
                    <p className={`text-[12px] text-center -mt-2 mb-3 font-semibold ${presetFeedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                        {presetFeedback.message}
                    </p>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={close}
                        className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-600 transition-colors"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={handleTransaction}
                        disabled={processing}
                        className="flex-1 bg-orange-600 text-white font-bold py-3 rounded-xl hover:bg-orange-500 transition-colors shadow-lg shadow-orange-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? 'İşleniyor...' : (actionType === 'APPROVE' ? 'Onayla ve Gönder' : 'Gönder')}
                    </button>
                </div>
            </div>
        </div>
    );
};
