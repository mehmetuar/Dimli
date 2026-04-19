import React from 'react';
import { User } from 'lucide-react';

interface NameStepProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export const NameStep: React.FC<NameStepProps> = ({ formData, handleChange }) => {
    return (
        <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Adın Nedir?</h2>
                <p className="text-slate-400 text-sm">Diğer oyuncuların seni tanıması için gerçek adını gir</p>
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
                        autoComplete="name"
                        required
                    />
                </div>
            </div>
        </div>
    );
};
