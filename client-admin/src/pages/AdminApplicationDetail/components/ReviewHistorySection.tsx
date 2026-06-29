import React from 'react';
import { IconClock, IconCheck, IconX, IconPending } from '../../../components/Icons';
import Section from './Section';

interface ReviewEvent {
    action: 'submitted' | 'rejected' | 'resubmitted' | 'approved';
    at: string;
    reason?: string;
    by?: string;
}

const CONFIG: Record<
    ReviewEvent['action'],
    { label: string; Icon: React.FC<{ size?: number; className?: string }>; color: string }
> = {
    submitted: { label: 'Başvuru oluşturuldu', Icon: IconPending, color: 'text-slate-400' },
    rejected: { label: 'Reddedildi', Icon: IconX, color: 'text-red-400' },
    resubmitted: { label: 'Tekrar onaya gönderildi', Icon: IconClock, color: 'text-orange-400' },
    approved: { label: 'Onaylandı', Icon: IconCheck, color: 'text-emerald-400' },
};

interface Props {
    history: ReviewEvent[];
    createdAt?: string;
}

const ReviewHistorySection: React.FC<Props> = ({ history, createdAt }) => {
    // Geçmiş kronolojik (eski→yeni) saklanır. 'submitted' yoksa createdAt'tan sentezle.
    const events = [...(history ?? [])];
    if (!events.some(e => e.action === 'submitted') && createdAt) {
        events.unshift({ action: 'submitted', at: createdAt });
    }
    // En yeni üstte
    const ordered = [...events].reverse();

    if (ordered.length === 0) return null;

    const resubmitCount = events.filter(e => e.action === 'resubmitted').length;

    return (
        <Section title="İnceleme Geçmişi" icon={<IconClock size={13} />}>
            {resubmitCount > 0 && (
                <p className="text-orange-300/90 text-xs font-bold mb-3">
                    Bu başvuru {resubmitCount}. kez onaya gönderildi.
                </p>
            )}
            <ol className="space-y-3">
                {ordered.map((e, i) => {
                    const cfg = CONFIG[e.action] ?? CONFIG.submitted;
                    const { Icon } = cfg;
                    return (
                        <li key={i} className="flex items-start gap-3">
                            <span className={`mt-0.5 shrink-0 ${cfg.color}`}>
                                <Icon size={14} />
                            </span>
                            <div className="min-w-0">
                                <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
                                <p className="text-slate-500 text-xs">
                                    {new Date(e.at).toLocaleString('tr-TR')}
                                </p>
                                {e.action === 'rejected' && e.reason && (
                                    <p className="text-red-300/90 text-sm mt-1 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                                        {e.reason}
                                    </p>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </Section>
    );
};

export default ReviewHistorySection;
