import React from 'react';
import { ChevronLeft, Mail, Send, CheckCircle2, AlertCircle, History } from 'lucide-react';
import { useKeyboardHeight } from '../../../utils/useKeyboardHeight';
import { USER_SUPPORT_CATEGORIES, SUPPORT_EMAIL } from '../../../services/supportService';
import { TicketHistoryList } from '../../../components/Support/TicketHistoryList';
import { useSupport } from './hooks/useSupport';

const MAX_MESSAGE_LENGTH = 2000;

export const SupportPage: React.FC = () => {
    const {
        navigate,
        category, setCategory,
        message, setMessage,
        submitting, submitted, error,
        canSubmit, submit, resetForm,
        tickets, loadingTickets,
    } = useSupport();

    const keyboardHeight = useKeyboardHeight();

    return (
        <div className="fixed inset-0 bg-pitch flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

            {/* Header */}
            <header className="bg-pitch/95 backdrop-blur-sm border-b border-slate-800/60">
                <div className="flex items-center gap-3 px-4 py-4 max-w-lg mx-auto">
                    <button
                        // -1 (pop): '/settings/account' push'u geçmişe yeni kayıt itiyor,
                        // donanım geri tuşu sonra Yardım'a "ileri" dönüyordu (geri döngüsü)
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="font-sport font-black text-2xl text-white italic tracking-wide uppercase">
                            Yardım
                        </h1>
                        <p className="text-slate-500 text-xs mt-0.5">Destek talebi oluştur, taleplerini takip et</p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                <div
                    className="max-w-lg mx-auto px-4 pt-5 space-y-6"
                    style={{ paddingBottom: `calc(${keyboardHeight}px + env(safe-area-inset-bottom) + 2.5rem)` }}
                >
                    {/* ── Alternatif iletişim ─────────────────────────────── */}
                    <a
                        href={`mailto:${SUPPORT_EMAIL}`}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 active:scale-[0.98] transition-all"
                    >
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                            <Mail className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-white font-bold text-sm">E-posta ile ulaşın</p>
                            <p className="text-purple-400 text-xs font-semibold truncate">{SUPPORT_EMAIL}</p>
                        </div>
                    </a>

                    {/* ── Yeni talep / başarı paneli ──────────────────────── */}
                    {submitted ? (
                        <div className="p-6 bg-turf-500/10 border border-turf-500/30 rounded-2xl text-center space-y-3">
                            <CheckCircle2 className="w-12 h-12 text-turf-400 mx-auto" />
                            <p className="text-turf-400 font-bold text-base">Talebin alındı!</p>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                En kısa sürede sana dönüş yapacağız. Yanıtımızı bildirim olarak alacaksın;
                                aşağıdaki Taleplerim bölümünden de takip edebilirsin.
                            </p>
                            <button
                                onClick={resetForm}
                                className="text-turf-400 text-sm font-bold underline underline-offset-4"
                            >
                                Yeni talep oluştur
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-slate-300 font-bold text-xs uppercase tracking-wide mb-2">Konu</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {USER_SUPPORT_CATEGORIES.map(cat => (
                                        <button
                                            key={cat.key}
                                            type="button"
                                            onClick={() => setCategory(cat.key)}
                                            className={`px-3 py-3 rounded-xl border text-sm font-bold transition-all active:scale-[0.97] ${
                                                category === cat.key
                                                    ? 'bg-turf-500/20 border-turf-500/50 text-turf-300'
                                                    : 'bg-slate-800/40 border-slate-700 text-slate-400'
                                            }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-300 font-bold text-xs uppercase tracking-wide mb-2">Açıklama</label>
                                <textarea
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    maxLength={MAX_MESSAGE_LENGTH}
                                    rows={5}
                                    placeholder="Sorununu ya da önerini detaylıca anlat..."
                                    className="w-full bg-slate-800/40 border border-slate-700 rounded-xl text-white font-medium p-3.5 text-sm focus:outline-none focus:border-turf-500 focus:ring-1 focus:ring-turf-500 transition-colors placeholder:text-slate-600 resize-none"
                                    style={{ minHeight: 'clamp(76px, 12vh, 110px)' }}
                                />
                                <p className="text-right text-slate-600 text-[11px] mt-1">{message.length}/{MAX_MESSAGE_LENGTH}</p>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3.5 bg-red-600/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-semibold">
                                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                                </div>
                            )}

                            <button
                                onClick={submit}
                                disabled={!canSubmit}
                                className="w-full bg-turf-500 hover:bg-turf-600 active:scale-95 disabled:opacity-50 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-turf-500/20 flex items-center justify-center gap-2.5"
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
                            <h2 className="text-slate-300 font-bold text-xs uppercase tracking-wide">Taleplerim</h2>
                        </div>
                        <TicketHistoryList
                            tickets={tickets}
                            loading={loadingTickets}
                            categories={USER_SUPPORT_CATEGORIES}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
