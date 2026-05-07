import React, { useState } from 'react';
import { IconCheck, IconClock, IconTrash, IconPlus } from '../../../components/Icons';
import { EditSlot } from '../types';

let tempSlotCounter = 0;
const newKey = () => `new_${++tempSlotCounter}`;

interface TimeSlotsEditProps {
    slots: EditSlot[];
    onChange: (slots: EditSlot[]) => void;
}

const TimeSlotsEdit: React.FC<TimeSlotsEditProps> = ({ slots, onChange }) => {
    const [newStart, setNewStart] = useState('');
    const [newEnd, setNewEnd] = useState('');

    const active = slots.filter(s => !s._delete);

    const toggle = (key: string) =>
        onChange(slots.map(s => s._key === key ? { ...s, isActive: !s.isActive } : s));

    const markDelete = (key: string) =>
        onChange(slots.map(s => s._key === key ? { ...s, _delete: true } : s));

    const addSlot = () => {
        if (!newStart || !newEnd) return;
        onChange([...slots, { _key: newKey(), startTime: newStart, endTime: newEnd, isActive: true, _delete: false }]);
        setNewStart('');
        setNewEnd('');
    };

    return (
        <div className="space-y-3">
            {active.length === 0 && (
                <p className="text-slate-500 text-xs italic">Slot yok — aşağıdan ekleyebilirsiniz</p>
            )}
            <div className="flex flex-wrap gap-2">
                {active.map(slot => (
                    <div
                        key={slot._key}
                        className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all
                            ${slot.isActive
                                ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                                : 'bg-slate-800/60 border-slate-700/60 text-slate-500'}`}
                    >
                        {slot.startTime}–{slot.endTime}
                        <button
                            onClick={() => toggle(slot._key)}
                            title={slot.isActive ? 'Pasif yap' : 'Aktif yap'}
                            className={`rounded-full p-0.5 transition-colors ${slot.isActive ? 'text-orange-400 hover:text-slate-400' : 'text-slate-600 hover:text-orange-400'}`}
                        >
                            {slot.isActive ? <IconCheck size={10} /> : <IconClock size={10} />}
                        </button>
                        <button
                            onClick={() => markDelete(slot._key)}
                            title="Slotu sil"
                            className="text-slate-600 hover:text-red-400 transition-colors rounded-full p-0.5"
                        >
                            <IconTrash size={10} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                    <input
                        type="time"
                        value={newStart}
                        onChange={e => setNewStart(e.target.value)}
                        className="bg-[#253352] border border-slate-600/60 text-[#dde8f5] px-2 py-1 rounded-lg focus:outline-none focus:border-orange-500 text-xs"
                    />
                    <span className="text-slate-500 text-xs">–</span>
                    <input
                        type="time"
                        value={newEnd}
                        onChange={e => setNewEnd(e.target.value)}
                        className="bg-[#253352] border border-slate-600/60 text-[#dde8f5] px-2 py-1 rounded-lg focus:outline-none focus:border-orange-500 text-xs"
                    />
                </div>
                <button
                    onClick={addSlot}
                    disabled={!newStart || !newEnd}
                    className="flex items-center gap-1 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-300 px-3 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                >
                    <IconPlus size={11} /> Slot Ekle
                </button>
            </div>
        </div>
    );
};

export default TimeSlotsEdit;
