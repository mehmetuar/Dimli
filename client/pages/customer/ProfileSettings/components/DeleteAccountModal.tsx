import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, ChevronRight, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useKeyboardHeight } from '../../../../utils/useKeyboardHeight';
import { DELETION_REASONS as REASONS } from '../../../../utils/deletionReasons';

interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string, note: string, password: string) => Promise<void>;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedReason, setSelectedReason] = useState('');
    const [note, setNote] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Capacitor Keyboard plugin ile klavye yüksekliğini al (iOS + Android uyumlu)
    const keyboardHeight = useKeyboardHeight();

    const scrollRef = useRef<HTMLDivElement>(null);
    const noteRef = useRef<HTMLTextAreaElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    // Modal kapanınca sıfırla
    useEffect(() => {
        if (!isOpen) {
            setStep(1); setSelectedReason(''); setNote('');
            setPassword(''); setError(''); setLoading(false);
        }
    }, [isOpen]);

    // Adım değişince scroll'u en üste al
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 });
    }, [step]);

    if (!isOpen) return null;

    const handleClose = () => {
        setStep(1); setSelectedReason(''); setNote(''); setPassword(''); setError('');
        onClose();
    };

    const handleNext = () => {
        if (!selectedReason) { setError('Lütfen bir sebep seçin.'); return; }
        setError('');
        setStep(2);
    };

    const handleDelete = async () => {
        if (!password.trim()) { setError('Şifrenizi girin.'); return; }
        setError('');
        setLoading(true);
        try {
            await onConfirm(selectedReason, note, password);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Şifre hatalı veya bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // Klavye açıldıktan sonra input'u modal scroll container içinde ortala
    const focusScroll = (ref: React.RefObject<HTMLElement>) => {
        setTimeout(() => {
            ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    };

    return (
        // paddingBottom: keyboardHeight → backdrop tam ekran kalır (klavye arkasına kadar örter), kart klavyenin üstüne taşınır
        <div
            className="fixed inset-0 z-50 flex items-center justify-center px-5 bg-black/70 backdrop-blur-sm"
            style={keyboardHeight > 0 ? { paddingBottom: keyboardHeight } : undefined}
        >
            <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-slate-700/60 shadow-2xl flex flex-col overflow-hidden max-h-[92%]">
                {/* Header — asla kaydırılmaz */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-800 flex-shrink-0">
                    <h2 className="font-bold text-white text-lg">
                        {step === 1 ? 'Hesabı Sil' : 'Son Onay'}
                    </h2>
                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Kaydırılabilir içerik */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto">

                    {step === 1 ? (
                        <div className="px-5 py-4 space-y-3">
                            <p className="text-slate-400 text-sm">Hesabını silmek isteme sebebini seçer misin?</p>

                            {REASONS.map(r => (
                                <button
                                    key={r.key}
                                    onClick={() => { setSelectedReason(r.key); setError(''); }}
                                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                                        selectedReason === r.key
                                            ? 'border-red-500/60 bg-red-500/10 text-white'
                                            : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                                    }`}
                                >
                                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                        selectedReason === r.key ? 'border-red-500 bg-red-500' : 'border-slate-600'
                                    }`}>
                                        {selectedReason === r.key && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className="text-sm font-medium">{r.label}</span>
                                </button>
                            ))}

                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold mb-1.5 block">Not (isteğe bağlı)</label>
                                <textarea
                                    ref={noteRef}
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    onFocus={() => focusScroll(noteRef)}
                                    placeholder="Eklemek istediğin bir şey var mı?"
                                    rows={2}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl text-white text-sm p-3 resize-none focus:outline-none focus:border-slate-500 placeholder-slate-600"
                                />
                            </div>

                            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                            <div className="flex gap-3 pb-3">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-3.5 rounded-xl border border-slate-700 text-slate-400 font-bold text-sm hover:bg-slate-800 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="flex-1 py-3.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                                >
                                    Devam Et <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="px-5 py-4 space-y-4">
                            <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-4 flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-red-400 font-bold text-sm mb-1">Bu işlem geri alınamaz</p>
                                    <ul className="text-slate-400 text-xs space-y-0.5 list-disc list-inside">
                                        <li>Profil bilgilerin ve istatistiklerin</li>
                                        <li>Tüm maç geçmişin</li>
                                        <li>Sohbetlerin ve mesajların</li>
                                        <li>Takım üyeliğin</li>
                                    </ul>
                                    <p className="text-red-400 text-xs mt-1.5 font-medium">kalıcı olarak silinecek.</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold mb-1.5 block">
                                    Onaylamak için şifreni gir
                                </label>
                                <div className="relative">
                                    <input
                                        ref={passwordRef}
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => { setPassword(e.target.value); setError(''); }}
                                        onFocus={() => focusScroll(passwordRef)}
                                        placeholder="Şifren"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl text-white p-3.5 pr-12 focus:outline-none focus:border-red-500/50 placeholder-slate-600 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                            <div className="flex gap-3 pb-3">
                                <button
                                    onClick={() => { setStep(1); setError(''); setPassword(''); }}
                                    className="flex-1 py-3.5 rounded-xl border border-slate-700 text-slate-400 font-bold text-sm hover:bg-slate-800 transition-colors"
                                >
                                    Geri
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={loading || !password.trim()}
                                    className="flex-1 py-3.5 rounded-xl bg-red-700 hover:bg-red-600 disabled:bg-red-900/50 disabled:text-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
                                >
                                    {loading
                                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        : <><Trash2 className="w-4 h-4" /> Kalıcı Olarak Sil</>
                                    }
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
