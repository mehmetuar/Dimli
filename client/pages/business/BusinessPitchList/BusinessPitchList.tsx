import React from 'react';
import { Goal, Clock, AlertTriangle } from 'lucide-react';
import { BusinessLoadingSpinner } from '../../../components/Business/BusinessLoadingSpinner';

// Hooks
import { useBusinessPitchList } from './hooks/useBusinessPitchList';

// Components
import { PitchListHeader } from './components/PitchListHeader';
import { PitchListItem } from './components/PitchListItem';

export const BusinessPitchList: React.FC = () => {
    const {
        navigate,
        loading,
        pitches,
        subscription,
        businessStatus,
    } = useBusinessPitchList();

    if (loading) return <BusinessLoadingSpinner fullScreen />;

    const isPending = businessStatus === 'pending';
    const isSuspended = businessStatus === 'suspended';

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <PitchListHeader
                navigate={navigate}
                pitchCount={pitches.length}
                subscription={subscription}
            />

            <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                <div className="p-4 space-y-3" style={{ minHeight: 'calc(100% + 1px)' }}>
                    {isSuspended && (
                        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 px-4 py-3.5 rounded-2xl">
                            <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
                            <div className="space-y-0.5">
                                <p className="text-red-300 text-[clamp(12px,3.5vw,14px)] font-bold">İşletmeniz Askıya Alındı</p>
                                <p className="text-red-200/70 text-[clamp(10px,2.8vw,12px)] leading-relaxed">
                                    Hesabınız yönetim ekibimiz tarafından askıya alınmıştır. Sahalarınız pasif durumdadır ve gösterilmemektedir.
                                </p>
                            </div>
                        </div>
                    )}

                    {isPending && (
                        <div className="flex items-start gap-3 bg-orange-500/10 border border-orange-500/30 px-4 py-3.5 rounded-2xl">
                            <Clock className="text-orange-400 shrink-0 mt-0.5" size={18} />
                            <div className="space-y-0.5">
                                <p className="text-orange-300 text-sm font-bold">Sahalarınız İnceleme Aşamasında</p>
                                <p className="text-orange-200/70 text-xs leading-relaxed">
                                    Sahalarınız onaylandığında işletmeniz yayına alınacak ve rezervasyon almaya başlayabileceksiniz. Onay süreci 1-2 iş günü sürmektedir.
                                </p>
                            </div>
                        </div>
                    )}

                    {pitches.map((pitch) => (
                        <PitchListItem
                            key={pitch.id}
                            pitch={pitch}
                            isPending={isPending}
                            isSuspended={isSuspended}
                            onClick={() => navigate(`/business/settings/pitches/${pitch.id}`)}
                        />
                    ))}

                    {pitches.length === 0 && (
                        <div className="text-center py-10 text-slate-500">
                            <Goal className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Henüz saha oluşturulmamış.</p>
                            <p className="text-xs text-slate-600 mt-1">Sahalar kayıt sırasında abonelik planınıza göre oluşturulur.</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};
