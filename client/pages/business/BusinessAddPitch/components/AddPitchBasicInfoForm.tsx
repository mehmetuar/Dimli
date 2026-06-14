import React from 'react';
import { Goal } from 'lucide-react';

interface AddPitchBasicInfoFormProps {
    formData: any;
    handleChange: (field: string, value: any) => void;
}

export const AddPitchBasicInfoForm: React.FC<AddPitchBasicInfoFormProps> = ({ formData, handleChange }) => {
    return (
        <div className="bg-slate-800/70 rounded-2xl border border-slate-700/60 overflow-hidden"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>

            {/* Section Header */}
            <div className="px-4 py-3.5 border-b border-slate-700/50"
                style={{ background: 'linear-gradient(90deg, rgba(249,115,22,0.06) 0%, transparent 100%)' }}>
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-orange-500/15 rounded-lg border border-orange-500/20">
                        <Goal className="w-4 h-4 text-orange-400" />
                    </div>
                    <h2 className="text-[clamp(13px,3.8vw,15px)] font-black text-white">Genel Bilgiler</h2>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Saha Adı */}
                <div>
                    <label className="block text-[clamp(10px,2.8vw,12px)] font-bold mb-2 text-slate-400 uppercase tracking-wider">Saha Adı</label>
                    <input
                        type="text"
                        required
                        placeholder="Örn: 1 No'lu Saha"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full px-4 py-3.5 bg-slate-900/60 border border-slate-700/60 rounded-xl text-white font-bold text-[clamp(14px,4vw,16px)] focus:outline-none focus:border-orange-500/70 transition-colors"
                    />
                </div>

                {/* Saha Tipi */}
                <div>
                    <label className="block text-[clamp(10px,2.8vw,12px)] font-bold mb-2 text-slate-400 uppercase tracking-wider">Saha Tipi</label>
                    <div className="grid grid-cols-2 gap-3">
                        {([
                            { value: 'INDOOR', label: 'Kapalı Saha' },
                            { value: 'OUTDOOR', label: 'Açık Saha' },
                        ] as const).map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleChange('type', opt.value)}
                                className={`p-3.5 rounded-xl border font-black text-[clamp(13px,3.5vw,15px)] transition-all ${formData.type === opt.value
                                    ? 'bg-orange-500/15 border-orange-500/50 text-orange-400'
                                    : 'bg-slate-900/50 border-slate-700/50 text-slate-400'
                                    }`}
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
