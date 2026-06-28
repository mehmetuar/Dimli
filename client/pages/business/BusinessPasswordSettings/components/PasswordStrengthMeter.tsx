import React from 'react';
import { Check, X } from 'lucide-react';
import { helperText } from '../../shared/formStyles';
import type { PasswordStrength } from '../hooks/useBusinessPassword';

interface PasswordStrengthMeterProps {
    strength: PasswordStrength;
    lengthOk: boolean;
    minLength: number;
    /** Yalnızca yeni şifre alanı doluyken göster */
    visible: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
    strength,
    lengthOk,
    minLength,
    visible,
}) => {
    if (!visible) return null;

    return (
        <div className="mt-2.5 space-y-2">
            {/* Güç çubuğu (4 segment) */}
            <div className="flex items-center gap-2">
                <div className="flex-1 flex gap-1.5">
                    {[1, 2, 3, 4].map(seg => (
                        <div
                            key={seg}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                                strength.score >= seg ? strength.barClass : 'bg-slate-700'
                            }`}
                        />
                    ))}
                </div>
                {strength.label && (
                    <span className={`font-bold shrink-0 ${strength.textClass}`} style={helperText}>
                        {strength.label}
                    </span>
                )}
            </div>

            {/* Kural rozeti */}
            <div
                className={`flex items-center gap-1.5 font-semibold ${lengthOk ? 'text-green-400' : 'text-slate-500'}`}
                style={helperText}
            >
                {lengthOk
                    ? <Check className="w-3.5 h-3.5 shrink-0" />
                    : <X className="w-3.5 h-3.5 shrink-0" />}
                <span>En az {minLength} karakter</span>
            </div>
        </div>
    );
};
