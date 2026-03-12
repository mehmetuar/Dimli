import React from 'react';
import { X, Clock, Plus, ListChecks } from 'lucide-react';
import { BusinessTimePickerModal } from '../../../../components/Modals/BusinessTimePickerModal';
import { DEFAULT_FACILITIES } from '../../../../constants';

interface AddPitchModalProps {
    newPitchData: any;
    setNewPitchData: (data: any) => void;
    isTimePickerOpen: { open: boolean; type: 'OPEN' | 'CLOSE' | 'SLOT_START' | 'SLOT_END' };
    setIsTimePickerOpen: (state: { open: boolean; type: 'OPEN' | 'CLOSE' | 'SLOT_START' | 'SLOT_END' }) => void;
    tempSlot: { startTime: string; endTime: string };
    setTempSlot: (slot: { startTime: string; endTime: string }) => void;
    adding: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    toggleFacility: (facility: string) => void;
    addTimeSlot: (start: string, end: string) => void;
    removeTimeSlot: (index: number) => void;
}

export const AddPitchModal: React.FC<AddPitchModalProps> = ({
    newPitchData, setNewPitchData,
    isTimePickerOpen, setIsTimePickerOpen,
    tempSlot, setTempSlot,
    adding, onClose, onSubmit,
    toggleFacility, addTimeSlot, removeTimeSlot
}) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Yeni Saha Ekle</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-2 text-slate-300">Saha Adı</label>
                            <input
                                type="text" required
                                placeholder="Örn: 1 No'lu Saha"
                                value={newPitchData.name}
                                onChange={e => setNewPitchData({ ...newPitchData, name: e.target.value })}
                                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2 text-slate-300">Saha Tipi</label>
                            <select
                                value={newPitchData.type}
                                onChange={e => setNewPitchData({ ...newPitchData, type: e.target.value })}
                                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                            >
                                <option value="INDOOR">Kapalı Saha</option>
                                <option value="OUTDOOR">Açık Saha</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2 text-slate-300">Saatlik Ücret (TL)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₺</span>
                                <input
                                    type="number" required placeholder="0.00"
                                    value={newPitchData.pricePerHour}
                                    onChange={e => setNewPitchData({ ...newPitchData, pricePerHour: e.target.value })}
                                    className="w-full pl-8 p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-800">
                            <div>
                                <label className="block text-sm font-bold mb-2 text-slate-300 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Açılış
                                </label>
                                <button type="button"
                                    onClick={() => setIsTimePickerOpen({ open: true, type: 'OPEN' })}
                                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-left hover:border-orange-500 transition-all font-mono font-bold"
                                >
                                    {newPitchData.openTime}
                                </button>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2 text-slate-300 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Kapanış
                                </label>
                                <button type="button"
                                    onClick={() => setIsTimePickerOpen({ open: true, type: 'CLOSE' })}
                                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-left hover:border-orange-500 transition-all font-mono font-bold"
                                >
                                    {newPitchData.closeTime}
                                </button>
                            </div>
                        </div>

                        <BusinessTimePickerModal
                            isOpen={isTimePickerOpen.open && (isTimePickerOpen.type === 'OPEN' || isTimePickerOpen.type === 'CLOSE')}
                            onClose={() => setIsTimePickerOpen({ ...isTimePickerOpen, open: false })}
                            title={isTimePickerOpen.type === 'OPEN' ? "AÇILIŞ SAATİ" : "KAPANIŞ SAATİ"}
                            initialTime={isTimePickerOpen.type === 'OPEN' ? newPitchData.openTime : newPitchData.closeTime}
                            onSelect={(time) => {
                                if (isTimePickerOpen.type === 'OPEN') setNewPitchData({ ...newPitchData, openTime: time });
                                else setNewPitchData({ ...newPitchData, closeTime: time });
                            }}
                        />

                        {/* Time Slots */}
                        <div className="space-y-4 py-4">
                            <label className="block text-sm font-bold text-slate-300">Özel Saatler (Opsiyonel)</label>
                            <p className="text-[10px] text-slate-500">Kendi kiralama saatlerinizi belirleyin. Belirtmezseniz saatlik otomatik oluşturulur.</p>

                            <div className="space-y-2">
                                {newPitchData.timeSlots.map((slot: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between bg-slate-800 p-2 rounded-lg border border-slate-700">
                                        <span className="text-sm font-bold text-orange-400">{slot.startTime} - {slot.endTime}</span>
                                        <button type="button" onClick={() => removeTimeSlot(idx)} className="text-red-500 hover:text-red-400">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2 items-center">
                                <div className="flex-1 space-y-1">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Başlangıç</p>
                                    <button type="button"
                                        onClick={() => setIsTimePickerOpen({ open: true, type: 'SLOT_START' })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl text-sm font-mono font-bold hover:border-orange-500"
                                    >
                                        {tempSlot.startTime || "00:00"}
                                    </button>
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Bitiş</p>
                                    <button type="button"
                                        onClick={() => setIsTimePickerOpen({ open: true, type: 'SLOT_END' })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl text-sm font-mono font-bold hover:border-orange-500"
                                    >
                                        {tempSlot.endTime || "00:00"}
                                    </button>
                                </div>
                                <button type="button"
                                    onClick={() => addTimeSlot(tempSlot.startTime, tempSlot.endTime)}
                                    className="bg-orange-600 hover:bg-orange-500 text-white p-3 rounded-xl shadow-lg shadow-orange-600/20 self-end transition-all"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            <BusinessTimePickerModal
                                isOpen={isTimePickerOpen.open && (isTimePickerOpen.type === 'SLOT_START' || isTimePickerOpen.type === 'SLOT_END')}
                                onClose={() => setIsTimePickerOpen({ ...isTimePickerOpen, open: false })}
                                title={isTimePickerOpen.type === 'SLOT_START' ? "SLOT BAŞLANGIÇ" : "SLOT BİTİŞ"}
                                initialTime={isTimePickerOpen.type === 'SLOT_START' ? tempSlot.startTime : tempSlot.endTime}
                                onSelect={(time) => {
                                    if (isTimePickerOpen.type === 'SLOT_START') setTempSlot({ ...tempSlot, startTime: time });
                                    else setTempSlot({ ...tempSlot, endTime: time });
                                }}
                            />
                        </div>

                        {/* Facilities */}
                        <div>
                            <label className="block text-sm font-bold mb-2 text-slate-300 flex items-center gap-1">
                                <ListChecks className="w-3 h-3" /> İmkanlar
                            </label>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 scrollbar-hide">
                                {DEFAULT_FACILITIES.map(facility => (
                                    <button key={facility} type="button"
                                        onClick={() => toggleFacility(facility)}
                                        className={`p-2 rounded-lg text-xs font-bold transition-all border ${newPitchData.facilities.includes(facility)
                                            ? 'bg-orange-500/20 border-orange-500 text-orange-500'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                            }`}
                                    >
                                        {facility}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button type="submit" disabled={adding}
                            className="w-full bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-600/20 disabled:opacity-50 mt-2"
                        >
                            {adding ? 'Ekleniyor...' : 'Saha Oluştur'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
