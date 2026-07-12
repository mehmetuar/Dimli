import React from 'react';
import { Loader2, Inbox, MessageCircleReply } from 'lucide-react';
import { SupportTicket, SupportCategory, getSupportCategoryLabel } from '../../services/supportService';

// İşletme + kullanıcı destek sayfalarının ortak "Taleplerim" listesi.
// İki feature tarafından kullanıldığı için components/ altında (bkz. CLAUDE.md yerleşim kuralı).

const STATUS_CHIP: Record<SupportTicket['status'], { label: string; cls: string }> = {
    pending:  { label: 'Beklemede',  cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    answered: { label: 'Yanıtlandı', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    reviewed: { label: 'İncelendi',  cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
};

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('tr-TR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

interface TicketHistoryListProps {
    tickets: SupportTicket[];
    loading: boolean;
    categories: SupportCategory[];
}

export const TicketHistoryList: React.FC<TicketHistoryListProps> = ({ tickets, loading, categories }) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
            </div>
        );
    }

    if (tickets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-800/80 flex items-center justify-center mb-3">
                    <Inbox className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-slate-400 font-bold text-sm">Henüz destek talebiniz yok</p>
                <p className="text-slate-600 text-xs mt-1">Gönderdiğiniz talepler burada listelenir.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {tickets.map(ticket => {
                const chip = STATUS_CHIP[ticket.status];
                return (
                    <div key={ticket.id} className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-bold text-sm">
                                {getSupportCategoryLabel(ticket.category, categories)}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${chip.cls}`}>
                                {chip.label}
                            </span>
                            <span className="ml-auto text-slate-600 text-[10px]">{fmtDate(ticket.createdAt)}</span>
                        </div>
                        <p className="text-slate-400 text-xs mt-2 leading-relaxed whitespace-pre-wrap">{ticket.message}</p>

                        {ticket.adminReply && (
                            <div className="mt-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <MessageCircleReply className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400 text-[11px] font-bold">Dimli Destek</span>
                                    {ticket.repliedAt && (
                                        <span className="ml-auto text-slate-600 text-[10px]">{fmtDate(ticket.repliedAt)}</span>
                                    )}
                                </div>
                                <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">{ticket.adminReply}</p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
