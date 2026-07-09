import React from 'react';
import { Clock, TurkishLira, Settings2 } from 'lucide-react';
import { BusinessTimePickerModal } from '../../../../components/Modals/BusinessTimePickerModal';

interface PitchGeneralFormProps {
    formData: any;
    isTimePickerOpen: { open: boolean; type: 'OPEN' | 'CLOSE' | 'SLOT_START' | 'SLOT_END' };
    setIsTimePickerOpen: (state: any) => void;
    handleChange: (field: string, value: string) => void;
    disabled?: boolean;
}

export const PitchGeneralForm: React.FC<PitchGeneralFormProps> = ({
    formData, isTimePickerOpen, setIsTimePickerOpen, handleChange, disabled = false
}) => {
    return (
        <div className="bg-slate-800/70 rounded-2xl border border-slate-700/60 overflow-hidden"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>

            {/* Section Header */}
            <div className="px-4 py-3.5 border-b border-slate-700/50"
                style={{ background: 'linear-gradient(90deg, rgba(249,115,22,0.06) 0%, transparent 100%)' }}>
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-orange-500/15 rounded-lg border border-orange-500/20">
                        <Settings2 className="w-4 h-4 text-orange-400" />
                    </div>
                    <h2 className="text-[clamp(13px,3.8vw,15px)] font-black text-white">Genel Ayarlar</h2>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Fiyat */}
                <div>
                    <label className="block text-[clamp(10px,2.8vw,12px)] font-bold mb-2 text-slate-400 uppercase tracking-wider">Saatlik Ücret</label>
                    <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <TurkishLira className="w-4 h-4 text-orange-400" />
                        </div>
                        <input
                            type="number"
                            value={formData.pricePerHour}
                            onChange={(e) => handleChange('pricePerHour', e.target.value)}
                            disabled={disabled}
                            className={`w-full pl-9 pr-4 py-3.5 bg-slate-900/60 border border-slate-700/60 rounded-xl text-white font-black text-[clamp(14px,4vw,16px)] focus:outline-none focus:border-orange-500/70 transition-colors ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                            required
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">TL/sa</div>
                    </div>
                </div>

                {/* Saha Tipi (Açık / Kapalı) */}
                <div>
                    <label className="block text-[clamp(10px,2.8vw,12px)] font-bold mb-2 text-slate-400 uppercase tracking-wider">Saha Tipi</label>
                    <div className="grid grid-cols-2 gap-2">
                        {([{ v: 'INDOOR', label: 'Kapalı Saha' }, { v: 'OUTDOOR', label: 'Açık Saha' }] as const).map(opt => {
                            const active = formData.type === opt.v;
                            return (
                                <button
                                    key={opt.v}
                                    type="button"
                                    onClick={() => handleChange('type', opt.v)}
                                    disabled={disabled}
                                    className={`py-3.5 rounded-xl font-black text-[clamp(13px,3.6vw,15px)] border transition-all min-h-[48px] ${
                                        active
                                            ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-900/30'
                                            : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-orange-500/40'
                                    } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Saatler */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[clamp(10px,2.8vw,12px)] font-bold mb-2 text-slate-400 uppercase tracking-wider">Açılış</label>
                        <button type="button"
                            onClick={() => setIsTimePickerOpen({ open: true, type: 'OPEN' })}
                            disabled={disabled}
                            className={`w-full flex items-center gap-2 p-3.5 bg-slate-900/60 border border-slate-700/60 rounded-xl text-white hover:border-orange-500/50 active:border-orange-500 transition-all font-mono font-black text-[clamp(14px,4vw,16px)] min-h-[48px] ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                            {formData.openTime}
                        </button>
                    </div>
                    <div>
                        <label className="block text-[clamp(10px,2.8vw,12px)] font-bold mb-2 text-slate-400 uppercase tracking-wider">Kapanış</label>
                        <button type="button"
                            onClick={() => setIsTimePickerOpen({ open: true, type: 'CLOSE' })}
                            disabled={disabled}
                            className={`w-full flex items-center gap-2 p-3.5 bg-slate-900/60 border border-slate-700/60 rounded-xl text-white hover:border-orange-500/50 active:border-orange-500 transition-all font-mono font-black text-[clamp(14px,4vw,16px)] min-h-[48px] ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                            {formData.closeTime}
                        </button>
                    </div>
                </div>

                <BusinessTimePickerModal
                    isOpen={isTimePickerOpen.open && (isTimePickerOpen.type === 'OPEN' || isTimePickerOpen.type === 'CLOSE')}
                    onClose={() => setIsTimePickerOpen({ ...isTimePickerOpen, open: false })}
                    title={isTimePickerOpen.type === 'OPEN' ? "AÇILIŞ SAATİ" : "KAPANIŞ SAATİ"}
                    initialTime={isTimePickerOpen.type === 'OPEN' ? formData.openTime : formData.closeTime}
                    onSelect={(time) => {
                        if (isTimePickerOpen.type === 'OPEN') handleChange('openTime', time);
                        else handleChange('closeTime', time);
                    }}
                />
            </div>
        </div>
    );
};
