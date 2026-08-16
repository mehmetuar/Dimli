import React from 'react';
import { Mail, Send, CheckCircle2, AlertCircle, History } from 'lucide-react';
import { useKeyboardHeight } from '../../../utils/useKeyboardHeight';
import { fieldLabel, fieldTextarea, primaryButton, noticeText, labelBaseClass } from '../shared/formStyles';
import { BUSINESS_SUPPORT_CATEGORIES, SUPPORT_EMAIL } from '../../../services/supportService';
import { TicketHistoryList } from '../../../components/Support/TicketHistoryList';
import { SupportHeader } from './components/SupportHeader';
import { useBusinessSupport } from './hooks/useBusinessSupport';

const MAX_MESSAGE_LENGTH = 2000;

export const BusinessSupport: React.FC = () => {
    const {
        navigate,
        category, setCategory,
        message, setMessage,
        submitting, submitted, error,
        canSubmit, submit, resetForm,
        tickets, loadingTickets,
    } = useBusinessSupport();

    const keyboardHeight = useKeyboardHeight();

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <SupportHeader navigate={navigate} />

            <div
                className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
                <div
                    className="px-4 py-5 space-y-6"
                    style={{
                        // Klavye açıkken kb navDp'yi zaten içerir (§102) — safe-bottom EKLENMEZ (çift sayım)
                        paddingBottom: keyboardHeight > 0
                            ? `calc(${keyboardHeight}px + env(safe-area-inset-bottom) + 1.25rem)`
                            : 'calc(var(--safe-bottom) + 1.25rem)',
                    }}
                >
                    {/* ── Alternatif iletişim ─────────────────────────────── */}
                    <a
                        href={`mailto:${SUPPORT_EMAIL}`}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 active:scale-[0.98] transition-all"
                    >
                        <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0">
                            <Mail className="w-5 h-5 text-rose-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-white font-bold text-sm">E-posta ile ulaşın</p>
                            <p className="text-rose-300 text-xs font-semibold truncate">{SUPPORT_EMAIL}</p>
                        </div>
                    </a>

                    {/* ── Yeni talep / başarı paneli ──────────────────────── */}
                    {submitted ? (
                        <div className="p-6 bg-emerald-600/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
                            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                            <p className="text-emerald-300 font-bold" style={noticeText}>Talebiniz alındı!</p>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                En kısa sürede size dönüş yapacağız. Yanıtımızı bildirim olarak alacaksınız;
                                aşağıdaki Taleplerim bölümünden de takip edebilirsiniz.
                            </p>
                            <button
                                onClick={resetForm}
                                className="text-rose-300 text-sm font-bold underline underline-offset-4"
                            >
                                Yeni talep oluştur
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className={`${labelBaseClass} mb-2`} style={fieldLabel}>Konu</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {BUSINESS_SUPPORT_CATEGORIES.map(cat => (
                                        <button
                                            key={cat.key}
                                            type="button"
                                            onClick={() => setCategory(cat.key)}
                                            className={`px-3 py-3 rounded-xl border text-sm font-bold transition-all active:scale-[0.97] ${
                                                category === cat.key
                                                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                                                    : 'bg-slate-900 border-slate-700 text-slate-400'
                                            }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={`${labelBaseClass} mb-2`} style={fieldLabel}>Açıklama</label>
                                <textarea
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    maxLength={MAX_MESSAGE_LENGTH}
                                    rows={5}
                                    placeholder="Sorununuzu ya da öneriyi detaylıca anlatın..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl text-white font-medium p-3.5 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors placeholder:text-slate-600 resize-none"
                                    style={fieldTextarea}
                                />
                                <p className="text-right text-slate-600 text-[11px] mt-1">{message.length}/{MAX_MESSAGE_LENGTH}</p>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3.5 bg-red-600/10 border border-red-500/30 rounded-xl text-red-400 font-semibold" style={noticeText}>
                                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                                </div>
                            )}

                            <button
                                onClick={submit}
                                disabled={!canSubmit}
                                className="w-full bg-rose-500 hover:bg-rose-600 active:scale-95 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2.5"
                                style={primaryButton}
                            >
                                {submitting
                                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <Send className="w-5 h-5" />}
                                {submitting ? 'Gönderiliyor...' : 'Gönder'}
                            </button>
                        </div>
                    )}

                    {/* ── Taleplerim ──────────────────────────────────────── */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <History className="w-4 h-4 text-slate-500" />
                            <h2 className={labelBaseClass} style={fieldLabel}>Taleplerim</h2>
                        </div>
                        <TicketHistoryList
                            tickets={tickets}
                            loading={loadingTickets}
                            categories={BUSINESS_SUPPORT_CATEGORIES}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
