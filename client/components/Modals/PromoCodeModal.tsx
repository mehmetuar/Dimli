import React from 'react';
import { Ticket, X } from 'lucide-react';
import { KeyboardAwareModal } from './KeyboardAwareModal';

interface PromoCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    code: string;
    setCode: (v: string) => void;
    loading: boolean;
    /** Hata mesajı (geçersiz kod / sunucu hatası). Boşsa gösterilmez. */
    error?: string;
    submitLabel?: string;
    /** Kod gönderimi. true dönerse modal kendini kapatır. */
    onSubmit: () => Promise<boolean>;
}

/**
 * Davet/partner kodu girişi için merkezî, klavye-uyumlu modal (KeyboardAwareModal).
 * Inline input mobilde klavyenin arkasında kalıyordu; bu modal klavye açılınca
 * kartı klavyenin üstüne ortalar. Kayıt akışı + Abonelik Ayarları ortak kullanır.
 * Apple 3.1.1 dili — yalnız "davet kodu / erişim", kupon/indirim/ödeme YOK.
 */
export const PromoCodeModal: React.FC<PromoCodeModalProps> = ({
    isOpen, onClose, code, setCode, loading, error, submitLabel = 'Uygula', onSubmit,
}) => {
    const submit = async () => {
        if (!code.trim() || loading) return;
        const ok = await onSubmit();
        if (ok) onClose();
    };

    return (
        <KeyboardAwareModal
            isOpen={isOpen}
            onClose={loading ? undefined : onClose}
            portalToBody
            zClassName="z-[80]"
            panelClassName="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl"
            bodyClassName="p-6"
            header={
                <div className="flex items-center justify-between px-6 pt-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
                            <Ticket className="w-5 h-5 text-sky-300" />
                        </div>
                        <h2 className="font-black text-white text-lg">Davet Kodu</h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-white transition-colors disabled:opacity-40"
                        aria-label="Kapat"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            }
        >
            <p className="text-slate-400 text-sm mb-4">
                İş ortaklarımızdan aldığın bir davet kodun varsa buraya gir.
            </p>

            <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                placeholder="DIMLI-XXXXXXXX"
                autoFocus
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-2xl px-4 py-3.5 text-white placeholder-slate-600 font-mono tracking-wide text-center focus:outline-none focus:border-sky-500/60"
            />

            {error && (
                <p className="text-red-400 text-xs font-bold mt-3 text-center">{error}</p>
            )}

            <button
                type="button"
                onClick={submit}
                disabled={loading || !code.trim()}
                className="w-full mt-5 bg-sky-700 hover:bg-sky-600 text-white py-3.5 rounded-2xl font-black text-sm transition-all disabled:opacity-50"
            >
                {loading ? 'Uygulanıyor…' : submitLabel}
            </button>
        </KeyboardAwareModal>
    );
};
