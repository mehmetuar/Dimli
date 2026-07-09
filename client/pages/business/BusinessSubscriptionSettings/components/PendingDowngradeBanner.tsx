import React from 'react';
import { Clock } from 'lucide-react';

interface PendingDowngradeBannerProps {
    subscription: any;
    pendingPlanInfo: { label: string } | null | undefined;
    scheduledPitchNames?: string[];
}

export const PendingDowngradeBanner: React.FC<PendingDowngradeBannerProps> = ({ subscription, pendingPlanInfo, scheduledPitchNames = [] }) => {
    if (!pendingPlanInfo) return null;
    return (
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl px-4 py-3.5">
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-orange-400" />
                </div>
                <p className="text-orange-300 text-sm leading-relaxed">
                    {subscription.pendingPlanEffectiveAt && (
                        <>{new Date(subscription.pendingPlanEffectiveAt).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric' })} tarihine kadar mevcut planınızı kullanabilirsiniz. </>
                    )}
                    Bu tarihten itibaren <span className="font-bold">{pendingPlanInfo.label}</span> planına geçeceksiniz.
                    {scheduledPitchNames.length > 0 && (
                        <> Bu tarihte <span className="font-bold">{scheduledPitchNames.join(', ')}</span> otomatik silinecektir; o zamana kadar dilerseniz ayarlardan tekrar aktifleştirebilirsiniz.</>
                    )}
                </p>
            </div>
        </div>
    );
};
