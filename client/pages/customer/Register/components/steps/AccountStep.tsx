import React from 'react';
import { User, Lock } from 'lucide-react';

interface AccountStepProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export const AccountStep: React.FC<AccountStepProps> = ({ formData, handleChange }) => {
    return (
        <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Hesap Bilgileri</h2>
                <p className="text-slate-400 text-sm">Giriş yapmak için kullanacağın bilgiler</p>
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
                        required
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Şifre</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        placeholder="••••••••"
                        required
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Şifre Tekrar</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        placeholder="••••••••"
                        required
                    />
                </div>
            </div>
        </div>
    );
};
