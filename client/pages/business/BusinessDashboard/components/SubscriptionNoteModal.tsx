import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookmarkPlus, ChevronDown, ChevronUp, MessageSquare, Settings2, X } from 'lucide-react';
import { PresetNote } from '../../../../services/presetNotes';
import { CharCountTextarea } from '../../../../components/UI/CharCountTextarea';
import { NOTE_CHAR_LIMITS } from '../../../../utils/noteLimits';
import { KeyboardAwareModal } from '../../../../components/Modals/KeyboardAwareModal';

// İşletmenin abone (sabit rezervasyon) sohbetine not göndermesi. İçerik
// DashboardActionModals'ın SEND_NOTE dalıyla aynıdır (hazır not seçici + sayaçlı
// textarea); fark, KeyboardAwareModal sarmalayıcısıdır: klavye açılınca panel
// klavyenin üstüne hizalanır ve gövde kaydırılabilir olduğu için global
// useKeyboardScroll odaklanan textarea'yı görünür alana getirir.

interface SubscriptionNoteModalProps {
    isOpen: boolean;
    dayLabel: string;
    timeLabel: string;
    teamNames: string[];
    note: string;
    setNote: (note: string) => void;
    onClose: () => void;
    onSubmit: () => void;
    processing: boolean;
    presetNotes: PresetNote[];
    savePresetFromNote: (content: string) => Promise<{ ok: boolean; message: string }>;
}

export const SubscriptionNoteModal: React.FC<SubscriptionNoteModalProps> = ({
    isOpen,
    dayLabel,
    timeLabel,
    teamNames,
    note,
    setNote,
    onClose,
    onSubmit,
    processing,
    presetNotes,
    savePresetFromNote,
}) => {
    const navigate = useNavigate();
    const [showPicker, setShowPicker] = useState(false);
    const [savingPreset, setSavingPreset] = useState(false);
    const [presetFeedback, setPresetFeedback] = useState<{ ok: boolean; message: string } | null>(null);

    // Her açılışta yardımcı durumları sıfırla (not metni hook'ta yönetiliyor).
    useEffect(() => {
        if (!isOpen) return;
        setShowPicker(false);
        setPresetFeedback(null);
    }, [isOpen]);

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
        <KeyboardAwareModal
            isOpen={isOpen}
            onClose={onClose}
            portalToBody
            zClassName="z-[60]"
            panelClassName="bg-slate-800 w-full max-w-[420px] rounded-2xl border border-slate-700 shadow-2xl animate-scale-in"
            bodyClassName="px-[clamp(1rem,4vw,1.375rem)] pb-[clamp(1rem,4vw,1.375rem)]"
            maxHeightClassName="max-h-[85vh]"
            header={
                <div className="flex justify-between items-start p-[clamp(1rem,4vw,1.375rem)] pb-3">
                    <div className="min-w-0">
                        <h3 className="text-[clamp(1.05rem,5vw,1.25rem)] font-black text-white leading-tight flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-orange-400 shrink-0" />
                            Abone Takıma Not
                        </h3>
                        <p className="text-slate-400 text-[clamp(0.72rem,3.2vw,0.8rem)] font-medium mt-0.5 truncate">
                            Her {dayLabel} {timeLabel}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-700/50 rounded-full hover:bg-slate-600 text-slate-300 hover:text-white transition-colors shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            }
            footer={
                <div className="flex gap-3 px-[clamp(1rem,4vw,1.375rem)] pb-[clamp(1rem,4vw,1.375rem)] pt-1">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-600 transition-colors"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={processing || !note.trim()}
                        className="flex-1 bg-orange-600 text-white font-bold py-3 rounded-xl hover:bg-orange-500 transition-colors shadow-lg shadow-orange-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? 'Gönderiliyor...' : 'Gönder'}
                    </button>
                </div>
            }
        >
            <p className="text-slate-400 text-[12px] leading-relaxed mb-3">
                {teamNames.length > 0
                    ? `${teamNames.join(' ve ')} takımının abone sohbetine düşecek bir not gönderin.`
                    : 'Abone sohbetine düşecek bir not gönderin.'}
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
                placeholder="Örn: Bu hafta saha bakımda, 15 dk geç başlayacağız."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-orange-500 min-h-[100px] resize-none"
                maxChars={NOTE_CHAR_LIMITS.business}
            />

            {/* Bu notu kaydet + Notları Yönet */}
            <div className="flex items-center justify-between">
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
                    onClick={() => { onClose(); navigate('/business/settings/preset-notes'); }}
                    className="flex items-center gap-1 text-[12px] font-medium text-slate-400 active:scale-95 transition-all"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    <Settings2 className="w-3.5 h-3.5" />
                    Notları Yönet
                </button>
            </div>

            {presetFeedback && (
                <p className={`text-[12px] text-center mt-2 font-semibold ${presetFeedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                    {presetFeedback.message}
                </p>
            )}
        </KeyboardAwareModal>
    );
};
