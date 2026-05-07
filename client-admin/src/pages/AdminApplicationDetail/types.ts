export interface EditSlot {
    _key: string;
    id?: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
    _delete: boolean;
}

export interface EditPitch {
    id: string;
    name: string;
    type: string;
    pricePerHour: string;
    facilities: string[];
    imageUrl: string;
    timeSlots: EditSlot[];
}

export const parseFacilities = (raw: string[] | string | null | undefined): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(f => f && f.trim().length > 0);
    if (typeof raw === 'string' && raw.length > 0) return raw.split(',').map(f => f.trim()).filter(Boolean);
    return [];
};
