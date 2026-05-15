export const isPastSlot = (startTime: string, date: string): boolean => {
    const now = new Date();
    const [h, m] = startTime.split(':').map(Number);
    const slotDate = new Date(date);
    slotDate.setHours(h, m || 0, 0, 0);
    return slotDate < now;
};

// 00-05 arası saatler "ertesi gün" → diğer slotlardan sonra sıralanır.
const timeToSortMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    const minutes = h * 60 + m;
    return h < 6 ? minutes + 24 * 60 : minutes;
};

export const sortSlotsForDisplay = (slots: { startTime: string; endTime: string; status?: string }[]) => {
    return [...slots].sort((a, b) =>
        timeToSortMinutes(a.startTime) - timeToSortMinutes(b.startTime)
    );
};

export const groupMatchesByDate = (matches: any[]) => {
    const grouped: Record<string, any[]> = {};
    matches.forEach(match => {
        if (!grouped[match.date]) grouped[match.date] = [];
        grouped[match.date].push(match);
    });
    return grouped;
};

export const getRelativeDateLabel = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const date = new Date(dateStr);

    if (dateStr === today) return 'BUGÜN';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'YARIN';

    return date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
};

export const generateSlots = (pitch: any, business: any) => {
    if (pitch.timeSlots && pitch.timeSlots.length > 0) {
        const slots = pitch.timeSlots
            .filter((ts: any) => ts.isActive !== false)
            .map((ts: any) => ({
                startTime: ts.startTime,
                endTime: ts.endTime,
                status: 'AVAILABLE'
            }));
        return sortSlotsForDisplay(slots);
    }

    const openTime = pitch.openTime || business.openTime;
    const closeTime = pitch.closeTime || business.closeTime;

    if (!openTime || !closeTime) {
        return [18, 19, 20, 21, 22, 23].map(hour => ({
            startTime: `${hour.toString().padStart(2, '0')}:00`,
            endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
            status: 'AVAILABLE'
        }));
    }

    const open = parseInt(openTime.split(':')[0]);
    const close = parseInt(closeTime.split(':')[0]);
    const slots: any[] = [];

    if (close < open) {
        for (let hour = open; hour <= 23; hour++) {
            slots.push({
                startTime: `${hour.toString().padStart(2, '0')}:00`,
                endTime: `${((hour + 1) % 24).toString().padStart(2, '0')}:00`,
                status: 'AVAILABLE'
            });
        }
        for (let hour = 0; hour < close; hour++) {
            slots.push({
                startTime: `${hour.toString().padStart(2, '0')}:00`,
                endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
                status: 'AVAILABLE'
            });
        }
    } else {
        for (let hour = open; hour < close; hour++) {
            slots.push({
                startTime: `${hour.toString().padStart(2, '0')}:00`,
                endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
                status: 'AVAILABLE'
            });
        }
    }

    return slots;
};
