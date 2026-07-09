import React, { useRef, useState } from 'react';
import { Camera, TurkishLira, X, Layers, Clock, Calendar } from 'lucide-react';
import { ImageCropModal } from '../../../../../components/Modals/ImageCropModal';
import { Input } from '../RegisterInput';
import { TimeButton } from '../RegisterSection';
import { SUBSCRIPTION_PLANS } from '../../hooks/useBusinessRegister';
import { FacilitiesModal } from '../FacilitiesModal';
import { TimeSlotsModal } from '../TimeSlotsModal';

const PITCH_COUNT_OPTIONS = [1, 2, 3, 4, 5];

const DAYS = [
    { label: 'Pzt', value: 'Monday' },
    { label: 'Sal', value: 'Tuesday' },
    { label: 'Çar', value: 'Wednesday' },
    { label: 'Per', value: 'Thursday' },
    { label: 'Cum', value: 'Friday' },
    { label: 'Cmt', value: 'Saturday' },
    { label: 'Paz', value: 'Sunday' },
];

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
    toggleClosedDay: (pitchIndex: number, day: string) => void;
    fieldErrors?: Record<string, string>;
}

/** Saatlik ücret için özel input — 0 değerini boş gösterir (turuncu para ikonu + premium focus-glow) */
const PriceInput: React.FC<{ value: number; onChange: (val: number) => void; error?: string }> = ({ value, onChange, error }) => {
    const [rawText, setRawText] = useState<string | null>(null);
    const isFocused = rawText !== null;
    const displayValue = isFocused ? rawText! : value === 0 ? '' : String(value);

    const handleFocus = () => {
        setRawText(value === 0 ? '' : String(value));
    };

    return (
        <div className="flex flex-col gap-1.5 w-full min-w-0">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-1">
                Saatlik Ücret (TL) <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none">
                    <TurkishLira size={16} />
                </div>
                <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    className={`w-full bg-slate-800/40 border text-white rounded-2xl pl-11 pr-4 focus:outline-none transition-colors font-bold placeholder:text-slate-500 ${
                        error ? 'border-red-500 focus:border-red-400' : 'border-slate-700/80 focus:border-orange-500 focus:shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                    }`}
                    style={{ fontSize: 'clamp(0.9rem, 2.3vh, 1rem)', height: 'clamp(50px, 7vh, 58px)' }}
                    value={displayValue}
                    onFocus={handleFocus}
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
                <p className="text-red-400 text-xs font-bold pl-1 mt-0.5 animate-fade-in">{error}</p>
            )}
        </div>
    );
};

// Not: kök öğeye animasyon sınıfı KOYMA — AuthWizardLayout içeriği `animate-step-in` ile sarar.
export const PitchesAndPlanStep: React.FC<PitchesAndPlanStepProps> = ({
    formData, updatePitch, setPitchCount, setIsTimePickerOpen, toggleFacility, toggleClosedDay, fieldErrors = {},
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
        <div className="space-y-6">
            {/* Saha sayısı seçimi */}
            <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-3 pl-1">Kaç adet sahanız var?</p>
                <div className="flex gap-2 flex-wrap">
                    {PITCH_COUNT_OPTIONS.map(count => (
                        <button
                            key={count}
                            onClick={() => setPitchCount(count)}
                            className={`px-5 rounded-2xl font-black border-2 transition-all ${
                                selectedCount === count
                                    ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-900/30'
                                    : 'bg-slate-800/40 border-slate-700/80 text-slate-400 hover:border-slate-500'
                            }`}
                            style={{ height: 'clamp(46px, 6.5vh, 52px)', fontSize: 'clamp(0.85rem, 2.2vh, 0.95rem)' }}
                        >
                            {count === 5 ? '5+' : count}
                        </button>
                    ))}
                </div>
            </div>

            {/* Fiyat kartı */}
            <div className="bg-gradient-to-r from-orange-600/20 to-orange-800/10 border border-orange-500/30 rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-orange-400 font-black uppercase truncate" style={{ fontSize: 'clamp(0.8rem, 2.1vh, 0.9rem)' }}>{plan.label} Plan</p>
                        <p className="text-slate-300 mt-0.5" style={{ fontSize: 'clamp(0.68rem, 1.7vh, 0.78rem)' }}>
                            {selectedCount === 5 ? '5 ve üzeri saha' : `${selectedCount} saha`}
                        </p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-white font-black" style={{ fontSize: 'clamp(1rem, 3vh, 1.25rem)' }}>
                            {plan.price.toLocaleString('tr-TR')} <span className="text-sm">TL/ay</span>
                        </p>
                        <p className="text-orange-400 font-bold" style={{ fontSize: 'clamp(0.65rem, 1.7vh, 0.75rem)' }}>İlk 3 ay ücretsiz</p>
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
                        <div key={index} className="bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-slate-700/50 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
                            {/* Saha başlığı — turuncu numara rozeti */}
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(249,115,22,0.15)] relative">
                                    <div className="absolute inset-0 rounded-xl bg-orange-400/10 blur-md" />
                                    <span className="relative z-10 text-orange-400 font-black" style={{ fontSize: 'clamp(0.85rem, 2.2vh, 1rem)' }}>{index + 1}</span>
                                </div>
                                <h3 className="font-black text-white uppercase tracking-wide" style={{ fontSize: 'clamp(0.85rem, 2.2vh, 1rem)' }}>Saha</h3>
                            </div>

                            {/* Temel bilgiler */}
                            <div className="space-y-3">
                                <Input
                                    label="Saha Adı"
                                    value={pitch.name}
                                    onChange={(e: any) => updatePitch(index, 'name', e.target.value)}
                                    required
                                    error={nameError}
                                />
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider pl-1">Saha Tipi</label>
                                    <select
                                        className="w-full bg-slate-800/40 border border-slate-700/80 text-white rounded-2xl px-4 focus:outline-none focus:border-orange-500 focus:shadow-[0_0_15px_rgba(249,115,22,0.3)] font-bold transition-colors"
                                        style={{ fontSize: 'clamp(0.9rem, 2.3vh, 1rem)', height: 'clamp(50px, 7vh, 58px)' }}
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
                                <label className={`text-[11px] font-bold uppercase tracking-wider mb-2 block pl-1 ${photoError ? 'text-red-400' : 'text-slate-400'}`}>
                                    Saha Fotoğrafı <span className="text-orange-500">*</span>
                                </label>
                                {pitch.imageUrl ? (
                                    <div className="space-y-2">
                                        <div className="relative rounded-2xl overflow-hidden border border-slate-600">
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
                                                className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 active:scale-90 transition-transform"
                                            >
                                                <X size={14} className="text-white" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => fileInputRefs.current[index]?.click()}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:border-orange-500/60 hover:text-orange-400 font-bold text-sm transition-colors min-h-[44px]"
                                        >
                                            <Camera size={16} /> Değiştir
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <button
                                            onClick={() => fileInputRefs.current[index]?.click()}
                                            className={`flex flex-col items-center justify-center gap-2 w-full rounded-2xl border-2 border-dashed transition-colors font-bold text-sm ${
                                                photoError
                                                    ? 'border-red-500/60 text-red-400 hover:bg-red-500/10'
                                                    : 'border-orange-500/50 text-orange-400 hover:bg-orange-500/10'
                                            }`}
                                            style={{ height: 'clamp(120px, 20vh, 160px)' }}
                                        >
                                            <Camera size={26} /> Fotoğraf Ekle
                                        </button>
                                        {photoError && (
                                            <p className="text-red-400 text-xs font-bold pl-1 mt-1.5 animate-fade-in">{photoError}</p>
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
                                <TimeButton
                                    label="Açılış"
                                    required
                                    value={pitch.openTime}
                                    onClick={() => setIsTimePickerOpen({ open: true, type: 'PITCH_OPEN', pitchIdx: index })}
                                    error={openTimeError}
                                />
                                <TimeButton
                                    label="Kapanış"
                                    required
                                    value={pitch.closeTime}
                                    onClick={() => setIsTimePickerOpen({ open: true, type: 'PITCH_CLOSE', pitchIdx: index })}
                                    error={closeTimeError}
                                />
                            </div>

                            {/* ── Saha Detayları ── */}
                            <div className="border-t border-slate-700/60 pt-4 space-y-3">
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider pl-1">Saha Detayları</p>

                                {/* İmkânları Belirle */}
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setFacilitiesModalIdx(index)}
                                        className={`flex items-center gap-2 w-full px-4 py-3 rounded-2xl border-2 font-bold text-sm transition-all min-h-[48px] ${
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
                                        className={`flex items-center gap-2 w-full px-4 py-3 rounded-2xl border-2 font-bold text-sm transition-all min-h-[48px] ${
                                            pitchSlots.length > 0
                                                ? 'border-orange-500/60 bg-orange-600/10 text-orange-400'
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
                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-600/20 border border-orange-500/40 text-orange-300 font-mono"
                                                >
                                                    {s.startTime}–{s.endTime === '00:00' ? '24:00' : s.endTime}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Kapalı Günler */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar size={16} className="text-slate-400 shrink-0" />
                                        <p className="text-xs font-bold text-slate-300">Kapalı Günler</p>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2">
                                        Sahanızın kapalı olduğu bir gün varsa seçin. Saha her gün rezervasyon alıyorsa seçim yapmanıza gerek yok.
                                    </p>
                                    <div className="grid grid-cols-7 gap-1.5">
                                        {DAYS.map(day => {
                                            const pitchClosedDays: string[] = pitch.closedDays || [];
                                            const isClosed = pitchClosedDays.includes(day.value);
                                            return (
                                                <button
                                                    key={day.value}
                                                    type="button"
                                                    onClick={() => toggleClosedDay(index, day.value)}
                                                    className={`py-2.5 rounded-xl text-xs font-black transition-all border ${isClosed
                                                        ? 'bg-red-500/15 border-red-500/50 text-red-400'
                                                        : 'bg-slate-800/60 border-slate-700 text-slate-400'
                                                        }`}
                                                >
                                                    {day.label}
                                                </button>
                                            );
                                        })}
                                    </div>
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
