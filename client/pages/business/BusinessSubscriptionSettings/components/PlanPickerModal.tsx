import React from 'react';
import { X, ChevronRight } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { PLAN_ENTRIES, formatPrice } from '../utils';

interface PlanPickerModalProps {
    visible: boolean;
    currentPlanType?: string;
    loading: boolean;
    onClose: () => void;
    onSelect: (planType: string) => void;
}

export const PlanPickerModal: React.FC<PlanPickerModalProps> = ({
    visible, currentPlanType, loading, onClose, onSelect,
}) => {
    if (!visible) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-700/60">
                    <div>
                        <h3 className="font-bold text-lg text-white">Plan Seçin</h3>
                        <p className="text-slate-400 text-xs mt-0.5">İşletmenize uygun planı seçin</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                    {PLAN_ENTRIES.map(([key, plan]) => {
                        const isCurrent = currentPlanType === plan.planType;
                        return (
                            <button
                                key={key}
                                onClick={() => onSelect(plan.planType)}
                                disabled={loading}
                                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all active:scale-95
                                    ${isCurrent
                                        ? 'bg-emerald-500/10 border-emerald-500/40'
                                        : 'bg-slate-800 border-slate-700/60 hover:border-slate-500'
                                    }`}
                            >
                                <div className="text-left">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold text-sm ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                                            {plan.label}
                                        </span>
                                        {isCurrent && (
                                            <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                Mevcut
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-400 text-xs mt-0.5">{key} saha limiti</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={`font-bold text-sm ${isCurrent ? 'text-emerald-400' : 'text-orange-400'}`}>
                                        {formatPrice(plan.price)}<span className="font-normal text-xs">/ay</span>
                                    </span>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="px-5 pb-5 pt-2 space-y-2">
                    <p className="text-slate-500 text-[11px] text-center leading-relaxed">
                        {Capacitor.getPlatform() === 'ios'
                            ? 'Satın alma App Store üzerinden gerçekleşir.'
                            : 'Satın alma Android mağazası üzerinden gerçekleşir.'}
                    </p>
                    <p className="text-slate-600 text-[10px] text-center leading-relaxed">
                        Abonelik, dönem sonunda otomatik olarak yenilenir. İptal için dönem bitişinden en az 24 saat önce{' '}
                        {Capacitor.getPlatform() === 'ios' ? 'App Store' : 'Android Mağazası'} ayarlarından işlem yapmanız gerekir.
                    </p>
                    <div className="flex justify-center gap-3 pt-1">
                        <a
                            href="https://dimli.com.tr/kvkk"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 text-[10px] underline underline-offset-2"
                        >
                            Gizlilik Politikası
                        </a>
                        <span className="text-slate-700 text-[10px]">·</span>
                        <a
                            href="https://dimli.com.tr/kullanim-sartlari"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 text-[10px] underline underline-offset-2"
                        >
                            Kullanım Şartları
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
