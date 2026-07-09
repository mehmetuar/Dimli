import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps {
    label?: string;
    type?: string;
    value: string | number;
    onChange: (e: any) => void;
    required?: boolean;
    textarea?: boolean;
    icon?: React.ReactNode;
    error?: string;
    placeholder?: string;
    inputMode?: string;
    autoComplete?: string;
}

/**
 * Auth sihirbazı premium input — turuncu focus-glow (BusinessForgotPassword `inputClass` diliyle
 * birebir), clamp tipografi, opsiyonel leading ikon + şifre göster/gizle. Kayıt adımları kullanır.
 */
export const Input: React.FC<InputProps> = ({
    label, type = 'text', value, onChange, required, textarea, icon, error, placeholder, inputMode, autoComplete,
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

    const base = `w-full bg-slate-800/40 text-white rounded-2xl border font-bold transition-colors focus:outline-none placeholder:text-slate-500 ${
        error
            ? 'border-red-500 focus:border-red-400'
            : 'border-slate-700/80 focus:border-orange-500 focus:shadow-[0_0_15px_rgba(249,115,22,0.3)]'
    }`;

    return (
        <div className="flex flex-col gap-1.5 w-full min-w-0">
            {label && (
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-1">
                    {label} {required && <span className="text-orange-500">*</span>}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 flex items-center pointer-events-none">
                        {icon}
                    </div>
                )}
                {textarea ? (
                    <textarea
                        className={`${base} py-3.5 ${icon ? 'pl-12 pr-4' : 'px-4'} resize-none`}
                        style={{ fontSize: 'clamp(0.9rem, 2.3vh, 1rem)', minHeight: 'clamp(80px, 14vh, 120px)' }}
                        value={value}
                        onChange={onChange}
                        required={required}
                        placeholder={placeholder}
                    />
                ) : (
                    <input
                        type={inputType}
                        className={`${base} ${icon ? 'pl-12' : 'pl-4'} ${type === 'password' ? 'pr-12' : 'pr-4'}`}
                        style={{ fontSize: 'clamp(0.9rem, 2.3vh, 1rem)', height: 'clamp(50px, 7vh, 58px)' }}
                        value={value}
                        onChange={onChange}
                        required={required}
                        placeholder={placeholder}
                        inputMode={inputMode as any}
                        autoComplete={autoComplete}
                    />
                )}
                {type === 'password' && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 active:text-orange-400 p-1"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                )}
            </div>
            {error && (
                <p className="text-red-400 text-xs font-bold pl-1 mt-0.5 animate-fade-in">{error}</p>
            )}
        </div>
    );
};
