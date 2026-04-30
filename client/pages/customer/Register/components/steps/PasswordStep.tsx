import React from 'react';
import { Lock } from 'lucide-react';

const scrollInputIntoView = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
};

interface PasswordStepProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    fieldErrors: Record<string, string>;
}

export const PasswordStep: React.FC<PasswordStepProps> = ({ formData, handleChange, fieldErrors }) => {
    const passwordError = fieldErrors.password;
    const confirmError = fieldErrors.confirmPassword;

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Şifre Oluştur</h2>
                <p className="text-slate-400 text-sm">En az 6 karakterden oluşan güvenli bir şifre belirle</p>
            </div>
            <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${passwordError ? 'text-red-400' : 'text-slate-400'}`}>
                    Şifre
                </label>
                <div className="relative">
                    <Lock className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${passwordError ? 'text-red-400' : 'text-slate-500'}`} />
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        onFocus={scrollInputIntoView}
                        className={`w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border transition-colors focus:outline-none font-bold ${
                            passwordError ? 'border-red-500 focus:border-red-400' : 'border-slate-700 focus:border-turf-500'
                        }`}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        required
                    />
                </div>
                {passwordError && (
                    <p className="text-red-400 text-xs font-bold ml-1 mt-1 animate-fade-in">{passwordError}</p>
                )}
            </div>
            <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${confirmError ? 'text-red-400' : 'text-slate-400'}`}>
                    Şifre Tekrar
                </label>
                <div className="relative">
                    <Lock className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${confirmError ? 'text-red-400' : 'text-slate-500'}`} />
                    <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        onFocus={scrollInputIntoView}
                        className={`w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border transition-colors focus:outline-none font-bold ${
                            confirmError ? 'border-red-500 focus:border-red-400' : 'border-slate-700 focus:border-turf-500'
                        }`}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        required
                    />
                </div>
                {confirmError && (
                    <p className="text-red-400 text-xs font-bold ml-1 mt-1 animate-fade-in">{confirmError}</p>
                )}
            </div>
        </div>
    );
};
