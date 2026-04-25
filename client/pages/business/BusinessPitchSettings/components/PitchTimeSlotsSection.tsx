import React from 'react';
import { Clock, Plus, Save, Trash2 } from 'lucide-react';
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
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-4">
            <div>
                <h2 className="text-lg font-bold text-orange-500 mb-1 flex items-center gap-2">
                    <Clock className="w-5 h-5" /> Saat Slotları
                </h2>
                <p className="text-xs text-slate-400">
                    {pitchOpenTime && pitchCloseTime
                        ? `Slotlar ${pitchOpenTime}–${pitchCloseTime} saatleri arasında olmalı. Çakışan slotlar eklenemez.`
                        : 'Maç oynanacak saat dilimlerini tanımlayın. Çakışan slotlar eklenemez.'}
                </p>
            </div>

            {slotsSuccess && (
                <div className="p-3 bg-green-600/20 border border-green-500 rounded-xl text-green-500 font-bold text-center text-sm">
                    ✓ Saat slotları kaydedildi!
                </div>
            )}

            {slotError && (
                <div className="p-3 bg-red-500/10 border border-red-500/40 rounded-xl text-red-400 text-sm font-medium">
                    {slotError}
                </div>
            )}

            {timeSlots.length > 0 ? (
                <div className="space-y-2">
                    {timeSlots.map((slot, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="bg-orange-500/20 px-3 py-1 rounded-lg">
                                    <span className="text-orange-400 font-black text-lg font-mono">{slot.startTime}</span>
                                </div>
                                <span className="text-slate-500 font-bold">→</span>
                                <div className="bg-orange-500/20 px-3 py-1 rounded-lg">
                                    <span className="text-orange-400 font-black text-lg font-mono">{slot.endTime}</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemoveSlot(index)}
                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6 bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
                    <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Henüz saat slotu tanımlanmamış.</p>
                    <p className="text-slate-600 text-xs">Aşağıdan yeni slotlar ekleyin.</p>
                </div>
            )}

            {/* Yeni slot ekleme */}
            <div className="flex items-end gap-2">
                <div className="flex-1">
                    <label className="block text-xs text-slate-400 font-bold mb-1">Başlangıç</label>
                    <button
                        type="button"
                        onClick={() => setIsTimePickerOpen({ open: true, type: 'SLOT_START' })}
                        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-left hover:border-orange-500 transition-all font-mono font-bold min-h-[44px]"
                    >
                        {newSlotStart}
                    </button>
                </div>
                <div className="flex-1">
                    <label className="block text-xs text-slate-400 font-bold mb-1">Bitiş</label>
                    <button
                        type="button"
                        onClick={() => setIsTimePickerOpen({ open: true, type: 'SLOT_END' })}
                        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-left hover:border-orange-500 transition-all font-mono font-bold min-h-[44px]"
                    >
                        {newSlotEnd}
                    </button>
                </div>
                <button
                    type="button"
                    onClick={onAddSlot}
                    className="bg-orange-600 hover:bg-orange-500 text-white p-3 rounded-lg font-bold transition-colors flex items-center gap-1 min-h-[44px] min-w-[44px] justify-center"
                >
                    <Plus className="w-5 h-5" />
                </button>
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
                className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 disabled:from-slate-700 disabled:to-slate-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
                <Save className="w-4 h-4" />
                {savingSlots ? 'Kaydediliyor...' : `Slotları Kaydet (${timeSlots.length} slot)`}
            </button>
        </div>
    );
};
