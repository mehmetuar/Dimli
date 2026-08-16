import React from 'react';

// §105 — Paylaşılan toggle primitifi (kod tabanının ilk Switch'i).
// Salt görsel + erişilebilirlik: role="switch" ve aria-checked taşır; satır
// düzeni (etiket/açıklama) çağıranda kalır. Görsel reçete: mevcut el yapımı
// toggle'larla birebir (h-6 w-11, turf-600/slate-700 ray + beyaz topuz).
interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    /** Erişilebilirlik etiketi (görsel etiket çağıranda ayrıysa verilmeli) */
    ariaLabel?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled, ariaLabel }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            checked ? 'bg-turf-600' : 'bg-slate-700'
        } ${disabled ? 'opacity-50' : ''}`}
    >
        <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                checked ? 'translate-x-6' : 'translate-x-1'
            }`}
        />
    </button>
);
