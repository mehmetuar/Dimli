import React, { useState } from 'react';
import { Mail, Calendar } from 'lucide-react';
import { BirthDatePickerModal } from '../BirthDatePickerModal';

const MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const formatBirthDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return '';
    return `${d} ${MONTHS[m - 1]} ${y}`;
};

const scrollInputIntoView = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
};

interface BirthDateEmailStepProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    fieldErrors: Record<string, string>;
}

export const BirthDateEmailStep: React.FC<BirthDateEmailStepProps> = ({ formData, handleChange, fieldErrors }) => {
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const error = fieldErrors.birthDate;

    const handleBirthDateSelect = (date: string) => {
        handleChange({
            target: { name: 'birthDate', value: date }
        } as React.ChangeEvent<HTMLInputElement>);
    };

    // Başlık layout header'ında; kök animasyonu layout'un keyed animate-step-in'i üstlenir.
    return (
        <div className="space-y-4">
            <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${error ? 'text-red-400' : 'text-slate-400'}`}>
                    Doğum Tarihi
                </label>
                <button
                    type="button"
                    onClick={() => setIsDatePickerOpen(true)}
                    className={`w-full flex items-center gap-3 bg-slate-800/40 pl-4 pr-4 py-4 rounded-2xl border transition-colors text-left
                        ${error
                            ? 'border-red-500 hover:border-red-400'
                            : formData.birthDate
                                ? 'border-slate-700/80 hover:border-turf-500'
                                : 'border-slate-700/80 hover:border-turf-500 border-dashed'
                        }`}
                >
                    <Calendar className={`w-5 h-5 shrink-0 ${error ? 'text-red-400' : formData.birthDate ? 'text-turf-500' : 'text-slate-500'}`} />
                    <span className={`font-bold text-sm ${error ? 'text-red-400' : formData.birthDate ? 'text-white' : 'text-slate-500'}`}>
                        {formData.birthDate ? formatBirthDate(formData.birthDate) : 'Doğum Tarihinizi Seçin'}
                    </span>
                </button>
                {error && (
                    <p className="text-red-400 text-xs font-bold ml-1 mt-1 animate-fade-in">{error}</p>
                )}
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">E-posta (İsteğe Bağlı)</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onFocus={scrollInputIntoView}
                        className="w-full bg-slate-800/40 text-white pl-12 pr-4 py-4 rounded-2xl border border-slate-700/80 focus:border-turf-500 focus:shadow-neon-sm focus:outline-none font-bold"
                        placeholder="ornek@email.com"
                        autoComplete="email"
                    />
                </div>
            </div>

            <BirthDatePickerModal
                isOpen={isDatePickerOpen}
                onClose={() => setIsDatePickerOpen(false)}
                onSelect={handleBirthDateSelect}
                selectedDate={formData.birthDate}
            />
        </div>
    );
};
