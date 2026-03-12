import React from 'react';
import { User, Phone, Calendar, Mail } from 'lucide-react';

interface PersonalInfoStepProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({ formData, handleChange }) => {
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
                <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="date"
                        name="birthDate"
                        value={formData.birthDate}
                        onChange={handleChange}
                        className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        required
                    />
                </div>
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
        </div>
    );
};
