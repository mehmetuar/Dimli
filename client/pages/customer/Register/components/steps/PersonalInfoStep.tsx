import React, { useState } from 'react';
import { User, Phone, Calendar, Mail } from 'lucide-react';
import { BirthDatePickerModal } from '../../../../../components/Modals/BirthDatePickerModal';

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

interface PersonalInfoStepProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({ formData, handleChange }) => {
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const handleBirthDateSelect = (date: string) => {
        handleChange({
            target: { name: 'birthDate', value: date }
        } as React.ChangeEvent<HTMLInputElement>);
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Kişisel Bilgiler</h2>
                <p className="text-slate-400 text-sm">Seni daha yakından tanıyalım</p>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ad Soyad</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        placeholder="Adınız Soyadınız"
                        required
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Telefon Numarası</label>
                <div className="relative">
                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        placeholder="0555 555 55 55"
                        required
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Doğum Tarihi</label>
                <button
                    type="button"
                    onClick={() => setIsDatePickerOpen(true)}
                    className={`w-full flex items-center gap-3 bg-slate-900 pl-4 pr-4 py-4 rounded-xl border transition-colors text-left
                        ${formData.birthDate
                            ? 'border-slate-700 hover:border-turf-500'
                            : 'border-slate-700 hover:border-turf-500 border-dashed'
                        }`}
                >
                    <Calendar className={`w-5 h-5 shrink-0 ${formData.birthDate ? 'text-turf-500' : 'text-slate-500'}`} />
                    <span className={`font-bold text-sm ${formData.birthDate ? 'text-white' : 'text-slate-500'}`}>
                        {formData.birthDate ? formatBirthDate(formData.birthDate) : 'Doğum Tarihinizi Seçin'}
                    </span>
                </button>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email (İsteğe Bağlı)</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        placeholder="ornek@email.com"
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
