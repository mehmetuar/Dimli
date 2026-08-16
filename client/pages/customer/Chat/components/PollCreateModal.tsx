import React, { useRef, useState } from 'react';
import { X, Plus, BarChart3, Loader2, AlertTriangle } from 'lucide-react';
import api from '../../../../services/api';
import { KeyboardAwareModal } from '../../../../components/Modals/KeyboardAwareModal';
import { Switch } from '../../../../components/UI/Switch';

interface PollCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    channelId: string | null;
    // Başarılı POST sonrası PollView useChat'in polls haritasına merge edilir
    onCreated: (poll: any) => void;
}

const MAX_OPTIONS = 10;
const TITLE_MAX = 200;

interface OptionRow {
    id: number;
    text: string;
}

// Kaptan/yardımcının kendi aramızda maç sohbetinde WhatsApp tarzı anket
// oluşturma modalı. §105: kabuk KeyboardAwareModal (klavye maxHeight telafisi
// dahil — elle overlay kopyası kaldırıldı); backdrop'a onClose BİLEREK verilmez,
// yazılmış anket yanlış dokunuşla kaybolmasın (kapatma yalnız X).
export const PollCreateModal: React.FC<PollCreateModalProps> = (props) => {
    if (!props.isOpen) return null;
    return <PollCreateModalContent {...props} />;
};

const PollCreateModalContent: React.FC<PollCreateModalProps> = ({ onClose, channelId, onCreated }) => {
    const [title, setTitle] = useState('');
    // §105: stable id'li satırlar — index key silmede input state'ini kaydırıyordu
    const nextIdRef = useRef(2);
    const [options, setOptions] = useState<OptionRow[]>([
        { id: 0, text: '' },
        { id: 1, text: '' },
    ]);
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const filledOptions = options.map(o => o.text.trim()).filter(Boolean);
    const canSubmit = !!title.trim() && filledOptions.length >= 2 && !isSubmitting;

    const updateOption = (id: number, value: string) => {
        setOptions(prev => prev.map(o => (o.id === id ? { ...o, text: value } : o)));
    };

    const removeOption = (id: number) => {
        setOptions(prev => (prev.length > 2 ? prev.filter(o => o.id !== id) : prev));
    };

    const addOption = () => {
        setOptions(prev =>
            prev.length < MAX_OPTIONS ? [...prev, { id: nextIdRef.current++, text: '' }] : prev,
        );
    };

    const handleSubmit = async () => {
        if (!canSubmit || !channelId) return;
        setIsSubmitting(true);
        setErrorMessage('');
        try {
            const res = await api.post(`/chat/channels/${channelId}/polls`, {
                title: title.trim(),
                options: filledOptions,
                allowMultiple,
            });
            onCreated(res.data);
            onClose();
        } catch (error: any) {
            setErrorMessage(error.response?.data?.message || 'Anket oluşturulamadı.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAwareModal
            isOpen
            zClassName="z-[75]"
            backdropClassName="bg-black/85 backdrop-blur-sm animate-fade-in"
            panelClassName="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl shadow-turf-500/10 animate-scale-in"
            maxHeightClassName="max-h-[88vh]"
            bodyClassName="p-5"
            header={
                <div className="p-5 border-b border-slate-700 bg-slate-900 flex justify-between items-center">
                    <div>
                        <h2 className="font-sport font-black text-xl text-white italic uppercase tracking-wide flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-turf-500" />
                            ANKET <span className="text-turf-500">OLUŞTUR</span>
                        </h2>
                        <p className="text-slate-400 text-[11px] mt-1">Takımına soru sor, oyları topla</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            }
            footer={
                <div className="p-4 border-t border-slate-700 bg-slate-900">
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className={`w-full font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all ${
                            canSubmit
                                ? 'bg-turf-600 hover:bg-turf-500 text-white shadow-lg shadow-turf-600/20'
                                : 'bg-slate-800 text-slate-500 opacity-60'
                        }`}
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                        Anketi Başlat
                    </button>
                </div>
            }
        >
            {errorMessage && (
                <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p className="font-bold text-sm">{errorMessage}</p>
                </div>
            )}

            {/* Soru */}
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Soru</label>
            <div className="bg-slate-900 rounded-xl border border-slate-700 focus-within:border-turf-500 transition-colors">
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={TITLE_MAX}
                    placeholder="Beyler maç yapalım mı?"
                    className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none"
                />
            </div>
            <p className="text-[11px] text-slate-500 tabular-nums text-right mt-1 mb-4">
                {title.length}/{TITLE_MAX}
            </p>

            {/* Seçenekler */}
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Seçenekler</label>
            <div className="flex flex-col gap-2">
                {options.map((option, index) => (
                    <div key={option.id} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 text-[11px] font-bold text-slate-400 flex items-center justify-center shrink-0">
                            {index + 1}
                        </div>
                        <div className="flex-1 bg-slate-900 rounded-xl border border-slate-700 focus-within:border-turf-500 transition-colors">
                            <input
                                type="text"
                                value={option.text}
                                onChange={e => updateOption(option.id, e.target.value)}
                                maxLength={100}
                                placeholder={`${index + 1}. seçenek`}
                                className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none"
                            />
                        </div>
                        {options.length > 2 && (
                            <button
                                onClick={() => removeOption(option.id)}
                                className="p-2 text-slate-500 active:text-red-400 hover:text-red-400 transition-colors shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
            {options.length < MAX_OPTIONS && (
                <button
                    onClick={addOption}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 border border-dashed border-slate-600 rounded-xl py-2.5 text-xs font-semibold text-turf-400 active:bg-slate-900/60 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Seçenek Ekle
                </button>
            )}

            {/* Çoklu seçim anahtarı */}
            <div className="mt-4 w-full flex items-center justify-between gap-3 bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3">
                <div className="min-w-0">
                    <p className="text-sm text-slate-200">Birden fazla yanıta izin ver</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        Katılımcılar birden fazla seçenek işaretleyebilir
                    </p>
                </div>
                <Switch
                    checked={allowMultiple}
                    onChange={setAllowMultiple}
                    ariaLabel="Birden fazla yanıta izin ver"
                />
            </div>
        </KeyboardAwareModal>
    );
};
