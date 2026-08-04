import React, { useState } from 'react';
import { X, Plus, BarChart3, Loader2 } from 'lucide-react';
import api from '../../../../services/api';
import { useModalBodyClass } from '../../../../utils/useModalBodyClass';
import { useKeyboardHeight } from '../../../../utils/useKeyboardHeight';

interface PollCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    channelId: string | null;
    // Başarılı POST sonrası PollView useChat'in polls haritasına merge edilir
    onCreated: (poll: any) => void;
}

const MAX_OPTIONS = 10;

// Kaptan/yardımcının kendi aramızda maç sohbetinde WhatsApp tarzı anket
// oluşturma modalı (Seçenekler → "Anket Oluştur"). Kabuk: KendiAramizdaNewMatchModal.
export const PollCreateModal: React.FC<PollCreateModalProps> = (props) => {
    useModalBodyClass(props.isOpen);
    if (!props.isOpen) return null;
    return <PollCreateModalContent {...props} />;
};

const PollCreateModalContent: React.FC<PollCreateModalProps> = ({ onClose, channelId, onCreated }) => {
    const [title, setTitle] = useState('');
    const [options, setOptions] = useState<string[]>(['', '']);
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const keyboardHeight = useKeyboardHeight();

    const filledOptions = options.map(o => o.trim()).filter(Boolean);
    const canSubmit = !!title.trim() && filledOptions.length >= 2 && !isSubmitting;

    const updateOption = (index: number, value: string) => {
        setOptions(prev => prev.map((o, i) => (i === index ? value : o)));
    };

    const removeOption = (index: number) => {
        setOptions(prev => prev.filter((_, i) => i !== index));
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
        // Klavye açıkken backdrop'a paddingBottom — modal klavyenin üstünde kalır
        // (proje kuralı: bottom değil paddingBottom, arka plan sızmasın)
        <div
            className="fixed inset-0 z-[75] flex items-center justify-center px-4 bg-black/85 backdrop-blur-sm animate-fade-in"
            style={keyboardHeight > 0 ? { paddingBottom: keyboardHeight } : undefined}
        >
            <div className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl shadow-turf-500/10 overflow-hidden flex flex-col max-h-[88vh] animate-scale-in">

                {/* Header */}
                <div className="p-5 border-b border-slate-700 bg-slate-900 sticky top-0 z-10 flex justify-between items-center">
                    <div>
                        <h2 className="font-sport font-black text-xl text-white italic uppercase tracking-wide flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-turf-500" />
                            ANKET <span className="text-turf-500">OLUŞTUR</span>
                        </h2>
                        <p className="text-slate-400 text-[10px] mt-0.5">Takımına soru sor, oyları topla</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto flex-1">
                    {errorMessage && (
                        <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in">
                            <X className="w-5 h-5 flex-shrink-0" />
                            <p className="font-bold text-sm">{errorMessage}</p>
                        </div>
                    )}

                    {/* Başlık */}
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Soru</label>
                    <div className="bg-slate-900 rounded-xl border border-slate-700 focus-within:border-turf-500 transition-colors mb-5">
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            maxLength={200}
                            placeholder="Beyler maç yapalım mı?"
                            className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none"
                        />
                    </div>

                    {/* Seçenekler */}
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Seçenekler</label>
                    <div className="flex flex-col gap-2">
                        {options.map((option, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-900 rounded-xl border border-slate-700 focus-within:border-turf-500 transition-colors">
                                    <input
                                        type="text"
                                        value={option}
                                        onChange={e => updateOption(index, e.target.value)}
                                        maxLength={100}
                                        placeholder={`${index + 1}. seçenek`}
                                        className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none"
                                    />
                                </div>
                                {options.length > 2 && (
                                    <button
                                        onClick={() => removeOption(index)}
                                        className="p-2 text-slate-500 hover:text-red-400 transition-colors shrink-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    {options.length < MAX_OPTIONS && (
                        <button
                            onClick={() => setOptions(prev => [...prev, ''])}
                            className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-turf-400 active:text-turf-300 py-1.5"
                        >
                            <Plus className="w-4 h-4" /> Seçenek Ekle
                        </button>
                    )}

                    {/* Çoklu seçim anahtarı */}
                    <button
                        onClick={() => setAllowMultiple(prev => !prev)}
                        className="mt-4 w-full flex items-center justify-between bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3"
                    >
                        <span className="text-sm text-slate-200">Birden fazla yanıta izin ver</span>
                        <span
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${allowMultiple ? 'bg-turf-600' : 'bg-slate-700'}`}
                        >
                            <span
                                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${allowMultiple ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                        </span>
                    </button>
                </div>

                {/* Footer */}
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
            </div>
        </div>
    );
};
