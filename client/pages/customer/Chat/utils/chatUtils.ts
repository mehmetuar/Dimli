export const formatMessageDate = (dateString: string | Date) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Dün';
    }

    if (diff < 7 * oneDay) {
        return date.toLocaleDateString('tr-TR', { weekday: 'long' });
    }

    return date.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

export const getMatchStatusInfo = (reservation?: { status: string; slotTime: string }): {
    label: string;
    borderColor: string;
    badgeColor: string;
    textColor: string;
    bgTint: string;
    type: 'pending' | 'confirmed' | 'played' | 'unplayed';
} | null => {
    if (!reservation) return null;

    const now = new Date();
    const slotDate = new Date(reservation.slotTime);
    const matchEndTime = new Date(slotDate.getTime() + 60 * 60 * 1000);

    if (reservation.status === 'REJECTED' || reservation.status === 'CANCELLED') {
        return { label: 'Oynanmamış Maç', borderColor: 'border-red-500/60', badgeColor: '#ef4444', textColor: 'text-red-400', bgTint: 'bg-red-500/5', type: 'unplayed' };
    }
    if (now > slotDate && reservation.status !== 'APPROVED') {
        return { label: 'Oynanmamış Maç', borderColor: 'border-red-500/60', badgeColor: '#ef4444', textColor: 'text-red-400', bgTint: 'bg-red-500/5', type: 'unplayed' };
    }
    if (reservation.status === 'PENDING') {
        return { label: 'Onay Bekliyor', borderColor: 'border-orange-500/60', badgeColor: '#f97316', textColor: 'text-orange-400', bgTint: 'bg-orange-500/5', type: 'pending' };
    }
    if (reservation.status === 'APPROVED' && now <= matchEndTime) {
        return { label: 'Kesinleşti', borderColor: 'border-green-500/60', badgeColor: '#22c55e', textColor: 'text-green-400', bgTint: 'bg-green-500/5', type: 'confirmed' };
    }
    if (reservation.status === 'APPROVED' && now > matchEndTime) {
        return { label: 'Oynanmış Maç', borderColor: 'border-blue-500/60', badgeColor: '#3b82f6', textColor: 'text-blue-400', bgTint: 'bg-blue-500/5', type: 'played' };
    }
    return null;
};
