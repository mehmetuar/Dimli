import React, { useState } from 'react';
import { Trash2, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

interface DeleteModalProps {
    visible: boolean;
    loading: boolean;
    onClose: () => void;
    onConfirm: (password: string) => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({ visible, loading, onClose, onConfirm }) => {
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');

    const handleClose = () => {
        setPassword('');
        setError('');
        onClose();
    };

    const handleSubmit = () => {
        if (!password.trim()) {
            setError('Şifrenizi girin.');
            return;
        }
        setError('');
        onConfirm(password);
    };

    if (!visible) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-sm rounded-3xl border border-red-500/20 shadow-2xl overflow-hidden">
                <div className="px-6 pt-6 pb-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Hesabı Sil</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Tüm işletme, saha ve verileriniz kalıcı olarak silinecek. Devam etmek için şifrenizi girin.
                    </p>
                </div>

                <div className="px-6 pb-2">
                    <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type={showPw ? 'text' : 'password'}
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                            placeholder="Şifrenizi girin"
                            className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl pl-10 pr-10 py-3.5 focus:outline-none focus:border-red-500/50 placeholder:text-slate-500"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPw(v => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                        >
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {error && <p className="text-red-400 text-xs mt-2 pl-1">{error}</p>}
                </div>

                <div className="flex gap-3 px-6 pt-4 pb-6">
                    <button
                        onClick={handleClose}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {loading ? 'Siliniyor…' : 'Evet, Sil'}
                    </button>
                </div>
            </div>
        </div>
    );
};
