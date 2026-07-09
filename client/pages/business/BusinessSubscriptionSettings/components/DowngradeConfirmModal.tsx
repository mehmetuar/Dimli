import React from 'react';
import { TrendingDown, Loader2 } from 'lucide-react';
import { formatPrice } from '../utils';

interface DowngradeConfirmModalProps {
    visible: boolean;
    targetPlanLabel: string;
    targetPlanPrice: number;
    effectiveDateLabel: string;
    removalCount?: number;
    loading: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const DowngradeConfirmModal: React.FC<DowngradeConfirmModalProps> = ({
    visible, targetPlanLabel, targetPlanPrice, effectiveDateLabel, removalCount = 0, loading, onClose, onConfirm,
}) => {
    if (!visible) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-sm rounded-3xl border border-orange-500/20 shadow-2xl overflow-hidden">
                <div className="px-6 pt-6 pb-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                        <TrendingDown className="w-8 h-8 text-orange-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Plan Düşürme Onayı</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Planınız <span className="text-white font-bold">{targetPlanLabel}</span> ({formatPrice(targetPlanPrice)}/ay) olarak değişecek.
                        Bu değişiklik, mevcut faturalama döneminizin sonunda{effectiveDateLabel ? ` (${effectiveDateLabel})` : ''} geçerli olacaktır.
                        O tarihe kadar mevcut planınızın tüm avantajlarından yararlanmaya devam edersiniz.
                    </p>
                    {removalCount > 0 && (
                        <p className="text-orange-300/90 text-xs leading-relaxed mt-3 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2.5 text-left">
                            Seçtiğiniz {removalCount === 1 ? 'saha' : `${removalCount} saha`}, onayınızla birlikte pasife alınacak; dilerseniz{effectiveDateLabel ? ` ${effectiveDateLabel} tarihine` : ' fatura dönemi sonuna'} kadar ayarlardan tekrar aktifleştirip rezervasyon almaya devam edebilirsiniz. {effectiveDateLabel ? `${effectiveDateLabel} tarihinde` : 'Fatura dönemi sonunda'} {removalCount === 1 ? 'saha' : 'sahalar'} otomatik olarak silinecektir ve bu tarih sonrası için rezervasyon kabul edilmez.
                        </p>
                    )}
                </div>
                <div className="flex gap-3 px-6 pt-2 pb-6">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {loading ? 'İşleniyor…' : 'Onayla'}
                    </button>
                </div>
            </div>
        </div>
    );
};
