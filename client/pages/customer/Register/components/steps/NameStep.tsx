import React from 'react';
import { User } from 'lucide-react';

const scrollInputIntoView = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
};

interface NameStepProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    fieldErrors: Record<string, string>;
}

export const NameStep: React.FC<NameStepProps> = ({ formData, handleChange, fieldErrors }) => {
    const error = fieldErrors.full_name;
    // Başlık layout header'ında; kök animasyonu layout'un keyed animate-step-in'i üstlenir.
    return (
        <div className="space-y-4">
            <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${error ? 'text-red-400' : 'text-slate-400'}`}>
                    Ad Soyad
                </label>
                <div className="relative">
                    <User className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${error ? 'text-red-400' : 'text-slate-500'}`} />
                    <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        onFocus={scrollInputIntoView}
                        className={`w-full bg-slate-800/40 text-white pl-12 pr-4 py-4 rounded-2xl border transition-colors focus:outline-none font-bold ${
                            error ? 'border-red-500 focus:border-red-400' : 'border-slate-700/80 focus:border-turf-500 focus:shadow-neon-sm'
                        }`}
                        placeholder="Adınız Soyadınız"
                        autoComplete="name"
                        required
                    />
                </div>
                {error && (
                    <p className="text-red-400 text-xs font-bold ml-1 mt-1 animate-fade-in">{error}</p>
                )}
            </div>
        </div>
    );
};
