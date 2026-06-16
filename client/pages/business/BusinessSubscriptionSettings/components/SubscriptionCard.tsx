import React from 'react';
import { CreditCard } from 'lucide-react';
import { formatPrice } from '../utils';

interface SubscriptionCardProps {
    subscription: any;
    planLabel: string;
    status: string | null;
    statusLabel: Record<string, string>;
    statusColor: Record<string, string>;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
    subscription, planLabel, status, statusLabel, statusColor,
}) => (
    <div className="bg-slate-800 rounded-3xl border border-slate-700 p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                    <p className="font-bold text-white">{planLabel} Plan</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                        {subscription.pitchCount ?? 0} saha limiti
                    </p>
                </div>
            </div>
            {status === 'trial' ? (
                <span
                    className="text-[11px] font-black px-3 py-1.5 rounded-xl shrink-0 tracking-widest uppercase"
                    style={{
                        background: 'linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(30,27,75,0.92) 100%)',
                        border: '1px solid rgba(139,92,246,0.5)',
                        boxShadow: '0 0 14px rgba(139,92,246,0.28), inset 0 1px 0 rgba(255,255,255,0.06)',
                        color: '#c4b5fd',
                    }}
                >
                    {statusLabel[status]}
                </span>
            ) : (
                <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border shrink-0 ${statusColor[status ?? ''] ?? 'text-slate-400 bg-slate-700 border-slate-600'}`}>
                    {statusLabel[status ?? ''] ?? 'Bilinmiyor'}
                </span>
            )}
        </div>

        <div className="border-t border-slate-700/50 pt-4 space-y-2.5">
            {subscription.trialEndsAt && status === 'trial' && (
                <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Deneme bitiş</span>
                    <span className="text-white text-sm font-medium">
                        {new Date(subscription.trialEndsAt).toLocaleDateString('tr-TR', {
                            day: 'numeric', month: 'long', year: 'numeric',
                        })}
                    </span>
                </div>
            )}
            {subscription.expiresAt && status === 'active' && (
                <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Yenileme tarihi</span>
                    <span className="text-white text-sm font-medium">
                        {new Date(subscription.expiresAt).toLocaleDateString('tr-TR', {
                            day: 'numeric', month: 'long', year: 'numeric',
                        })}
                    </span>
                </div>
            )}
            {subscription.pricePerMonth > 0 && (
                <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Aylık ücret</span>
                    <span className="text-white text-sm font-bold">
                        {formatPrice(Number(subscription.pricePerMonth))}
                    </span>
                </div>
            )}
        </div>
    </div>
);
