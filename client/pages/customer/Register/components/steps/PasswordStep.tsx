import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

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
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Başlık layout header'ında; kök animasyonu layout'un keyed animate-step-in'i üstlenir.
    return (
        <div className="space-y-4">
            <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${passwordError ? 'text-red-400' : 'text-slate-400'}`}>
                    Şifre
                </label>
                <div className="relative">
                    <Lock className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${passwordError ? 'text-red-400' : 'text-slate-500'}`} />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        onFocus={scrollInputIntoView}
                        className={`w-full bg-slate-800/40 text-white pl-12 pr-12 py-4 rounded-2xl border transition-colors focus:outline-none font-bold ${
                            passwordError ? 'border-red-500 focus:border-red-400' : 'border-slate-700/80 focus:border-turf-500 focus:shadow-neon-sm'
                        }`}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 ${passwordError ? 'text-red-400' : 'text-slate-500 active:text-slate-300'}`}
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
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
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        onFocus={scrollInputIntoView}
                        className={`w-full bg-slate-800/40 text-white pl-12 pr-12 py-4 rounded-2xl border transition-colors focus:outline-none font-bold ${
                            confirmError ? 'border-red-500 focus:border-red-400' : 'border-slate-700/80 focus:border-turf-500 focus:shadow-neon-sm'
                        }`}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(v => !v)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 ${confirmError ? 'text-red-400' : 'text-slate-500 active:text-slate-300'}`}
                        tabIndex={-1}
                    >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
                {confirmError && (
                    <p className="text-red-400 text-xs font-bold ml-1 mt-1 animate-fade-in">{confirmError}</p>
                )}
            </div>
        </div>
    );
};
