import React from 'react';
import { ArrowLeft, KeyRound, Save, Check, X, ShieldCheck } from 'lucide-react';
import { useKeyboardHeight } from '../../../utils/useKeyboardHeight';
import { useBusinessPassword } from './hooks/useBusinessPassword';
import { PasswordField } from './components/PasswordField';
import { PasswordStrengthMeter } from './components/PasswordStrengthMeter';
import {
    pageTitle, pageSubtitle, primaryButton, cardPad, helperText, noticeText,
} from '../shared/formStyles';
import { CorporateGridBackground } from '../../../components/UI/CorporateGridBackground';

export const BusinessPasswordSettings: React.FC = () => {
    const {
        navigate,
        formData,
        handleChange,
        showCurrent, setShowCurrent,
        showNew, setShowNew,
        showConfirm, setShowConfirm,
        saving,
        success,
        error,
        strength,
        lengthOk,
        isMatch,
        isValid,
        minLength,
        handleSubmit,
    } = useBusinessPassword();

    const keyboardHeight = useKeyboardHeight();
    const confirmFilled = formData.confirmPassword.length > 0;

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {/* Header */}
            <div 
                className="relative shrink-0 px-4 pt-4 pb-5 border-b border-orange-500/10 overflow-hidden"
                style={{ background: 'radial-gradient(circle at top right, #1e293b 0%, #0f172a 100%)', boxShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
            >
                <CorporateGridBackground />
                <div className="relative z-10 flex items-center gap-3">
                    <button
                        onClick={() => navigate('/business/settings')}
                        className="w-10 h-10 bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0 shadow-lg"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-11 h-11 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(249,115,22,0.15)] relative">
                        <div className="absolute inset-0 rounded-xl bg-orange-400/10 blur-md" />
                        <KeyRound className="relative z-10 w-5 h-5 text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="font-black text-white text-[clamp(18px,5vw,22px)] leading-tight truncate drop-shadow-sm">Şifre Değiştir</h1>
                        <p className="text-[clamp(11px,3vw,13px)] text-slate-400 font-medium truncate">Güvenlik ayarlarınızı güncelleyin</p>
                    </div>
                </div>
            </div>

            <div
                className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
                <div
                    className="px-4 py-5 space-y-4"
                    style={{
                        minHeight: 'calc(100% + 1px)',
                        // Klavye açıkken kb navDp'yi zaten içerir (§102) — safe-bottom EKLENMEZ (çift sayım)
                        paddingBottom: keyboardHeight > 0
                            ? `calc(${keyboardHeight}px + env(safe-area-inset-bottom) + 1.25rem)`
                            : 'calc(var(--safe-bottom) + 1.25rem)',
                    }}
                >
                    {success && (
                        <div className="p-4 bg-green-600/20 border border-green-500/40 rounded-2xl text-green-400 font-semibold text-center flex items-center justify-center gap-2" style={noticeText}>
                            <ShieldCheck className="w-4 h-4 shrink-0" /> Şifreniz başarıyla güncellendi!
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 font-semibold text-center" style={noticeText}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-lg space-y-4" style={cardPad}>
                            <PasswordField
                                id="currentPassword"
                                label="Mevcut Şifre"
                                value={formData.currentPassword}
                                onChange={(v) => handleChange('currentPassword', v)}
                                show={showCurrent}
                                onToggleShow={() => setShowCurrent(!showCurrent)}
                                autoComplete="current-password"
                            />

                            <div className="border-t border-slate-700/50" />

                            <div>
                                <PasswordField
                                    id="newPassword"
                                    label="Yeni Şifre"
                                    value={formData.newPassword}
                                    onChange={(v) => handleChange('newPassword', v)}
                                    show={showNew}
                                    onToggleShow={() => setShowNew(!showNew)}
                                    autoComplete="new-password"
                                />
                                <PasswordStrengthMeter
                                    strength={strength}
                                    lengthOk={lengthOk}
                                    minLength={minLength}
                                    visible={formData.newPassword.length > 0}
                                />
                            </div>

                            <div>
                                <PasswordField
                                    id="confirmPassword"
                                    label="Yeni Şifre (Tekrar)"
                                    value={formData.confirmPassword}
                                    onChange={(v) => handleChange('confirmPassword', v)}
                                    show={showConfirm}
                                    onToggleShow={() => setShowConfirm(!showConfirm)}
                                    autoComplete="new-password"
                                    invalid={confirmFilled && !isMatch}
                                />
                                {confirmFilled && (
                                    <div
                                        className={`mt-2 flex items-center gap-1.5 font-semibold ${isMatch ? 'text-green-400' : 'text-red-400'}`}
                                        style={helperText}
                                    >
                                        {isMatch
                                            ? <Check className="w-3.5 h-3.5 shrink-0" />
                                            : <X className="w-3.5 h-3.5 shrink-0" />}
                                        <span>{isMatch ? 'Şifreler eşleşiyor' : 'Şifreler eşleşmiyor'}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving || !isValid}
                            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-white rounded-2xl font-bold transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2.5"
                            style={primaryButton}
                        >
                            {saving
                                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <Save className="w-5 h-5" />}
                            {saving ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
