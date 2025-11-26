

import { SkillLevel, MatchListing, Pitch, Player, Position, Team, ChatChannel, ChatMessage, MatchOffer, Notification } from './types';

// Helper to generate random schedule
const generateMockSchedule = (startHour: number, endHour: number) => {
  const slots = [];
  for (let i = startHour; i < endHour; i++) {
    const rand = Math.random();
    // Just simple status for now, expanded logic in component
    let status: 'AVAILABLE' | 'BOOKED' | 'LOOKING_FOR_OPPONENT' = 'AVAILABLE';
    if (rand > 0.7) status = 'BOOKED';

    slots.push({
      hour: i,
      status,
      activeAdIds: []
    });
  }
  return slots;
};

export const MOCK_PITCHES: Pitch[] = [
  {
    id: 'p1',
    name: 'Mega Halı Saha',
    location: 'Üsküdar',
    rating: 4.5,
    pricePerHour: 800,
    imageUrl: 'https://picsum.photos/800/400?random=10',
    facilities: ['Duş', 'Kafeterya', 'Otopark', 'Video'],
    phone: '0555-111-2233',
    schedule: [
      { hour: 18, status: 'BOOKED', activeAdIds: [] },
      { hour: 19, status: 'AVAILABLE', activeAdIds: [] },
      { hour: 20, status: 'AVAILABLE', activeAdIds: [] },
      { hour: 21, status: 'LOOKING_FOR_OPPONENT', activeAdIds: ['m1'] },
      { hour: 22, status: 'BOOKED', activeAdIds: [] },
      { hour: 23, status: 'AVAILABLE', activeAdIds: [] },
    ]
  },
  {
    id: 'p2',
    name: 'Arena Spor Kompleksi',
    location: 'Beşiktaş',
    rating: 4.9,
    pricePerHour: 1200,
    imageUrl: 'https://picsum.photos/800/400?random=11',
    facilities: ['Duş', 'Krampon Kiralama', 'Video Kaydı', 'Tribün'],
    phone: '0555-444-5566',
    schedule: [
      { hour: 19, status: 'BOOKED', activeAdIds: [] },
      { hour: 20, status: 'BOOKED', activeAdIds: [] },
      { hour: 21, status: 'AVAILABLE', activeAdIds: [] },
      { hour: 22, status: 'LOOKING_FOR_OPPONENT', activeAdIds: ['m2'] },
      { hour: 23, status: 'AVAILABLE', activeAdIds: [] },
    ]
  },
  {
    id: 'p3',
    name: 'Yıldız Park Sahası',
    location: 'Şişli',
    rating: 4.2,
    pricePerHour: 900,
    imageUrl: 'https://picsum.photos/800/400?random=12',
    facilities: ['Otopark', 'Büfe'],
    phone: '0532-123-4567',
    schedule: [
      { hour: 18, status: 'AVAILABLE', activeAdIds: [] },
      { hour: 19, status: 'AVAILABLE', activeAdIds: [] },
      { hour: 20, status: 'BOOKED', activeAdIds: [] },
      { hour: 21, status: 'AVAILABLE', activeAdIds: [] },
      { hour: 22, status: 'BOOKED', activeAdIds: [] },
    ]
  },
  {
    id: 'p4',
    name: 'Maltepe Sahil Spor',
    location: 'Maltepe',
    rating: 4.7,
    pricePerHour: 1000,
    imageUrl: 'https://picsum.photos/800/400?random=13',
    facilities: ['Deniz Manzarası', 'Duş', 'Otopark'],
    phone: '0532-999-8877',
    schedule: generateMockSchedule(18, 24)
  },
  {
    id: 'p5',
    name: 'Ataşehir Olimpik',
    location: 'Ataşehir',
    rating: 4.8,
    pricePerHour: 1400,
    imageUrl: 'https://picsum.photos/800/400?random=14',
    facilities: ['Kapalı Saha', 'Klima', 'Servis'],
    phone: '0532-777-6655',
    schedule: generateMockSchedule(17, 23)
  },
  {
    id: 'p6',
    name: 'Beykoz Korusu Tesisleri',
    location: 'Beykoz',
    rating: 4.3,
    pricePerHour: 750,
    imageUrl: 'https://picsum.photos/800/400?random=15',
    facilities: ['Doğa İçinde', 'Büfe'],
    phone: '0532-555-4433',
    schedule: generateMockSchedule(16, 22)
  }
];

export const MOCK_TEAMS: Team[] = [
  {
    id: 't1',
    name: 'Kadıköy Boğaları',
    logoUrl: 'https://picsum.photos/200/200?random=1',
    primaryColor: 'bg-red-600',
    captainId: 'u1',
    viceCaptainIds: ['u5', 'u6'], // 2 vice-captains
    level: SkillLevel.INTERMEDIATE,
    location: 'Kadıköy, İstanbul',
    homePitchId: 'p1',
    fairPlayScore: 4.8,
    description: 'Kaybetsek de güleriz, ama kolay kaybetmeyiz.',
    wins: 12,
    losses: 4,
    guestPlayerIds: [] // Initialize empty
  },
  {
    id: 't2',
    name: 'Şişli United',
    logoUrl: 'https://picsum.photos/200/200?random=2',
    primaryColor: 'bg-blue-600',
    captainId: 'u2',
    viceCaptainIds: ['u6', 'u7'], // 2 vice-captains
    level: SkillLevel.ADVANCED,
    location: 'Şişli, İstanbul',
    homePitchId: 'p3',
    fairPlayScore: 3.9,
    description: 'Sert oynarız, maça gelmeyen bizden değildir.',
    wins: 24,
    losses: 8,
    guestPlayerIds: []
  },
  {
    id: 't3',
    name: 'Göztepe Yıldızları',
    logoUrl: 'https://picsum.photos/200/200?random=3',
    primaryColor: 'bg-yellow-500',
    captainId: 'u3',
    viceCaptainIds: [], // No vice-captains yet
    level: SkillLevel.BEGINNER,
    location: 'Göztepe, İstanbul',
    fairPlayScore: 5.0,
    description: 'Maksat spor olsun.',
    wins: 2,
    losses: 10,
    guestPlayerIds: []
  }
];

export const MOCK_OFFERS: MatchOffer[] = [
  {
    id: 'o1',
    fromTeamId: 't2',
    fromTeamName: 'Şişli United',
    toMatchId: 'm1',
    note: 'Rövanş için geliyoruz. Kadro tam.',
    status: 'PENDING',
    timestamp: '10:30'
  },
  {
    id: 'o2',
    fromTeamId: 't3',
    fromTeamName: 'Göztepe Yıldızları',
    toMatchId: 'm1',
    note: 'Eğlencesine oynayalım dedik, uygunsa gelelim.',
    status: 'REJECTED',
    timestamp: '09:00'
  }
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'OFFER',
    title: 'Yeni Maç Teklifi',
    message: 'Şişli United, Salı 21:00 maçı için meydan okuyor!',
    timestamp: '10:30',
    read: false,
    relatedOfferId: 'o1'
  },
  {
    id: 'n2',
    type: 'SYSTEM',
    title: 'Maç Hatırlatması',
    message: 'Yarın akşam Mega Halı Saha maçını unutma.',
    timestamp: 'Dün',
    read: true
  },
  {
    id: 'n3',
    type: 'REMINDER',
    title: 'Eksik Kadro',
    message: 'Takım kadrosunda hala 1 eksik var. Joker havuzuna baktın mı?',
    timestamp: '2 gün önce',
    read: true,
    actionLink: '/jokers'
  }
];

// Helper to simulate "Today" and "Future" dates
const getTodayDate = () => new Date().toISOString().split('T')[0];
const getFutureDate = (daysToAdd: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().split('T')[0];
}

export const MOCK_MATCHES: MatchListing[] = [
  {
    id: 'm1',
    teamId: 't1',
    teamName: 'Kadıköy Boğaları',
    teamLogo: 'https://picsum.photos/200/200?random=1',
    date: getTodayDate(),
    time: '21:00 - 22:00',
    hourStart: 21,
    pitchId: 'p1',
    pitchName: 'Mega Halı Saha',
    location: 'Üsküdar',
    requiredLevel: SkillLevel.INTERMEDIATE,
    status: 'OPEN',
    priceShare: 400,
    message: 'Eksiksiz kadro geliyoruz, iddialı rakip aranıyor.',
    incomingOffers: MOCK_OFFERS
  },
  {
    id: 'm2',
    teamId: 't2',
    teamName: 'Şişli United',
    teamLogo: 'https://picsum.photos/200/200?random=2',
    date: getTodayDate(),
    time: '22:00 - 23:00',
    hourStart: 22,
    pitchId: 'p2',
    pitchName: 'Arena Spor Kompleksi',
    location: 'Beşiktaş',
    requiredLevel: SkillLevel.ADVANCED,
    status: 'OPEN',
    priceShare: 600,
    message: 'Rövanş isteyen?'
  },
  // FUTURE MATCH 1
  {
    id: 'm3',
    teamId: 't3',
    teamName: 'Göztepe Yıldızları',
    teamLogo: 'https://picsum.photos/200/200?random=3',
    date: getFutureDate(2), // 2 days from now
    time: '20:00 - 21:00',
    hourStart: 20,
    pitchId: 'p1',
    pitchName: 'Mega Halı Saha',
    location: 'Üsküdar',
    requiredLevel: SkillLevel.BEGINNER,
    status: 'OPEN',
    priceShare: 400,
    message: 'Haftaya maç yapmak isteyen var mı?'
  },
  // FUTURE MATCH 2
  {
    id: 'm4',
    teamId: 't2',
    teamName: 'Şişli United',
    teamLogo: 'https://picsum.photos/200/200?random=2',
    date: getFutureDate(5), // 5 days from now
    time: '22:00 - 23:00',
    hourStart: 22,
    pitchId: 'p1',
    pitchName: 'Mega Halı Saha',
    location: 'Üsküdar',
    requiredLevel: SkillLevel.ADVANCED,
    status: 'OPEN',
    priceShare: 400,
    message: 'Mega Sahada rövanş.'
  }
];

export const MOCK_JOKERS: Player[] = [
  {
    id: 'j1',
    name: 'Muslera Ahmet',
    position: Position.GK,
    location: 'Ümraniye',
    isJoker: true,
    sharesFee: true,
    avatarUrl: 'https://picsum.photos/100/100?random=50',
    favoritePitchIds: ['p1', 'p3'],
    rating: 88,
    form: ['W', 'W', 'D', 'W', 'L'],
    stats: { pace: 65, shooting: 40, passing: 70, defense: 89, dribbling: 50, physical: 85 }
  },
  {
    id: 'j2',
    name: 'Ronaldo Mehmet',
    position: Position.FWD,
    location: 'Kadıköy',
    isJoker: true,
    sharesFee: false,
    avatarUrl: 'https://picsum.photos/100/100?random=51',
    favoritePitchIds: ['p1'],
    rating: 92,
    form: ['W', 'W', 'W', 'W', 'W'],
    stats: { pace: 91, shooting: 89, passing: 78, defense: 45, dribbling: 88, physical: 80 }
  },
  {
    id: 'j3',
    name: 'Gattuso Caner',
    position: Position.DEF,
    location: 'Beşiktaş',
    isJoker: true,
    sharesFee: true,
    avatarUrl: 'https://picsum.photos/100/100?random=52',
    favoritePitchIds: ['p2', 'p3'],
    rating: 84,
    form: ['L', 'D', 'W', 'W', 'L'],
    stats: { pace: 78, shooting: 60, passing: 75, defense: 88, dribbling: 65, physical: 92 }
  }
];

// Pool of users to be searched
export const MOCK_ALL_USERS: Player[] = [
  ...MOCK_JOKERS,
  {
    id: 'u10',
    name: 'Burak Yılmaz',
    position: Position.FWD,
    location: 'Sarıyer',
    isJoker: false,
    avatarUrl: 'https://picsum.photos/100/100?random=110',
    rating: 81
  },
  {
    id: 'u11',
    name: 'Arda Güler',
    position: Position.MID,
    location: 'Fatih',
    isJoker: false,
    avatarUrl: 'https://picsum.photos/100/100?random=111',
    rating: 86
  },
  {
    id: 'u12',
    name: 'Ferdi Kadıoğlu',
    position: Position.DEF,
    location: 'Kadıköy',
    isJoker: false,
    avatarUrl: 'https://picsum.photos/100/100?random=112',
    rating: 83
  }
];

export const CURRENT_USER: Player & { teamId?: string } = {
  id: 'u1',
  name: 'Can Kaptan',
  position: Position.MID,
  location: 'Kadıköy',
  isJoker: false, // Default status
  sharesFee: true,
  avatarUrl: 'https://picsum.photos/100/100?random=99',
  teamId: 't1',
  favoritePitchIds: [],
  rating: 82,
  stats: { pace: 78, shooting: 72, passing: 88, defense: 65, dribbling: 80, physical: 75 }
};

// MOCK CHAT DATA
export const MOCK_CHANNELS: ChatChannel[] = [
  {
    id: 'c1',
    type: 'MATCH_GROUP',
    name: 'Salı 21:00 - Kadıköy Maçı',
    avatarUrl: 'https://picsum.photos/200/200?random=100',
    lastMessage: 'Ahmet: Ben kaleye geçerim beyler sorun yok.',
    timestamp: '14:30',
    unreadCount: 2
  },
  {
    id: 'c2',
    type: 'DM',
    name: 'Şişli United',
    avatarUrl: 'https://picsum.photos/200/200?random=2',
    lastMessage: 'Siz: Forma renginiz ne olacak?',
    timestamp: 'Dün',
    unreadCount: 0,
    opponentTeamId: 't2'
  }
];

export const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  'c1': [
    { id: '1', senderId: 'u2', senderName: 'Rakip Kaptan', text: 'Selamlar, herkes tamam mı?', timestamp: '14:00', isMe: false },
    { id: '2', senderId: 'u1', senderName: 'Ben', text: 'Biz hazırız, sahada görüşürüz.', timestamp: '14:05', isMe: true },
    { id: '3', senderId: 'j1', senderName: 'Ahmet (Joker)', text: 'Ben kaleye geçerim beyler sorun yok.', timestamp: '14:30', isMe: false }
  ],
  'c2': [
    { id: '1', senderId: 'u2', senderName: 'Şişli Kaptan', text: 'Maç teklifinizi aldık, düşünüyoruz.', timestamp: '09:00', isMe: false },
    { id: '2', senderId: 'u1', senderName: 'Ben', text: 'Beklemedeyiz, sağlam kadro kurduk.', timestamp: '09:15', isMe: true },
    { id: '3', senderId: 'u1', senderName: 'Ben', text: 'Forma renginiz ne olacak?', timestamp: 'Dün', isMe: true }
  ]
};

// MOCK MATCH HISTORY DATA
export const MOCK_MATCH_HISTORY = [
  {
    id: 'mh1',
    opponentId: 't2',
    opponentName: 'Şişli United',
    opponentLogo: 'https://picsum.photos/200/200?random=2',
    date: '15 Kas 2024',
    result: 'WIN' as const,
    score: '4-2',
    fairPlayScore: 4.5,
    location: 'Mega Halı Saha'
  },
  {
    id: 'mh2',
    opponentId: 't3',
    opponentName: 'Göztepe Yıldızları',
    opponentLogo: 'https://picsum.photos/200/200?random=3',
    date: '08 Kas 2024',
    result: 'WIN' as const,
    score: '5-1',
    fairPlayScore: 5.0,
    location: 'Arena Spor'
  },
  {
    id: 'mh3',
    opponentId: 't2',
    opponentName: 'Şişli United',
    opponentLogo: 'https://picsum.photos/200/200?random=2',
    date: '01 Kas 2024',
    result: 'LOSS' as const,
    score: '1-3',
    fairPlayScore: 3.8,
    location: 'Yıldız Park'
  },
  {
    id: 'mh4',
    opponentId: 't4',
    opponentName: 'Beşiktaş Aslanları',
    opponentLogo: 'https://picsum.photos/200/200?random=4',
    date: '25 Eki 2024',
    result: 'DRAW' as const,
    score: '2-2',
    fairPlayScore: 4.2,
    location: 'Mega Halı Saha'
  },
  {
    id: 'mh5',
    opponentId: 't5',
    opponentName: 'Fenerbahçe FC',
    opponentLogo: 'https://picsum.photos/200/200?random=5',
    date: '18 Eki 2024',
    result: 'LOSS' as const,
    score: '0-2',
    fairPlayScore: 4.7,
    location: 'Arena Spor'
  }
];