import React, { useRef, useState } from 'react';
import { Camera, TurkishLira, X, Layers, Clock, AlertCircle } from 'lucide-react';
import { ImageCropModal } from '../../../../../components/Modals/ImageCropModal';
import { Input } from '../RegisterSidebar';
import { SUBSCRIPTION_PLANS } from '../../hooks/useBusinessRegister';
import { FacilitiesModal } from '../../../../../components/Modals/FacilitiesModal';
import { TimeSlotsModal } from '../../../../../components/Modals/TimeSlotsModal';

const PITCH_COUNT_OPTIONS = [1, 2, 3, 4, 5];

interface TimeSlot { startTime: string; endTime: string; }

interface PitchesAndPlanStepProps {
    formData: any;
    updatePitch: (index: number, field: string, value: any) => void;
    setPitchCount: (count: number) => void;
    setIsTimePickerOpen: (opts: any) => void;
    removeTimeSlot?: (pitchIndex: number, slotIndex: number) => void;
    tempSlot?: { startTime: string; endTime: string };
    addTimeSlot?: (pitchIndex: number, startTime: string, endTime: string) => void;
    toggleFacility: (pitchIndex: number, facility: string) => void;
    fieldErrors?: Record<string, string>;
}

/** Saatlik ücret için özel input — 0 değerini boş gösterir */
const PriceInput: React.FC<{ value: number; onChange: (val: number) => void; error?: string }> = ({ value, onChange, error }) => {
    const [rawText, setRawText] = useState<string | null>(null);
    const isFocused = rawText !== null;
    const displayValue = isFocused ? rawText! : value === 0 ? '' : String(value);

    const scrollInputIntoView = (e: React.FocusEvent<HTMLInputElement>) => {
        setRawText(value === 0 ? '' : String(value));
        setTimeout(() => {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 350);
    };

    return (
        <div className="flex flex-col gap-1 w-full min-w-0">
            <label className="text-xs text-slate-400 font-bold uppercase ml-1 block">
                Saatlik Ücret (TL) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <TurkishLira size={14} />
                </div>
                <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    className={`w-full bg-slate-800 border text-white text-sm p-3 pl-9 rounded-xl focus:outline-none transition-all font-medium min-h-[44px] ${
                        error ? 'border-red-500 focus:border-red-400' : 'border-slate-700 focus:border-orange-500'
                    }`}
                    value={displayValue}
                    onFocus={scrollInputIntoView}
                    onChange={(e) => {
                        const filtered = e.target.value.replace(/[^0-9.]/g, '');
                        setRawText(filtered);
                        const parsed = parseFloat(filtered);
                        onChange(isNaN(parsed) ? 0 : parsed);
                    }}
                    onBlur={() => setRawText(null)}
                />
            </div>
            {error && (
                <p className="text-red-400 text-xs font-bold ml-1 mt-0.5 animate-fade-in">{error}</p>
            )}
        </div>
    );
};

export const PitchesAndPlanStep: React.FC<PitchesAndPlanStepProps> = ({
    formData, updatePitch, setPitchCount, setIsTimePickerOpen, toggleFacility, fieldErrors = {},
}) => {
    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [facilitiesModalIdx, setFacilitiesModalIdx] = useState<number | null>(null);
    const [slotsModalIdx, setSlotsModalIdx] = useState<number | null>(null);
    const [cropTarget, setCropTarget] = useState<{ index: number; file: File } | null>(null);

    const selectedCount = formData.selectedPitchCount;
    const plan = SUBSCRIPTION_PLANS[selectedCount] || SUBSCRIPTION_PLANS[5];

    const handlePhotoSelect = (index: number, file: File) => {
        updatePitch(index, 'photoFile', file);
        updatePitch(index, 'imageUrl', URL.createObjectURL(file));
    };

    /** Sahaya özel slot listesini günceller */
    const handleSlotsChange = (pitchIndex: number, slots: TimeSlot[]) => {
        updatePitch(pitchIndex, 'timeSlots', slots);
    };

    /** Tesise özel imkan ekler (seçilenler arasında yoksa toggle ile ekle) */
    const handleAddCustomFacility = (pitchIndex: number, name: string) => {
        const current: string[] = formData.pitches[pitchIndex].facilities;
        if (!current.includes(name)) {
            updatePitch(pitchIndex, 'facilities', [...current, name]);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Saha sayısı seçimi */}
            <div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-3">Kaç adet sahanız var?</p>
                <div className="flex gap-2 flex-wrap">
                    {PITCH_COUNT_OPTIONS.map(count => (
                        <button
                            key={count}
                            onClick={() => setPitchCount(count)}
                            className={`px-5 py-2.5 rounded-xl font-black text-sm border-2 transition-all min-h-[44px] ${
                                selectedCount === count
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
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-orange-400 font-black text-sm uppercase truncate">{plan.label} Plan</p>
                        <p className="text-slate-300 text-xs mt-0.5">
                            {selectedCount === 5 ? '5 ve üzeri saha' : `${selectedCount} saha`}
                        </p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-white font-black text-lg md:text-xl">
                            {plan.price.toLocaleString('tr-TR')} <span className="text-sm">TL/ay</span>
                        </p>
                        <p className="text-orange-400 text-xs font-bold">İlk 3 ay ücretsiz</p>
                    </div>
                </div>
            </div>

            {/* Saha formları */}
            <div className="space-y-6">
                {formData.pitches.map((pitch: any, index: number) => {
                    const pitchSlots: TimeSlot[] = pitch.timeSlots || [];
                    const pitchFacilities: string[] = pitch.facilities || [];
                    const nameError = fieldErrors[`pitch.${index}.name`];
                    const priceError = fieldErrors[`pitch.${index}.pricePerHour`];
                    const openTimeError = fieldErrors[`pitch.${index}.openTime`];
                    const closeTimeError = fieldErrors[`pitch.${index}.closeTime`];
                    const photoError = fieldErrors[`pitch.${index}.imageUrl`];

                    return (
                        <div key={index} className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 space-y-4">
                            <h3 className="font-black text-orange-400 uppercase text-sm">{index + 1}. Saha</h3>

                            {/* Temel bilgiler */}
                            <div className="grid grid-cols-1 gap-3">
                                <Input
                                    label="Saha Adı"
                                    value={pitch.name}
                                    onChange={(e: any) => updatePitch(index, 'name', e.target.value)}
                                    required
                                    error={nameError}
                                />
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-slate-400 font-bold uppercase">Saha Tipi</label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 text-white text-sm p-3 rounded-xl focus:outline-none focus:border-orange-500 min-h-[44px]"
                                        value={pitch.type}
                                        onChange={e => updatePitch(index, 'type', e.target.value)}
                                    >
                                        <option value="Kapalı Saha">Kapalı Saha</option>
                                        <option value="Açık Saha">Açık Saha</option>
                                    </select>
                                </div>
                                <PriceInput
                                    value={pitch.pricePerHour}
                                    onChange={(val) => updatePitch(index, 'pricePerHour', val)}
                                    error={priceError}
                                />
                            </div>

                            {/* Saha fotoğrafı */}
                            <div>
                                <label className={`text-xs font-bold uppercase mb-2 block ${photoError ? 'text-red-400' : 'text-slate-400'}`}>
                                    Saha Fotoğrafı <span className="text-red-500">*</span>
                                </label>
                                {pitch.imageUrl ? (
                                    <div className="space-y-2">
                                        {/* Tam genişlik önizleme — settings sayfasıyla aynı boyut */}
                                        <div className="relative rounded-xl overflow-hidden border border-slate-600">
                                            <img
                                                src={pitch.imageUrl}
                                                alt="Saha"
                                                className="w-full aspect-video object-cover"
                                            />
                                            <button
                                                onClick={() => {
                                                    updatePitch(index, 'photoFile', null);
                                                    updatePitch(index, 'imageUrl', '');
                                                }}
                                                className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5"
                                            >
                                                <X size={14} className="text-white" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => fileInputRefs.current[index]?.click()}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 text-slate-400 hover:border-slate-500 font-bold text-sm transition-colors min-h-[44px]"
                                        >
                                            <Camera size={16} /> Değiştir
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <button
                                            onClick={() => fileInputRefs.current[index]?.click()}
                                            className={`flex flex-col items-center justify-center gap-2 w-full h-36 rounded-xl border-2 border-dashed transition-colors font-bold text-sm ${
                                                photoError
                                                    ? 'border-red-500/50 text-red-400 hover:bg-red-500/10'
                                                    : 'border-orange-500/50 text-orange-400 hover:bg-orange-500/10'
                                            }`}
                                        >
                                            <Camera size={24} /> Fotoğraf Ekle
                                        </button>
                                        {photoError && (
                                            <p className="text-red-400 text-xs font-bold ml-1 mt-1 animate-fade-in">{photoError}</p>
                                        )}
                                    </div>
                                )}
                                <input
                                    ref={el => { fileInputRefs.current[index] = el; }}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) setCropTarget({ index, file });
                                        e.target.value = '';
                                    }}
                                />
                            </div>

                            {/* Saha-özel saatler */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className={`text-xs font-bold uppercase ml-1 ${openTimeError ? 'text-red-400' : 'text-slate-400'}`}>
                                        Açılış Saati <span className="text-red-500">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsTimePickerOpen({ open: true, type: 'PITCH_OPEN', pitchIdx: index })}
                                        className={`w-full bg-slate-800 border text-white p-3 rounded-xl text-left hover:border-orange-500 transition-all font-mono font-bold text-sm min-h-[44px] ${
                                            openTimeError ? 'border-red-500' : 'border-slate-700'
                                        }`}
                                    >
                                        {pitch.openTime || 'Seç...'}
                                    </button>
                                    {openTimeError && (
                                        <p className="text-red-400 text-xs font-bold ml-1 mt-0.5 animate-fade-in">{openTimeError}</p>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className={`text-xs font-bold uppercase ml-1 ${closeTimeError ? 'text-red-400' : 'text-slate-400'}`}>
                                        Kapanış Saati <span className="text-red-500">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsTimePickerOpen({ open: true, type: 'PITCH_CLOSE', pitchIdx: index })}
                                        className={`w-full bg-slate-800 border text-white p-3 rounded-xl text-left hover:border-orange-500 transition-all font-mono font-bold text-sm min-h-[44px] ${
                                            closeTimeError ? 'border-red-500' : 'border-slate-700'
                                        }`}
                                    >
                                        {pitch.closeTime || 'Seç...'}
                                    </button>
                                    {closeTimeError && (
                                        <p className="text-red-400 text-xs font-bold ml-1 mt-0.5 animate-fade-in">{closeTimeError}</p>
                                    )}
                                </div>
                            </div>

                            {/* ── Saha Detayları ── */}
                            <div className="border-t border-slate-800 pt-4 space-y-3">
                                <p className="text-xs text-slate-400 font-black uppercase tracking-wider">Saha Detayları</p>

                                {/* İmkânları Belirle */}
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setFacilitiesModalIdx(index)}
                                        className={`flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all min-h-[48px] ${
                                            pitchFacilities.length > 0
                                                ? 'border-orange-500/60 bg-orange-600/10 text-orange-400'
                                                : 'border-dashed border-slate-600 text-slate-400'
                                        }`}
                                    >
                                        <Layers size={16} className="shrink-0" />
                                        <span className="flex-1 text-left">
                                            {pitchFacilities.length > 0
                                                ? `${pitchFacilities.length} imkân belirlendi`
                                                : 'İmkânları Belirle'}
                                        </span>
                                        <span className="text-xs font-normal text-slate-500">Düzenle →</span>
                                    </button>
                                    {pitchFacilities.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {pitchFacilities.map((f: string) => (
                                                <span
                                                    key={f}
                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-600/20 border border-orange-500/40 text-orange-300"
                                                >
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Slotları Belirle */}
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setSlotsModalIdx(index)}
                                        className={`flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all min-h-[48px] ${
                                            pitchSlots.length > 0
                                                ? 'border-blue-500/60 bg-blue-600/10 text-blue-400'
                                                : 'border-dashed border-slate-600 text-slate-400'
                                        }`}
                                    >
                                        <Clock size={16} className="shrink-0" />
                                        <span className="flex-1 text-left">
                                            {pitchSlots.length > 0
                                                ? `${pitchSlots.length} slot belirlendi`
                                                : 'Slotları Belirle'}
                                        </span>
                                        <span className="text-xs font-normal text-slate-500">Düzenle →</span>
                                    </button>
                                    {pitchSlots.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {pitchSlots.map((s: TimeSlot) => (
                                                <span
                                                    key={`${s.startTime}-${s.endTime}`}
                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600/20 border border-blue-500/40 text-blue-300 font-mono"
                                                >
                                                    {s.startTime}–{s.endTime === '00:00' ? '24:00' : s.endTime}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Facilities Modal */}
            {facilitiesModalIdx !== null && (
                <FacilitiesModal
                    isOpen
                    onClose={() => setFacilitiesModalIdx(null)}
                    selectedFacilities={formData.pitches[facilitiesModalIdx]?.facilities ?? []}
                    onToggle={(facility) => toggleFacility(facilitiesModalIdx, facility)}
                    onAddCustom={(name) => handleAddCustomFacility(facilitiesModalIdx, name)}
                    pitchName={formData.pitches[facilitiesModalIdx]?.name}
                />
            )}

            {/* Image Crop Modal */}
            {cropTarget !== null && (
                <ImageCropModal
                    file={cropTarget.file}
                    onCrop={(croppedFile: File) => {
                        handlePhotoSelect(cropTarget.index, croppedFile);
                        setCropTarget(null);
                    }}
                    onCancel={() => setCropTarget(null)}
                />
            )}

            {/* Time Slots Modal */}
            {slotsModalIdx !== null && (
                <TimeSlotsModal
                    isOpen
                    onClose={() => setSlotsModalIdx(null)}
                    selectedSlots={formData.pitches[slotsModalIdx]?.timeSlots ?? []}
                    onSlotsChange={(slots) => handleSlotsChange(slotsModalIdx, slots)}
                    pitchName={formData.pitches[slotsModalIdx]?.name}
                    pitchOpenTime={
                        formData.pitches[slotsModalIdx]?.openTime ||
                        formData.business?.openTime ||
                        undefined
                    }
                    pitchCloseTime={
                        formData.pitches[slotsModalIdx]?.closeTime ||
                        formData.business?.closeTime ||
                        undefined
                    }
                />
            )}
        </div>
    );
};
