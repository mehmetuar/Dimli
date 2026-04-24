import React, { useRef } from 'react';
import { Camera, TurkishLira, X } from 'lucide-react';
import { Input } from '../RegisterSidebar';
import { SUBSCRIPTION_PLANS } from '../../hooks/useBusinessRegister';
import { DEFAULT_FACILITIES } from '../../../../../constants';

const PITCH_COUNT_OPTIONS = [1, 2, 3, 4, 5];

interface PitchesAndPlanStepProps {
    formData: any;
    updatePitch: (index: number, field: string, value: any) => void;
    setPitchCount: (count: number) => void;
    setIsTimePickerOpen: (opts: any) => void;
    removeTimeSlot: (pitchIndex: number, slotIndex: number) => void;
    tempSlot: { startTime: string; endTime: string };
    addTimeSlot: (pitchIndex: number, startTime: string, endTime: string) => void;
    toggleFacility: (pitchIndex: number, facility: string) => void;
}

export const PitchesAndPlanStep: React.FC<PitchesAndPlanStepProps> = ({
    formData, updatePitch, setPitchCount, setIsTimePickerOpen,
    removeTimeSlot, tempSlot, addTimeSlot, toggleFacility,
}) => {
    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const selectedCount = formData.selectedPitchCount;
    const plan = SUBSCRIPTION_PLANS[selectedCount] || SUBSCRIPTION_PLANS[5];

    const handlePhotoSelect = (index: number, file: File) => {
        updatePitch(index, 'photoFile', file);
        updatePitch(index, 'imageUrl', URL.createObjectURL(file));
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Plan seçimi */}
            <div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-3">Kaç adet sahanız var?</p>
                <div className="flex gap-2 flex-wrap">
                    {PITCH_COUNT_OPTIONS.map(count => (
                        <button
                            key={count}
                            onClick={() => setPitchCount(count)}
                            className={`px-5 py-2 rounded-xl font-black text-sm border-2 transition-all ${selectedCount === count
                                ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-900/30'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                }`}
                        >
                            {count === 5 ? '5+' : count}
                        </button>
                    ))}
                </div>
            </div>

            {/* Fiyat kartı */}
            <div className="bg-gradient-to-r from-orange-600/20 to-orange-800/10 border border-orange-500/30 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-orange-400 font-black text-sm uppercase">{plan.label} Plan</p>
                        <p className="text-slate-300 text-xs mt-0.5">
                            {selectedCount === 5 ? '5 ve üzeri saha' : `${selectedCount} saha`}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-white font-black text-xl">
                            {plan.price.toLocaleString('tr-TR')} <span className="text-sm">TL/ay</span>
                        </p>
                        <p className="text-orange-400 text-xs font-bold">İlk 3 ay ücretsiz</p>
                    </div>
                </div>
            </div>

            {/* Saha formları */}
            <div className="space-y-6">
                {formData.pitches.map((pitch: any, index: number) => (
                    <div key={index} className="bg-slate-900/60 p-4 rounded-xl border border-slate-700">
                        <h3 className="font-black text-orange-400 mb-4 uppercase text-sm">{index + 1}. Saha</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            <Input label="Saha Adı" value={pitch.name}
                                onChange={(e: any) => updatePitch(index, 'name', e.target.value)} required />
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-slate-400 font-bold uppercase">Saha Tipi</label>
                                <select
                                    className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:border-orange-500"
                                    value={pitch.type}
                                    onChange={e => updatePitch(index, 'type', e.target.value)}
                                >
                                    <option value="Kapalı Saha">Kapalı Saha</option>
                                    <option value="Açık Saha">Açık Saha</option>
                                </select>
                            </div>
                            <Input label="Saatlik Ücret (TL)" type="number" value={pitch.pricePerHour}
                                onChange={(e: any) => updatePitch(index, 'pricePerHour', parseFloat(e.target.value) || 0)}
                                icon={<TurkishLira size={14} />} required />
                        </div>

                        {/* Saha fotoğrafı */}
                        <div className="mb-4">
                            <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">
                                Saha Fotoğrafı <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-3">
                                {pitch.imageUrl ? (
                                    <div className="relative">
                                        <img src={pitch.imageUrl} alt="Saha"
                                            className="w-20 h-20 object-cover rounded-xl border border-slate-600" />
                                        <button
                                            onClick={() => { updatePitch(index, 'photoFile', null); updatePitch(index, 'imageUrl', ''); }}
                                            className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5"
                                        >
                                            <X size={12} className="text-white" />
                                        </button>
                                    </div>
                                ) : null}
                                <button
                                    onClick={() => fileInputRefs.current[index]?.click()}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm transition-colors ${pitch.imageUrl
                                        ? 'border-slate-600 text-slate-400 hover:border-slate-500'
                                        : 'border-orange-500/50 text-orange-400 hover:bg-orange-500/10'
                                        }`}
                                >
                                    <Camera size={16} />
                                    {pitch.imageUrl ? 'Değiştir' : 'Fotoğraf Ekle'}
                                </button>
                                <input
                                    ref={el => { fileInputRefs.current[index] = el; }}
                                    type="file" accept="image/*" className="hidden"
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) handlePhotoSelect(index, file);
                                        e.target.value = '';
                                    }}
                                />
                            </div>
                        </div>

                        {/* Opsiyonel alanlar — akordiyon */}
                        <details className="group">
                            <summary className="text-xs text-slate-500 font-bold uppercase cursor-pointer hover:text-slate-300 transition-colors list-none flex items-center gap-1">
                                <span className="group-open:rotate-90 inline-block transition-transform">▶</span>
                                Opsiyonel Ayarlar (özel saatler, tesisler)
                            </summary>
                            <div className="mt-3 space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-slate-400 font-bold uppercase ml-1">Açılış (Opsiyonel)</label>
                                        <button type="button"
                                            onClick={() => setIsTimePickerOpen({ open: true, type: 'PITCH_OPEN', pitchIdx: index })}
                                            className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-left hover:border-orange-500 transition-all font-mono font-bold text-sm">
                                            {pitch.openTime || "Seç..."}
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-slate-400 font-bold uppercase ml-1">Kapanış (Opsiyonel)</label>
                                        <button type="button"
                                            onClick={() => setIsTimePickerOpen({ open: true, type: 'PITCH_CLOSE', pitchIdx: index })}
                                            className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-left hover:border-orange-500 transition-all font-mono font-bold text-sm">
                                            {pitch.closeTime || "Seç..."}
                                        </button>
                                    </div>
                                </div>

                                {DEFAULT_FACILITIES && DEFAULT_FACILITIES.length > 0 && (
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-2">Tesisler</p>
                                        <div className="flex flex-wrap gap-2">
                                            {DEFAULT_FACILITIES.map((f: string) => (
                                                <button key={f} type="button"
                                                    onClick={() => toggleFacility(index, f)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${pitch.facilities.includes(f)
                                                        ? 'bg-orange-600/30 border-orange-500 text-orange-300'
                                                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                                                        }`}
                                                >
                                                    {f}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </details>
                    </div>
                ))}
            </div>
        </div>
    );
};
