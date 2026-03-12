import React from 'react';
import { Plus, Trash2, X, TurkishLira } from 'lucide-react';
import { Input } from '../RegisterSidebar';
import { DEFAULT_FACILITIES } from '../../../../../constants';

interface PitchesStepProps {
    formData: any;
    updatePitch: (index: number, field: string, value: any) => void;
    addPitch: () => void;
    removePitch: (index: number) => void;
    setIsTimePickerOpen: (opts: any) => void;
    removeTimeSlot: (pitchIndex: number, slotIndex: number) => void;
    tempSlot: { startTime: string; endTime: string };
    addTimeSlot: (pitchIndex: number, startTime: string, endTime: string) => void;
    toggleFacility: (pitchIndex: number, facility: string) => void;
}

export const PitchesStep: React.FC<PitchesStepProps> = ({
    formData,
    updatePitch,
    addPitch,
    removePitch,
    setIsTimePickerOpen,
    removeTimeSlot,
    tempSlot,
    addTimeSlot,
    toggleFacility
}) => {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Sahalar</h2>
                <button onClick={addPitch} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors">
                    <Plus size={16} /> Saha Ekle
                </button>
            </div>

            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide pb-10">
                {formData.pitches.map((pitch: any, index: number) => (
                    <div key={index} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 relative">
                        {formData.pitches.length > 1 && (
                            <button onClick={() => removePitch(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-400">
                                <Trash2 size={18} />
                            </button>
                        )}
                        <h3 className="font-bold text-orange-400 mb-3">{index + 1}. Saha</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <Input label="Saha Adı" value={pitch.name} onChange={(e: any) => updatePitch(index, 'name', e.target.value)} />
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-slate-400 font-bold uppercase">Saha Tipi</label>
                                <select
                                    className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-orange-500"
                                    value={pitch.type}
                                    onChange={e => updatePitch(index, 'type', e.target.value)}
                                >
                                    <option value="Kapalı Saha">Kapalı Saha</option>
                                    <option value="Açık Saha">Açık Saha</option>
                                </select>
                            </div>
                            <Input label="Saatlik Ücret (TL)" type="number" value={pitch.pricePerHour} onChange={(e: any) => updatePitch(index, 'pricePerHour', parseFloat(e.target.value))} icon={<TurkishLira size={14} />} />
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-slate-400 font-bold uppercase ml-1">Açılış (Opsiyonel)</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsTimePickerOpen({ open: true, type: 'PITCH_OPEN', pitchIdx: index })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-left hover:border-orange-500 transition-all font-mono font-bold text-sm"
                                    >
                                        {pitch.openTime || "Seç..."}
                                    </button>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-slate-400 font-bold uppercase ml-1">Kapanış (Opsiyonel)</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsTimePickerOpen({ open: true, type: 'PITCH_CLOSE', pitchIdx: index })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-left hover:border-orange-500 transition-all font-mono font-bold text-sm"
                                    >
                                        {pitch.closeTime || "Seç..."}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 border-t border-slate-800 pt-4">
                            <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Saat Slotları (Opsiyonel)</label>
                            <p className="text-[10px] text-slate-500 mb-3">Bu sahaya özel kiralama saatlerini belirleyin. Örneğin: 19:30 - 20:30</p>
                            <div className="space-y-2 mb-3">
                                {pitch.timeSlots?.map((slot: any, slotIdx: number) => (
                                    <div key={slotIdx} className="flex items-center justify-between bg-slate-800 p-2 rounded-lg border border-slate-700">
                                        <span className="text-sm font-bold text-orange-400">{slot.startTime} - {slot.endTime}</span>
                                        <button onClick={() => removeTimeSlot(index, slotIdx)} className="text-red-500 hover:text-red-400 p-1">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 items-center">
                                <div className="flex-1 space-y-1">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Başlangıç</p>
                                    <button
                                        type="button"
                                        onClick={() => setIsTimePickerOpen({ open: true, type: 'SLOT_START', pitchIdx: index })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl text-sm font-mono font-bold hover:border-orange-500"
                                    >
                                        {tempSlot.startTime || "00:00"}
                                    </button>
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Bitiş</p>
                                    <button
                                        type="button"
                                        onClick={() => setIsTimePickerOpen({ open: true, type: 'SLOT_END', pitchIdx: index })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl text-sm font-mono font-bold hover:border-orange-500"
                                    >
                                        {tempSlot.endTime || "00:00"}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => addTimeSlot(index, tempSlot.startTime, tempSlot.endTime)}
                                    className="bg-orange-600 hover:bg-orange-500 text-white p-3 rounded-xl shadow-lg shadow-orange-600/20 self-end transition-all"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 border-t border-slate-800 pt-4">
                            <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">İmkanlar</label>
                            <div className="flex flex-wrap gap-2">
                                {DEFAULT_FACILITIES.map(facility => (
                                    <button
                                        key={facility}
                                        type="button"
                                        onClick={() => toggleFacility(index, facility)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${pitch.facilities.includes(facility)
                                            ? 'bg-green-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                    >
                                        {facility}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
