import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { KeyboardAwareModal } from '../../../../components/Modals/KeyboardAwareModal';
import { hexToHsl, hslToHex, isValidHex } from '../../../../utils/colorUtils';

export const TEAM_COLORS = [
    { label: 'Mavi', hex: '#3b82f6' },
    { label: 'Lacivert', hex: '#1e3a8a' },
    { label: 'Gökyüzü', hex: '#38bdf8' },
    { label: 'Yeşil', hex: '#22c55e' },
    { label: 'Koyu Yeşil', hex: '#15803d' },
    { label: 'Çimen', hex: '#84cc16' },
    { label: 'Kırmızı', hex: '#ef4444' },
    { label: 'Bordo', hex: '#9f1239' },
    { label: 'Turuncu', hex: '#f97316' },
    { label: 'Sarı', hex: '#facc15' },
    { label: 'Altın', hex: '#d97706' },
    { label: 'Mor', hex: '#a855f7' },
    { label: 'Koyu Mor', hex: '#6d28d9' },
    { label: 'Pembe', hex: '#ec4899' },
    { label: 'Fuşya', hex: '#d946ef' },
    { label: 'Turkuaz', hex: '#06b6d4' },
    { label: 'Teal', hex: '#14b8a6' },
    { label: 'Beyaz', hex: '#f1f5f9' },
    { label: 'Gümüş', hex: '#94a3b8' },
    { label: 'Grafit', hex: '#475569' },
    { label: 'Siyah', hex: '#111827' },
    { label: 'Mercan', hex: '#f87171' },
    { label: 'İndigo', hex: '#6366f1' },
    { label: 'Kahve', hex: '#92400e' },
];

interface ColorPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    value: string;
    onChange: (hex: string) => void;
    title: string;
}

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
    isOpen,
    onClose,
    value,
    onChange,
    title,
}) => {
    const initHsl = hexToHsl(isValidHex(value) ? value : '#3b82f6');
    const [hue, setHue] = useState(initHsl.h);
    const [saturation, setSaturation] = useState(Math.max(initHsl.s, 60));
    const [lightness, setLightness] = useState(initHsl.l);
    const [hexInput, setHexInput] = useState(isValidHex(value) ? value : '#3b82f6');
    const [tempColor, setTempColor] = useState(isValidHex(value) ? value : '#3b82f6');

    useEffect(() => {
        if (!isOpen) return;
        const safe = isValidHex(value) ? value : '#3b82f6';
        const hsl = hexToHsl(safe);
        setHue(hsl.h);
        setSaturation(Math.max(hsl.s, 60));
        setLightness(hsl.l);
        setHexInput(safe);
        setTempColor(safe);
    }, [isOpen, value]);

    useEffect(() => {
        const hex = hslToHex(hue, saturation, lightness);
        setTempColor(hex);
        setHexInput(hex);
    }, [hue, saturation, lightness]);

    const handlePresetClick = (hex: string) => {
        const hsl = hexToHsl(hex);
        setHue(hsl.h);
        setSaturation(Math.max(hsl.s, 60));
        setLightness(hsl.l);
        setHexInput(hex);
        setTempColor(hex);
    };

    const handleHexInput = (val: string) => {
        setHexInput(val);
        if (isValidHex(val)) {
            const hsl = hexToHsl(val);
            setHue(hsl.h);
            setSaturation(Math.max(hsl.s, 60));
            setLightness(hsl.l);
            setTempColor(val);
        }
    };

    const handleConfirm = () => {
        onChange(tempColor);
        onClose();
    };

    return (
        <KeyboardAwareModal
            isOpen={isOpen}
            align="sheet"
            zClassName="z-[90]"
            panelClassName="bg-slate-900 w-full max-w-sm border-t border-slate-700 shadow-2xl pb-safe-bottom"
            bodyClassName="px-5 py-4 space-y-5"
            header={
                <>
                    {/* Handle bar */}
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 rounded-full bg-slate-600" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
                        <span className="text-white font-black text-base uppercase tracking-wide italic">{title}</span>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white active:scale-90 transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </>
            }
        >
                    {/* Preview + Hex */}
                    <div className="flex items-center gap-3">
                        <div
                            className="w-14 h-14 rounded-2xl border-2 border-slate-600 flex-shrink-0 shadow-lg transition-colors duration-100"
                            style={{ backgroundColor: tempColor }}
                        />
                        <div className="flex-1">
                            <p className="text-slate-500 text-xs font-bold uppercase mb-1">Hex Kodu</p>
                            <input
                                type="text"
                                value={hexInput}
                                onChange={e => handleHexInput(e.target.value)}
                                maxLength={7}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:border-turf-500 focus:outline-none uppercase"
                                placeholder="#3b82f6"
                            />
                        </div>
                    </div>

                    {/* Hue Bar — input[type=range] ile native kaydırma (iOS/Android uyumlu, lag yok) */}
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase mb-2">Renk Tonu</p>
                        <div
                            className="relative h-8 rounded-xl"
                            style={{
                                background: 'linear-gradient(to right, hsl(0,80%,50%), hsl(30,80%,50%), hsl(60,80%,50%), hsl(90,80%,50%), hsl(120,80%,50%), hsl(150,80%,50%), hsl(180,80%,50%), hsl(210,80%,50%), hsl(240,80%,50%), hsl(270,80%,50%), hsl(300,80%,50%), hsl(330,80%,50%), hsl(360,80%,50%))',
                            }}
                        >
                            <input
                                type="range"
                                min={0}
                                max={360}
                                value={hue}
                                onChange={e => setHue(Number(e.target.value))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                style={{ WebkitAppearance: 'none' }}
                            />
                            {/* Visual thumb */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-white pointer-events-none"
                                style={{
                                    left: `calc(${(hue / 360) * 100}% - 12px)`,
                                    backgroundColor: `hsl(${hue}, 80%, 50%)`,
                                    boxShadow: '0 0 0 2px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)',
                                }}
                            />
                        </div>
                    </div>

                    {/* Lightness Slider */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-slate-500 text-xs font-bold uppercase">Parlaklık</p>
                            <span className="text-slate-400 text-xs">{lightness}%</span>
                        </div>
                        <div
                            className="relative h-8 rounded-xl"
                            style={{
                                background: `linear-gradient(to right, hsl(${hue},${saturation}%,10%), hsl(${hue},${saturation}%,50%), hsl(${hue},${saturation}%,90%))`,
                            }}
                        >
                            <input
                                type="range"
                                min={15}
                                max={85}
                                value={lightness}
                                onChange={e => setLightness(Number(e.target.value))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                style={{ WebkitAppearance: 'none' }}
                            />
                            {/* Visual thumb */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-white pointer-events-none"
                                style={{
                                    left: `calc(${((lightness - 15) / 70) * 100}% - 12px)`,
                                    backgroundColor: `hsl(${hue},${saturation}%,${lightness}%)`,
                                    boxShadow: '0 0 0 2px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)',
                                }}
                            />
                        </div>
                    </div>

                    {/* Preset Colors */}
                    <div>
                        <p className="text-slate-500 text-xs font-bold uppercase mb-2.5">Hazır Renkler</p>
                        <div className="grid grid-cols-8 gap-2">
                            {TEAM_COLORS.map(c => (
                                <button
                                    key={c.hex}
                                    onClick={() => handlePresetClick(c.hex)}
                                    title={c.label}
                                    className="relative w-9 h-9 rounded-full transition-transform active:scale-90 hover:scale-110 focus:outline-none"
                                    style={{ backgroundColor: c.hex }}
                                >
                                    {tempColor.toLowerCase() === c.hex.toLowerCase() && (
                                        <span className="absolute inset-0 flex items-center justify-center">
                                            <span className="absolute inset-0 rounded-full ring-2 ring-white ring-offset-1 ring-offset-slate-900" />
                                            <Check className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] relative z-10" strokeWidth={3} />
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm active:scale-95 transition-all"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 py-3.5 rounded-xl text-white font-black text-sm uppercase italic active:scale-95 transition-all shadow-lg"
                            style={{ backgroundColor: tempColor }}
                        >
                            Seç
                        </button>
                    </div>
        </KeyboardAwareModal>
    );
};
