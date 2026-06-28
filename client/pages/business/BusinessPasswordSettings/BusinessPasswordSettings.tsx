import React from 'react';
import { ArrowLeft, KeyRound, Save, Check, X, ShieldCheck } from 'lucide-react';
import { useKeyboardHeight } from '../../../utils/useKeyboardHeight';
import { useBusinessPassword } from './hooks/useBusinessPassword';
import { PasswordField } from './components/PasswordField';
import { PasswordStrengthMeter } from './components/PasswordStrengthMeter';
import {
    pageTitle, pageSubtitle, primaryButton, cardPad, helperText, noticeText,
} from '../shared/formStyles';

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
            <div className="bg-slate-900/95 backdrop-blur-md z-20 border-b border-slate-800 px-4 py-4 flex items-center gap-3">
                <button
                    onClick={() => navigate('/business/settings')}
                    className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center shrink-0">
                    <KeyRound className="w-5 h-5 text-orange-400" />
                </div>
                <div className="min-w-0">
                    <h1 className="font-bold text-white leading-tight truncate" style={pageTitle}>Şifre Değiştir</h1>
                    <p className="text-slate-500 truncate" style={pageSubtitle}>Güvenlik ayarlarınızı güncelleyin</p>
                </div>
            </div>

            <div
                className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
                <div
                    className="px-4 py-5 space-y-4"
                    style={{ minHeight: 'calc(100% + 1px)', paddingBottom: `calc(${keyboardHeight}px + env(safe-area-inset-bottom) + 1.25rem)` }}
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
