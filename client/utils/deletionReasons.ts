// Hesap silme nedenleri — hem kullanıcı (customer) hem işletme sahibi (business)
// silme akışlarında ortak kullanılır. Sunucu bu key'leri silme raporunda gruplar.
export interface DeletionReason {
    key: string;
    label: string;
}

export const DELETION_REASONS: DeletionReason[] = [
    { key: 'NOT_USING', label: 'Artık kullanmak istemiyorum' },
    { key: 'PRIVACY', label: 'Gizlilik endişelerim var' },
    { key: 'DIFFERENT_APP', label: 'Farklı bir uygulama kullanıyorum' },
    { key: 'NOT_SATISFIED', label: 'Uygulama beklentilerimi karşılamıyor' },
    { key: 'TECHNICAL', label: 'Teknik sorunlar yaşıyorum' },
    { key: 'OTHER', label: 'Diğer' },
];
