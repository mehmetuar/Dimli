

export enum SkillLevel {
  BEGINNER = 'Başlangıç',
  INTERMEDIATE = 'Orta',
  ADVANCED = 'İyi',
  EXPERT = 'Pro'
}

export enum Position {
  GK = 'Kaleci',
  DEF = 'Defans',
  MID = 'Orta Saha',
  FWD = 'Forvet'
}

export interface TimeSlot {
  id?: string;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}

export interface Player {
  id: string;
  name: string;
  position: Position;
  secondaryPosition?: string; // New field
  location: string;
  coordinates?: { lat: number; lng: number }; // New field for geo-filtering
  birthDate?: string; // New field: YYYY-MM-DD
  foot?: string; // New field: 'Sağ', 'Sol', 'Her İkisi'
  nationality?: string; // Uyruk — ISO 3166-1 alpha-2 (örn. 'TR'); kartta bayrak olarak gösterilir
  isJoker: boolean; // Acts as Active/Passive toggle
  sharesFee?: boolean; // New: Willing to pay their share
  avatarUrl: string;
  teamId?: string; // Null if no team
  favoritePitchIds?: string[]; // IDs of pitches where they are willing to play
  rating?: number; // Overall score 1-99
  form?: string[]; // e.g. ['W', 'W', 'L', 'D', 'W']
  stats?: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defense: number;
    physical: number;
  }
}

export interface Team {
  id: string;
  shortId?: string;
  name: string;
  logoUrl: string;
  primaryColor: string; // Tailwind class e.g. "bg-red-600"
  secondaryColor?: string; // Second team color Tailwind class
  captainId: string;
  viceCaptainIds?: string[]; // Array of vice-captain IDs (max 2)
  level: SkillLevel;
  coordinates?: { lat: number; lng: number }; // New field
  homePitchId?: string; // The ID of their favorite pitch
  homeBusinessId?: string; // The ID of their favorite business
  fairPlayScore: number; // 1-5
  fairPlayRatingCount?: number;
  location?: string;
  description: string;
  guestPlayerIds?: string[]; // IDs of jokers playing temporarily
  players?: any[]; // Team roster from API
  playedMatchCount?: number;
  captain?: { full_name?: string; username?: string };
}

// Konum-filtreli listede sunucunun her ilana gömdüğü hafif saha/işletme
// özeti — kart bununla çizilir, ayrı GET /businesses çağrısı gerekmez.
export interface AnnouncementPitchSummary {
  id: string;
  name: string;
  pricePerHour: number | null;
  imageUrl: string | null;
  endTime: string | null;
  business: {
    id: string;
    name: string;
    district?: string | null;
    city?: string | null;
  };
}

export interface MatchAnnouncement {
  id: string;
  teamId: string;
  pitchId?: string;
  date: string;
  time: string;
  playerCount: number;
  description?: string;
  status: string;
  matchType?: string; // 'rakip_araniyor' | 'kendi_aramizda'
  distanceKm?: number; // sunucu tarafında hesaplanır (konum-filtreli listelerde)
  createdAt: string;
  team?: Team;
  pitch?: Pitch;
  pitchSummary?: AnnouncementPitchSummary | null; // konum-filtreli listede sunucu ekler
  pendingChallengeCount?: number; // ilana bekleyen meydan okuma sayısı (liste yanıtı)
}

export interface Challenge {
  id: string;
  fromTeamId: string;
  toTeamId?: string;
  toMatchId: string;
  note?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  fromTeam?: Team; // Populated by backend
  toTeam?: Team; // Populated by backend
  match?: MatchAnnouncement; // Populated by backend
}

export interface MatchOffer {
  id: string;
  fromTeamId: string;
  fromTeamName: string;
  toMatchId: string;
  note: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  timestamp: string;
}

export interface Notification {
  id: string;
  type: 'OFFER' | 'SYSTEM' | 'REMINDER';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  relatedOfferId?: string; // If it's an offer, link to it
  actionLink?: string;
}

export interface MatchListing {
  id: string;
  teamId: string;
  teamName: string;
  teamLogo: string;
  date: string;
  time: string; // e.g. "21:00 - 22:00"
  hourStart: number; // 21
  pitchId: string; // Linked to a specific pitch
  pitchName: string;
  location: string;
  coordinates?: { lat: number; lng: number }; // Copy from pitch/team for easier filtering
  requiredLevel: SkillLevel;
  status: 'OPEN' | 'PENDING' | 'CONFIRMED' | 'PLAYED';
  priceShare: number; // Cost per team
  message?: string;
  incomingOffers?: MatchOffer[];
  team?: Team; // Team object from API (for announcements)
}

export interface PitchSlot {
  hour: number; // 18, 19, 20...
  status: 'AVAILABLE' | 'BOOKED' | 'LOOKING_FOR_OPPONENT';
  activeAdIds?: string[]; // List of match IDs looking for opponent at this slot
  bookingInfo?: {
    teamName: string;
    contact: string;
  };
}

export interface Business {
  id: string;
  name: string;
  city?: string;
  district?: string;
  address?: string;
  location: string; // Keep for backward compat or derived
  latitude?: number;
  longitude?: number;
  rating: number;
  ratingCount?: number;
  phone: string;
  coverImageUrl?: string;
  logoUrl?: string;
  // facilities moved to Pitch
  openTime?: string;
  closeTime?: string;
  pitches?: Pitch[];
  distanceKm?: number;
}

export interface Pitch {
  id: string;
  name: string;
  businessId?: string; // Link to Business
  type?: string; // INDOOR / OUTDOOR
  pricePerHour: number;
  imageUrl?: string;
  facilities?: string[]; // Moved from Business
  business?: Business;
  schedule?: PitchSlot[]; // Mock schedule for today
  location?: string;
  coordinates?: { lat: number; lng: number };
  rating?: number;
  phone?: string;
  // Added these based on backend entity
  openTime?: string;
  closeTime?: string;
  timeSlots?: TimeSlot[];
  isActive?: boolean;
  closedDays?: string[]; // e.g. ['Sunday', 'Monday']
  // Plan düşürmede silinmesi planlanan saha: bu tarih ve sonrasına
  // rezervasyon/ilan oluşturulamaz (ISO string, sunucudan gelir).
  scheduledDeletionAt?: string | null;
}

export interface PitchOwner {
  id: string;
  name: string;
  pitchId: string;
}

// New Chat Types
export interface ChatChannel {
  id: string;
  type: 'DM' | 'MATCH_GROUP' | 'TEAM_INTERNAL';
  name: string; // "Şişli United" or "Salı 22:00 Maçı"
  avatarUrl?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  participants?: string[]; // Player IDs
  opponentTeamId?: string; // If DM with a team
  participantId?: string; // New: If DM with a specific player (Joker)
  reservation?: {
    status: ReservationStatus;
    slotTime: string;
  };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderTeamId?: string | null;
  text: string;
  timestamp: string;
  isSystem?: boolean;
  isMe?: boolean;
}

export interface MatchHistoryItem {
  reservationId: string;
  slotTime: string;
  pitchName: string;
  businessName: string;
  businessId: string;
  businessDeleted: boolean;
  opponentTeamId: string | null;
  opponentTeamName: string | null;
  /** Rakip takım silinmiş — skor verilemez, "Bu takım artık mevcut değil" gösterilir */
  opponentTeamDeleted?: boolean;
  isBusinessRated: boolean;
  isFairPlayRated: boolean;
  businessScore: number | null;
  fairPlayScore: number | null;
  needsBusinessRating: boolean;
  needsFairPlayRating: boolean;
  /** Maç kullanıcının katılımından sonra mı oynandı — false ise "Katılmadın", değerlendirilemez. */
  participated: boolean;
}

/** Kullanıcının JOKER olarak oynadığı bir maç (Hesap › Joker Geçmişi). */
export interface JokerMatchHistoryItem extends MatchHistoryItem {
  /** Joker'in o maçta adına oynadığı takım (davet eden takım). */
  invitingTeamId: string | null;
  invitingTeamName: string | null;
}

export enum ReservationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export interface PendingRating {
  reservationId: string;
  slotTime: string;
  pitchName: string;
  businessName: string;
  businessId: string;
  businessDeleted: boolean;
  needsBusinessRating: boolean;
  needsFairPlayRating: boolean;
  opponentTeamId: string | null;
  opponentTeamName: string | null;
  /** Rakip takım silinmiş — skor verilemez, "Bu takım artık mevcut değil" gösterilir */
  opponentTeamDeleted?: boolean;
}