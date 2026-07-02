import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { PositionPickerModal } from '../../../../../components/UI/PositionPickerModal';
import { CountryPickerModal } from '../../../../../components/UI/CountryPickerModal';
import { Flag } from '../../../../../components/UI/Flag';
import { getCountryName } from '../../../../../data/countries';

interface PlayerProfileStepProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    fieldErrors: Record<string, string>;
}

export const PlayerProfileStep: React.FC<PlayerProfileStepProps> = ({ formData, handleChange, fieldErrors }) => {
    const [picker, setPicker] = useState<{
        open: boolean; field: 'position' | 'secondaryPosition'; title: string; allowEmpty: boolean;
    }>({ open: false, field: 'position', title: '', allowEmpty: false });
    const [countryPickerOpen, setCountryPickerOpen] = useState(false);
    const nationality = formData.nationality || 'TR';

    const openPicker = (field: 'position' | 'secondaryPosition') =>
        setPicker({ open: true, field, title: field === 'position' ? 'Mevki Seç' : 'Yedek Mevki Seç', allowEmpty: field === 'secondaryPosition' });

    const handleSelect = (val: string) => {
        handleChange({ target: { name: picker.field, value: val } } as any);
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Oyuncu Profili</h2>
                <p className="text-slate-400 text-sm">Saha içindeki özelliklerin</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mevki</label>
                    <button
                        type="button"
                        onClick={() => openPicker('position')}
                        className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl px-4 py-4 text-left font-bold text-white flex items-center justify-between hover:border-slate-600 transition-colors"
                    >
                        <span className="text-sm">{formData.position || 'Seç...'}</span>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Yedek Mevki</label>
                    <button
                        type="button"
                        onClick={() => openPicker('secondaryPosition')}
                        className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl px-4 py-4 text-left font-bold flex items-center justify-between hover:border-slate-600 transition-colors"
                    >
                        <span className={`text-sm ${formData.secondaryPosition ? 'text-white' : 'text-slate-500'}`}>
                            {formData.secondaryPosition || 'Seçiniz'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                <div className="mt-2 col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Kullandığı Ayak</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['Sağ', 'Sol', 'Her İkisi'].map(opt => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => handleChange({ target: { name: 'foot', value: opt } } as any)}
                                className={`py-3 rounded-xl font-bold text-sm transition-all ${
                                    formData.foot === opt
                                        ? 'bg-turf-600 text-white shadow-lg'
                                        : 'bg-slate-900 text-slate-400 border-2 border-slate-700 hover:border-slate-500'
                                }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Uyruk</label>
                    <button
                        type="button"
                        onClick={() => setCountryPickerOpen(true)}
                        className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl px-4 py-4 text-left font-bold text-white flex items-center justify-between hover:border-slate-600 transition-colors"
                    >
                        <span className="flex items-center gap-2 min-w-0">
                            <Flag code={nationality} />
                            <span className="text-sm truncate">{getCountryName(nationality)}</span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    </button>
                </div>
            </div>

            <PositionPickerModal
                isOpen={picker.open}
                title={picker.title}
                value={picker.field === 'position' ? formData.position : formData.secondaryPosition}
                allowEmpty={picker.allowEmpty}
                excludeKey={picker.field === 'secondaryPosition' ? formData.position : formData.secondaryPosition || undefined}
                onSelect={handleSelect}
                onClose={() => setPicker(p => ({ ...p, open: false }))}
            />

            <CountryPickerModal
                isOpen={countryPickerOpen}
                value={nationality}
                onSelect={code => handleChange({ target: { name: 'nationality', value: code } } as any)}
                onClose={() => setCountryPickerOpen(false)}
            />
        </div>
    );
};
