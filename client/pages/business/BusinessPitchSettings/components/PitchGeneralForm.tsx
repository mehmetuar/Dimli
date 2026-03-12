import React from 'react';
import { Clock, TurkishLira } from 'lucide-react';
import { BusinessTimePickerModal } from '../../../../components/Modals/BusinessTimePickerModal';

interface PitchGeneralFormProps {
    formData: any;
    isTimePickerOpen: { open: boolean; type: 'OPEN' | 'CLOSE' | 'SLOT_START' | 'SLOT_END' };
    setIsTimePickerOpen: (state: any) => void;
    handleChange: (field: string, value: string) => void;
}

export const PitchGeneralForm: React.FC<PitchGeneralFormProps> = ({
    formData, isTimePickerOpen, setIsTimePickerOpen, handleChange
}) => {
    return (
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-4">
            <h2 className="text-lg font-bold text-orange-500 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" /> Genel Ayarlar
            </h2>

            <div>
                <label className="block text-sm font-bold mb-2 text-slate-300">Saatlik Ücret (TL)</label>
                <div className="relative">
                    <TurkishLira className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="number"
                        value={formData.pricePerHour}
                        onChange={(e) => handleChange('pricePerHour', e.target.value)}
                        className="w-full pl-10 p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold mb-2 text-slate-300">Açılış Saati</label>
                    <button type="button"
                        onClick={() => setIsTimePickerOpen({ open: true, type: 'OPEN' })}
                        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-left hover:border-orange-500 transition-all font-mono font-bold"
                    >
                        {formData.openTime}
                    </button>
                </div>
                <div>
                    <label className="block text-sm font-bold mb-2 text-slate-300">Kapanış Saati</label>
                    <button type="button"
                        onClick={() => setIsTimePickerOpen({ open: true, type: 'CLOSE' })}
                        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-left hover:border-orange-500 transition-all font-mono font-bold"
                    >
                        {formData.closeTime}
                    </button>
                </div>
            </div>

            <BusinessTimePickerModal
                isOpen={isTimePickerOpen.open && (isTimePickerOpen.type === 'OPEN' || isTimePickerOpen.type === 'CLOSE')}
                onClose={() => setIsTimePickerOpen({ ...isTimePickerOpen, open: false })}
                title={isTimePickerOpen.type === 'OPEN' ? "AÇILIŞ SAATİ" : "KAPANIŞ SAATİ"}
                initialTime={isTimePickerOpen.type === 'OPEN' ? formData.openTime : formData.closeTime}
                onSelect={(time) => {
                    if (isTimePickerOpen.type === 'OPEN') handleChange('openTime', time);
                    else handleChange('closeTime', time);
                }}
            />
        </div>
    );
};
