import React from 'react';
import { Input } from '../RegisterSidebar';

interface BusinessDetailsStepProps {
    formData: any;
    updateBusiness: (field: string, value: any) => void;
    setLocationModalStep: (step: 'CITY' | 'DISTRICT') => void;
    setIsLocationModalOpen: (open: boolean) => void;
    setIsTimePickerOpen: (opts: any) => void;
}

export const BusinessDetailsStep: React.FC<BusinessDetailsStepProps> = ({
    formData,
    updateBusiness,
    setLocationModalStep,
    setIsLocationModalOpen,
    setIsTimePickerOpen
}) => {
    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-4">İşletme Detayları</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="İşletme Adı" value={formData.business.name} onChange={(e: any) => updateBusiness('name', e.target.value)} required />
                <Input label="İşletme Telefonu" value={formData.business.phone} onChange={(e: any) => updateBusiness('phone', e.target.value)} required />

                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400 font-bold uppercase ml-1">Şehir *</label>
                        <button
                            type="button"
                            onClick={() => {
                                setLocationModalStep('CITY');
                                setIsLocationModalOpen(true);
                            }}
                            className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-left hover:border-orange-500 transition-all font-medium"
                        >
                            {formData.business.city || "Şehir Seç..."}
                        </button>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400 font-bold uppercase ml-1">İlçe *</label>
                        <button
                            type="button"
                            disabled={!formData.business.city}
                            onClick={() => {
                                setLocationModalStep('DISTRICT');
                                setIsLocationModalOpen(true);
                            }}
                            className={`w-full border p-3 rounded-xl text-left transition-all font-medium ${!formData.business.city
                                ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                                : 'bg-slate-800 border-slate-700 text-white hover:border-orange-500'
                                }`}
                        >
                            {formData.business.district || "İlçe Seç..."}
                        </button>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <Input label="Açık Adres" value={formData.business.address} onChange={(e: any) => updateBusiness('address', e.target.value)} required textarea />
                </div>

                <div className="grid grid-cols-2 gap-2 md:col-span-2">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400 font-bold uppercase ml-1">Açılış Saati</label>
                        <button
                            type="button"
                            onClick={() => setIsTimePickerOpen({ open: true, type: 'OPEN' })}
                            className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-left hover:border-orange-500 transition-all font-mono font-bold"
                        >
                            {formData.business.openTime}
                        </button>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400 font-bold uppercase ml-1">Kapanış Saati</label>
                        <button
                            type="button"
                            onClick={() => setIsTimePickerOpen({ open: true, type: 'CLOSE' })}
                            className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-left hover:border-orange-500 transition-all font-mono font-bold"
                        >
                            {formData.business.closeTime}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
