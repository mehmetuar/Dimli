import React from 'react';
import { User } from 'lucide-react';

interface UsernameStepProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export const UsernameStep: React.FC<UsernameStepProps> = ({ formData, handleChange }) => {
    return (
        <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Kullanıcı Adı</h2>
                <p className="text-slate-400 text-sm">Giriş yapmak için kullanacağın kullanıcı adın</p>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Kullanıcı Adı</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        placeholder="kullaniciadi"
                        autoComplete="username"
                        required
                    />
                </div>
            </div>
        </div>
    );
};
