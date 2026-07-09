import React from 'react';
import { Star } from 'lucide-react';

export type StarColor = 'yellow' | 'green' | 'amber';

const FILL: Record<StarColor, string> = {
    yellow: 'text-yellow-400 fill-yellow-400',
    green: 'text-green-500 fill-green-500',
    amber: 'text-amber-400 fill-amber-400',
};

/**
 * Paylaşılan 1-5 yıldız seçici. Değerlendirme formlarının (takım + joker) tek kaynağı.
 * Büyük dokunma hedefi (w-10 + p-1) — mobil standart.
 */
export function StarRating({
    value,
    onChange,
    color = 'yellow',
    disabled = false,
}: {
    value: number;
    onChange: (v: number) => void;
    color?: StarColor;
    disabled?: boolean;
}) {
    return (
        <div className="flex gap-1.5 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(star)}
                    className="p-1 transition-transform active:scale-110 disabled:active:scale-100 touch-manipulation"
                    aria-label={`${star} yıldız`}
                >
                    <Star
                        className={`w-10 h-10 transition-colors ${star <= value ? FILL[color] : 'text-slate-600'}`}
                    />
                </button>
            ))}
        </div>
    );
}
