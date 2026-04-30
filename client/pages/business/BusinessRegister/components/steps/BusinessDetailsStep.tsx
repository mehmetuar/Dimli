import React from 'react';
import { Input } from '../RegisterSidebar';

interface BusinessDetailsStepProps {
    formData: any;
    updateBusiness: (field: string, value: any) => void;
    setIsTimePickerOpen: (opts: any) => void;
    fieldErrors?: Record<string, string>;
}

export const BusinessDetailsStep: React.FC<BusinessDetailsStepProps> = ({
    formData,
    updateBusiness,
    setIsTimePickerOpen,
    fieldErrors = {},
}) => {
    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg md:text-xl font-bold text-white mb-4">İşletme Detayları</h2>

            <div className="grid grid-cols-1 gap-4">
                <Input
                    label="İşletme Adı"
                    value={formData.business.name}
                    onChange={(e: any) => updateBusiness('name', e.target.value)}
                    required
                    error={fieldErrors['business.name']}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400 font-bold uppercase ml-1">Açılış Saati</label>
                    <button
                        type="button"
                        onClick={() => setIsTimePickerOpen({ open: true, type: 'OPEN' })}
                        className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-left hover:border-orange-500 transition-all font-mono font-bold text-sm min-h-[44px]"
                    >
                        {formData.business.openTime}
                    </button>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400 font-bold uppercase ml-1">Kapanış Saati</label>
                    <button
                        type="button"
                        onClick={() => setIsTimePickerOpen({ open: true, type: 'CLOSE' })}
                        className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-left hover:border-orange-500 transition-all font-mono font-bold text-sm min-h-[44px]"
                    >
                        {formData.business.closeTime}
                    </button>
                </div>
            </div>

            <p className="text-xs text-slate-500 mt-1">
                Konum bilgisi (şehir, ilçe ve adres) bir sonraki adımda harita üzerinden seçilecektir.
            </p>
        </div>
    );
};
