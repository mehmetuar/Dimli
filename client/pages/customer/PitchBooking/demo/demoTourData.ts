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
    // Bilinçli boş: TeamHeaderCard yerleşik 2-harf gradyan logosunu ("ÖR")
    // çizer — takım kurulumundaki default logo; görsel kırpma/ölçek sorunu
    // yapısal olarak imkânsız (icon.png şeffaf kenarları daireyi bozuyordu)
    logoUrl: '',
};

// Sahte slotları/ilanları dolduran hayali rakip takımlar (ActiveMatchesList
// MatchCard'ının + TeamDetailModal'ın okuduğu tüm alanlar dolu). logoUrl
// bilinçli boş: baş-harf avatarı (teamInitialsAvatar) düşer.
export const DEMO_RIVAL_TEAM = {
    id: 'demo-team-rival',
    name: 'Dimli United',
    logoUrl: '',
    // HEX (tailwind sınıfı değil): UpcomingMatchesModal gradyanı rengi ham
    // kullanır; toHex hex'i passthrough eder — lacivert
    primaryColor: '#1e3a8a',
    secondaryColor: '#1e40af',
    level: 'INTERMEDIATE',
    fairPlayScore: 4.8,
    fairPlayRatingCount: 12,
    playedMatchCount: 24,
    captainId: 'demo-rival-p1',
    viceCaptainIds: ['demo-rival-p2'],
    description: 'Tanıtım takımı — Maç Pazarı örnek ilanının sahibi.',
    // name alanı ŞART: TeamDetailModal kadroyu player.name ile çizer
    players: [
        { id: 'demo-rival-p1', name: 'Oyuncu 1', full_name: 'Oyuncu 1', username: 'oyuncu1', avatarUrl: '', position: 'ORTA SAHA' },
        { id: 'demo-rival-p2', name: 'Oyuncu 2', full_name: 'Oyuncu 2', username: 'oyuncu2', avatarUrl: '', position: 'DEFANS' },
    ],
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
    // İnce "test işletmesi" dokunuşu: kısa tutulur — işletme kartında imkanlara
    // yer kalsın (v18)
    address: 'Örnek işletme — rezervasyon kabul etmez.',
    location: 'Tanıtım, Dimli',
    latitude: 39.9208,
    longitude: 32.8541,
    rating: 4.7,
    ratingCount: 42,
    phone: '',
    // Dummy numara: BusinessInfoModal'da düzgün "Ara" butonu görünsün (tur
    // blokerleri tıklamayı engeller; PitchSchedule demo Ara zaten no-op)
    ownerPhone: '+90 (312) 000 00 00',
    // Herkese sabit dummy uzaklık (kullanıcı kararı)
    distanceKm: 7.42,
    coverImageUrl: '/demosaha.JPG', // paketli gerçek saha fotoğrafı (1280×720, aspect-video)
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

// ── Maç Pazarı turu fikstürü ────────────────────────────────────────────────

/**
 * Maç Pazarı demo ilanı — "Dimli United rakip arıyor". Tur aktifken
 * useMarketplace render'da listenin başına ekler; kart tamamen bu objeden
 * çizilir (kart başına fetch yok). distanceKm bilinçli YOK.
 */
export const getDemoMarketAd = (date: string): any => ({
    id: 'demo-ann-market-1',
    teamId: DEMO_RIVAL_TEAM.id,
    team: DEMO_RIVAL_TEAM,
    distanceKm: 7.42,
    date,
    time: '21:00',
    playerCount: 7,
    description: 'Tanıtım ilanı — örnek bir maç ilanıdır.',
    status: 'PENDING',
    matchType: 'rakip_araniyor',
    createdAt: localSlotTime(date, '10'),
    pendingChallengeCount: 0,
    pitchSummary: {
        id: DEMO_PITCH_ID,
        name: '1 Nolu Saha',
        pricePerHour: 1200,
        imageUrl: '/demosaha.JPG',
        endTime: '22:00',
        business: {
            id: DEMO_BUSINESS_ID,
            name: 'Dimli Halı Saha',
            district: 'Tanıtım',
            city: 'Dimli',
        },
    },
});

// ── Takımım turu fikstürleri ────────────────────────────────────────────────

/**
 * Kullanıcının demo takımı "Örnek Takımım" — Takımım turunda gerçek MyTeam
 * sayfası render'da bununla beslenir. captainId GERÇEK kullanıcıdır: kaptan-özel
 * tüm kontroller (oyuncu ekle, yrd. kaptan, favori işletme, İlan Oluştur)
 * görünür. Oyuncu 2 hazır yardımcı kaptan (taç ikonu anlatım adımı için).
 */
export const getDemoMyTeam = (currentUser: any): any => ({
    ...DEMO_TEAM,
    shortId: 'ORNEK-1',
    // Koyu yeşil HEX (kesinleşmiş maç logosu gradyanı için; lacivert rakiple kontrast)
    primaryColor: '#14532d',
    secondaryColor: '#166534',
    level: 'INTERMEDIATE',
    fairPlayScore: 4.9,
    fairPlayRatingCount: 6,
    playedMatchCount: 12,
    captainId: currentUser?.id ?? 'demo-me',
    captain: { id: currentUser?.id ?? 'demo-me', full_name: currentUser?.full_name, username: currentUser?.username },
    viceCaptainIds: ['demo-player-2'],
    homeBusinessId: DEMO_BUSINESS_ID,
    description: 'Sahaların yeni yıldızı',
    players: [
        {
            id: currentUser?.id ?? 'demo-me',
            full_name: currentUser?.full_name || 'Sen',
            username: currentUser?.username || 'sen',
            avatarUrl: currentUser?.avatarUrl || '',
            position: currentUser?.position || 'ORTA SAHA',
        },
        { id: 'demo-player-2', full_name: 'Oyuncu 2', username: 'oyuncu2', avatarUrl: '', position: 'DEFANS' },
        { id: 'demo-player-3', full_name: 'Oyuncu 3', username: 'oyuncu3', avatarUrl: '', position: 'FORVET' },
        { id: 'demo-player-4', full_name: 'Oyuncu 4', username: 'oyuncu4', avatarUrl: '', position: 'KALECİ' },
    ],
});

/** Yaklaşan Maçlar modalı fikstürü — işletme onaylı (Kesinleştirildi) 1 maç. */
export const getDemoUpcomingMatches = (currentUser: any): any[] => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(20, 0, 0, 0);
    const myTeam = getDemoMyTeam(currentUser);
    return [
        {
            id: 'demo-upcoming-1',
            slotTime: d.toISOString(),
            status: 'APPROVED',
            endTime: '21:00',
            distanceKm: 7.42, // sabit dummy — koordinat hesabı devreye girmesin
            pitch: {
                name: '1 Nolu Saha',
                timeSlots: [{ startTime: '20:00', endTime: '21:00' }],
                business: {
                    name: 'Dimli Halı Saha',
                    address: 'Örnek işletme',
                    district: 'Tanıtım',
                },
            },
            team: { id: myTeam.id, name: myTeam.name, logoUrl: '', primaryColor: myTeam.primaryColor, level: myTeam.level },
            opponentTeam: { id: DEMO_RIVAL_TEAM.id, name: DEMO_RIVAL_TEAM.name, logoUrl: '', primaryColor: DEMO_RIVAL_TEAM.primaryColor, level: DEMO_RIVAL_TEAM.level },
        },
    ];
};

/** Geçmiş Maçlar fikstürü — değerlendirme BEKLEYEN 1 maç (Değerlendir akışı). */
export const getDemoMatchHistory = (): any[] => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    d.setHours(20, 0, 0, 0);
    return [
        {
            reservationId: 'demo-history-1',
            slotTime: d.toISOString(),
            pitchName: '1 Nolu Saha',
            businessName: 'Dimli Halı Saha',
            businessId: DEMO_BUSINESS_ID,
            businessDeleted: false,
            opponentTeamId: DEMO_RIVAL_TEAM.id,
            opponentTeamName: DEMO_RIVAL_TEAM.name,
            isBusinessRated: false,
            isFairPlayRated: false,
            businessScore: null,
            fairPlayScore: null,
            needsBusinessRating: true,
            needsFairPlayRating: true,
            participated: true,
        },
    ];
};

/** Takım İstekleri fikstürü — 1 meydan okuma + Oyuncu 1'e joker daveti
 *  (joker turundaki davetin devamı görünümü — turlar arası süreklilik). */
export const getDemoTeamRequests = (): { challenges: any[]; jokerGroups: any[] } => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
        challenges: [
            {
                id: 'demo-challenge-1',
                status: 'PENDING',
                match: {
                    team: { name: DEMO_RIVAL_TEAM.name },
                    pitch: { name: '1 Nolu Saha', business: { name: 'Dimli Halı Saha', district: 'Tanıtım' } },
                    date: dateStr,
                    time: '21:00',
                },
            },
        ],
        jokerGroups: [
            {
                matchId: 'demo-match-1',
                businessName: 'Dimli Halı Saha',
                pitchName: '1 Nolu Saha',
                district: 'Tanıtım',
                opponentTeamName: null,
                matchType: 'kendi_aramizda',
                date: dateStr,
                time: '20:00',
                jokers: [
                    { jokerId: 'demo-joker-1', name: 'Oyuncu 1', status: 'PENDING', position: 'ORTA SAHA', avatarUrl: '', foot: 'Sağ' },
                ],
            },
        ],
    };
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
