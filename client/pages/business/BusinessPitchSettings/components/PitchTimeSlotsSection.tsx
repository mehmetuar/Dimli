import React from 'react';
import { Clock, Plus, Save, Trash2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { BusinessTimePickerModal } from '../../../../components/Modals/BusinessTimePickerModal';

interface PitchTimeSlotsSectionProps {
    timeSlots: { startTime: string; endTime: string }[];
    newSlotStart: string;
    newSlotEnd: string;
    savingSlots: boolean;
    slotsSuccess: boolean;
    slotError: string;
    pitchOpenTime?: string;
    pitchCloseTime?: string;
    isTimePickerOpen: { open: boolean; type: 'OPEN' | 'CLOSE' | 'SLOT_START' | 'SLOT_END' };
    setIsTimePickerOpen: (state: any) => void;
    setNewSlotStart: (t: string) => void;
    setNewSlotEnd: (t: string) => void;
    onAddSlot: () => void;
    onRemoveSlot: (index: number) => void;
    onSaveSlots: () => void;
}

export const PitchTimeSlotsSection: React.FC<PitchTimeSlotsSectionProps> = ({
    timeSlots, newSlotStart, newSlotEnd,
    savingSlots, slotsSuccess, slotError,
    pitchOpenTime, pitchCloseTime,
    isTimePickerOpen, setIsTimePickerOpen,
    setNewSlotStart, setNewSlotEnd,
    onAddSlot, onRemoveSlot, onSaveSlots
}) => {
    return (
        <div className="bg-slate-800/70 rounded-2xl border border-slate-700/60 overflow-hidden"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>

            {/* Section Header */}
            <div className="px-4 py-3.5 border-b border-slate-700/50"
                style={{ background: 'linear-gradient(90deg, rgba(249,115,22,0.06) 0%, transparent 100%)' }}>
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-orange-500/15 rounded-lg border border-orange-500/20">
                        <Clock className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                        <h2 className="text-[clamp(13px,3.8vw,15px)] font-black text-white">Saat Slotları</h2>
                        <p className="text-[clamp(9px,2.5vw,11px)] text-slate-400 mt-0.5">
                            {pitchOpenTime && pitchCloseTime
                                ? `${pitchOpenTime} – ${pitchCloseTime} arası geçerli`
                                : 'Maç oynanacak saat dilimlerini tanımlayın'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">

                {slotsSuccess && (
                    <div className="flex items-center gap-2.5 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-emerald-400 font-bold text-sm">Saat slotları başarıyla kaydedildi</span>
                    </div>
                )}

                {slotError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium">
                        {slotError}
                    </div>
                )}

                {/* Slot List */}
                {timeSlots.length > 0 ? (
                    <div className="space-y-2">
                        {timeSlots.map((slot, index) => (
                            <div key={index}
                                className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-3 py-2 rounded-xl">
                                        <Clock className="w-3 h-3 text-orange-400" />
                                        <span className="text-orange-400 font-black text-[clamp(13px,3.5vw,15px)] font-mono">{slot.startTime}</span>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                    <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-3 py-2 rounded-xl">
                                        <Clock className="w-3 h-3 text-orange-400" />
                                        <span className="text-orange-400 font-black text-[clamp(13px,3.5vw,15px)] font-mono">{slot.endTime}</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRemoveSlot(index)}
                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center py-8 bg-slate-900/40 rounded-xl border border-dashed border-slate-700/60">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-3">
                            <Clock className="w-6 h-6 text-slate-500" />
                        </div>
                        <p className="text-slate-400 text-sm font-bold mb-1">Henüz slot tanımlanmamış</p>
                        <p className="text-slate-600 text-[clamp(10px,2.8vw,12px)]">Aşağıdan yeni slotlar ekleyin</p>
                    </div>
                )}

                {/* Yeni slot ekleme */}
                <div className="bg-slate-900/40 rounded-xl border border-slate-700/40 p-3">
                    <p className="text-[clamp(9px,2.5vw,11px)] text-slate-500 font-bold uppercase tracking-wider mb-2.5">Yeni Slot Ekle</p>
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <label className="block text-[clamp(9px,2.5vw,11px)] text-slate-400 font-bold mb-1.5">Başlangıç</label>
                            <button
                                type="button"
                                onClick={() => setIsTimePickerOpen({ open: true, type: 'SLOT_START' })}
                                className="w-full p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl text-white text-left hover:border-orange-500/50 active:border-orange-500 transition-all font-mono font-black text-[clamp(14px,4vw,16px)] min-h-[48px]"
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                {newSlotStart}
                            </button>
                        </div>
                        <div className="flex-shrink-0 pt-6">
                            <ArrowRight className="w-4 h-4 text-slate-600" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[clamp(9px,2.5vw,11px)] text-slate-400 font-bold mb-1.5">Bitiş</label>
                            <button
                                type="button"
                                onClick={() => setIsTimePickerOpen({ open: true, type: 'SLOT_END' })}
                                className="w-full p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl text-white text-left hover:border-orange-500/50 active:border-orange-500 transition-all font-mono font-black text-[clamp(14px,4vw,16px)] min-h-[48px]"
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                {newSlotEnd}
                            </button>
                        </div>
                        <div className="flex-shrink-0 pt-6">
                            <button
                                type="button"
                                onClick={onAddSlot}
                                className="w-12 h-12 bg-orange-500 hover:bg-orange-400 active:scale-95 text-white rounded-xl font-bold transition-all flex items-center justify-center shadow-lg shadow-orange-500/20"
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <BusinessTimePickerModal
                    isOpen={isTimePickerOpen.open && (isTimePickerOpen.type === 'SLOT_START' || isTimePickerOpen.type === 'SLOT_END')}
                    onClose={() => setIsTimePickerOpen({ ...isTimePickerOpen, open: false })}
                    title={isTimePickerOpen.type === 'SLOT_START' ? 'SLOT BAŞLANGIÇ' : 'SLOT BİTİŞ'}
                    initialTime={isTimePickerOpen.type === 'SLOT_START' ? newSlotStart : newSlotEnd}
                    onSelect={(time) => {
                        if (isTimePickerOpen.type === 'SLOT_START') setNewSlotStart(time);
                        else setNewSlotEnd(time);
                    }}
                />

                <button
                    type="button"
                    onClick={onSaveSlots}
                    disabled={savingSlots}
                    className="w-full py-3.5 rounded-xl font-black text-white transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 active:scale-[0.98]"
                    style={{
                        WebkitTapHighlightColor: 'transparent',
                        background: savingSlots ? '#334155' : 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                        boxShadow: savingSlots ? 'none' : '0 4px 16px rgba(234,88,12,0.25)',
                    }}
                >
                    <Save className="w-4 h-4" />
                    {savingSlots ? 'Kaydediliyor...' : (
                        <span className="flex items-center gap-2">
                            Slotları Kaydet
                            {timeSlots.length > 0 && (
                                <span className="bg-white/20 text-white text-xs font-black px-2 py-0.5 rounded-full">
                                    {timeSlots.length}
                                </span>
                            )}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
};
