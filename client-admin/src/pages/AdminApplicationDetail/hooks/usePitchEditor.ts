import { useState } from 'react';
import { EditPitch, EditSlot, parseFacilities } from '../types';

export const usePitchEditor = () => {
    const [editPitches, setEditPitches] = useState<EditPitch[]>([]);

    const initPitches = (pitches: any[]) => {
        setEditPitches(pitches.map((p: any) => ({
            id: p.id,
            name: p.name ?? '',
            type: p.type ?? '',
            pricePerHour: p.pricePerHour?.toString() ?? '',
            facilities: parseFacilities(p.facilities),
            imageUrl: p.imageUrl ?? '',
            timeSlots: (p.timeSlots ?? []).map((s: any): EditSlot => ({
                _key: s.id,
                id: s.id,
                startTime: s.startTime,
                endTime: s.endTime,
                isActive: s.isActive,
                _delete: false,
            })),
        })));
    };

    const updatePitch = (pitchId: string, changes: Partial<EditPitch>) =>
        setEditPitches(prev => prev.map(p => p.id === pitchId ? { ...p, ...changes } : p));

    return { editPitches, setEditPitches, initPitches, updatePitch };
};
