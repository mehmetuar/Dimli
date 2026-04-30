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
    return (
        <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Adın Nedir?</h2>
                <p className="text-slate-400 text-sm">Diğer oyuncuların seni tanıması için gerçek adını gir</p>
            </div>
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
                        className={`w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border transition-colors focus:outline-none font-bold ${
                            error ? 'border-red-500 focus:border-red-400' : 'border-slate-700 focus:border-turf-500'
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
