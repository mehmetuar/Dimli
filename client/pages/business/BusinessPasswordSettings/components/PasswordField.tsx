import React from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { fieldLabel, fieldInput, fieldIcon } from '../../shared/formStyles';

interface PasswordFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    show: boolean;
    onToggleShow: () => void;
    autoComplete?: string;
    invalid?: boolean;
    placeholder?: string;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
    id,
    label,
    value,
    onChange,
    show,
    onToggleShow,
    autoComplete = 'off',
    invalid = false,
    placeholder = '••••••••',
}) => {
    return (
        <div>
            <label
                htmlFor={id}
                className="block font-bold uppercase italic tracking-wide text-slate-300 mb-2"
                style={fieldLabel}
            >
                {label} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
                <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                    style={fieldIcon}
                />
                <input
                    id={id}
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    required
                    className={`w-full pl-11 pr-12 bg-slate-900 border rounded-xl text-white font-medium focus:outline-none focus:ring-1 transition-colors placeholder:text-slate-600 ${
                        invalid
                            ? 'border-red-500/70 focus:border-red-400 focus:ring-red-500'
                            : 'border-slate-700 focus:border-orange-500 focus:ring-orange-500'
                    }`}
                    style={fieldInput}
                />
                <button
                    type="button"
                    onClick={onToggleShow}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 active:text-orange-400 p-1"
                    tabIndex={-1}
                    aria-label={show ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                    {show
                        ? <EyeOff style={fieldIcon} />
                        : <Eye style={fieldIcon} />}
                </button>
            </div>
        </div>
    );
};
