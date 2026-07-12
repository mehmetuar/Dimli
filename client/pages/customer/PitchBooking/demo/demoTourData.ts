import { Business } from '../../../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Tanıtım turu demo işletmesi — %100 istemci tarafı sahte veri. Sunucuda
// karşılığı YOKTUR ve olmayacaktır: hiçbir listeye/cache'e yazılmaz, hiçbir
// isteğe konu olmaz (api.ts'teki 'demo-' interceptor'ı ek emniyet kemeridir).
// Tur aktifken usePitchBooking render'da listenin başına ekler; slot durum
// çeşitliliği (DOLU / ONAY BEKLİYOR / RAKİP ARANIYOR) aşağıdaki fikstürlerle
// beslenir — kullanıcı renklerin anlamını gerçek örnekle görür.
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_BUSINESS_ID = 'demo-biz-dimli';
export const DEMO_PITCH_ID = 'demo-pitch-1';

export const isDemoId = (id?: string | null): boolean => !!id && id.startsWith('demo-');

export const DEMO_TEAM = {
    id: 'demo-team',
    name: 'Örnek Takımım',
    logoUrl: '/icon.png',
};

// Sahte slotları/ilanları dolduran hayali rakip takımlar (ActiveMatchesList
// MatchCard'ının okuduğu tüm alanlar dolu — LevelBadge/FairPlayScore hatasız
// çizer). logoUrl bilinçli boş: baş-harf avatarı (teamInitialsAvatar) düşer.
const DEMO_RIVAL_TEAM = {
    id: 'demo-team-rival',
    name: 'Demo United',
    logoUrl: '',
    level: 'INTERMEDIATE',
    fairPlayScore: 4.8,
    fairPlayRatingCount: 12,
};

const DEMO_RIVAL_TEAM_2 = {
    id: 'demo-team-rival-2',
    name: 'Demo City',
    logoUrl: '',
    level: 'ADVANCED',
    fairPlayScore: 4.5,
    fairPlayRatingCount: 8,
};

// 15:00–24:00 — 9 slot (3x3 ızgara); iki saha da aynı saat şablonunu kullanır
const buildDemoSlots = (pitchNo: number) =>
    ['15', '16', '17', '18', '19', '20', '21', '22', '23'].map((h) => ({
        id: `demo-slot-p${pitchNo}-${h}`,
        startTime: `${h}:00`,
        endTime: `${String((Number(h) + 1) % 24).padStart(2, '0')}:00`,
        isActive: true,
    }));

const demoBusinessRaw = {
    id: DEMO_BUSINESS_ID,
    name: 'Dimli Halı Saha',
    city: 'Dimli',
    district: 'Tanıtım',
    // İnce "test işletmesi" dokunuşu: adres satırı örnek olduğunu açıkça söyler
    address: 'Uygulamayı tanıman için hazırlanmış örnek işletme. Gerçek bir saha değildir, rezervasyon kabul etmez.',
    location: 'Tanıtım, Dimli',
    latitude: 39.9208,
    longitude: 32.8541,
    rating: 5.0,
    ratingCount: 0,
    phone: '',
    ownerPhone: null, // Ara butonu demo'da zaten etkisiz (PitchSchedule isDemo yolu)
    coverImageUrl: '/demosaha.JPG', // paketli gerçek saha fotoğrafı (1280×720, aspect-video)
    // distanceKm bilinçli YOK: km rozeti çıkmaz — gerçek işletmelerden ayıran ince ipucu
    // 2 saha: sekme geçişi tur adımıyla gösterilir (PITCH TABS yalnız 1+ sahada çıkar)
    pitches: [
        {
            id: DEMO_PITCH_ID,
            name: '1 Nolu Saha',
            businessId: DEMO_BUSINESS_ID,
            type: 'OUTDOOR',
            pricePerHour: 1200,
            imageUrl: '/demosaha.JPG',
            facilities: ['Duş', 'Otopark', 'Kafeterya', 'Soyunma Odası', 'Kamera Kaydı', 'Krampon Kiralama'],
            isActive: true,
            closedDays: [],
            scheduledDeletionAt: null,
            timeSlots: buildDemoSlots(1),
        },
        {
            id: 'demo-pitch-2',
            name: '2 Nolu Saha',
            businessId: DEMO_BUSINESS_ID,
            type: 'INDOOR',
            pricePerHour: 1400,
            imageUrl: '/demosaha.JPG',
            facilities: ['Duş', 'Otopark', 'Isıtmalı Salon', 'Soyunma Odası', 'Kamera Kaydı', 'Krampon Kiralama'],
            isActive: true,
            closedDays: [],
            scheduledDeletionAt: null,
            timeSlots: buildDemoSlots(2),
        },
    ],
};

export const DEMO_BUSINESS = demoBusinessRaw as unknown as Business;

// Cihaz-YEREL saat kur: PitchSchedule slot eşleşmesini getHours() ile yapar
const localSlotTime = (date: string, hour: string): string =>
    new Date(`${date}T${hour}:00:00`).toISOString();

/**
 * Sahte rezervasyonlar — 16:00 ve 18:00 DOLU (onaylı, takımlı), 19:00 ONAY
 * BEKLİYOR. 20:00 (tur hedefi) ve kalanlar BOŞ.
 */
export const getDemoReservations = (date: string): any[] => [
    {
        id: 'demo-res-approved-16',
        status: 'APPROVED',
        type: 'MATCH',
        slotTime: localSlotTime(date, '16'),
        team: DEMO_RIVAL_TEAM_2,
    },
    {
        id: 'demo-res-approved-18',
        status: 'APPROVED',
        type: 'MATCH',
        slotTime: localSlotTime(date, '18'),
        team: DEMO_RIVAL_TEAM,
    },
    {
        id: 'demo-res-pending',
        status: 'PENDING',
        type: 'MATCH',
        slotTime: localSlotTime(date, '19'),
        team: DEMO_RIVAL_TEAM,
    },
];

/**
 * Sahte ilan — bugün 21:00 RAKİP ARANIYOR (slotu da yakar). TEK ilanla sınırlı
 * (v7): "BURADA RAKİP ARAYANLAR (1)" bölümü başlık + tek kart boyutunda kalır,
 * tur spotlight'ı tam bu kadrajı çerçeveler (uzun bölüm kartları ortadan
 * kesiyordu). Tur blokerleri karta dokunmayı zaten engeller.
 */
export const getDemoAnnouncements = (date: string): any[] => [
    {
        id: 'demo-ann-rakip-1',
        teamId: DEMO_RIVAL_TEAM.id,
        team: DEMO_RIVAL_TEAM,
        pitchId: DEMO_PITCH_ID,
        date,
        time: '21:00',
        playerCount: 7,
        description: '',
        status: 'PENDING',
        matchType: 'rakip_araniyor',
        createdAt: localSlotTime(date, '12'),
    },
];

// ── Joker turu fikstürleri ──────────────────────────────────────────────────

/**
 * Sahte joker "Oyuncu 1" — Joker turu aktifken useJokerPool listenin başına
 * render-türetilmiş ekler (state/cache görmez). distanceKm bilinçli YOK.
 */
export const DEMO_JOKER = {
    id: 'demo-joker-1',
    full_name: 'Oyuncu 1',
    username: 'oyuncu1',
    avatarUrl: '', // ui-avatars fallback devreye girer
    location: 'Tanıtım, Dimli',
    position: 'ORTA SAHA',
    secondaryPosition: 'FORVET',
    foot: 'Sağ',
    nationality: 'TR',
    birthDate: '2001-05-15',
    sharesFee: true,
    isJoker: true,
};

/**
 * Sahte davet maçı — InviteJokerModal'ın demo dalında tek seçenek olarak
 * listelenir: "Dimli Halı Saha — Ana Saha, bugün/yarın 20:00". Gerçek kanal
 * listesi/davet POST'u demo'da HİÇ çalışmaz.
 */
export const getDemoInviteChannel = (): any => {
    const d = new Date();
    d.setHours(20, 0, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
    return {
        id: 'demo-channel-1',
        type: 'MATCH_GROUP',
        relatedMatchId: 'demo-match-1',
        name: `${DEMO_TEAM.name} (Kendi Aramızda)`,
        pitch: { name: 'Dimli Halı Saha — Ana Saha' },
        reservation: {
            slotTime: d.toISOString(),
            status: 'PENDING',
            teamId: DEMO_TEAM.id,
        },
        participants: [],
    };
};
