

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

export interface Player {
  id: string;
  name: string;
  position: Position;
  location: string;
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
  name: string;
  logoUrl: string;
  primaryColor: string; // Tailwind class e.g. "bg-red-600"
  captainId: string;
  viceCaptainIds?: string[]; // Array of vice-captain IDs (max 2)
  level: SkillLevel;
  location: string;
  homePitchId?: string; // The ID of their favorite pitch
  fairPlayScore: number; // 1-5
  description: string;
  wins: number;
  losses: number;
  guestPlayerIds?: string[]; // IDs of jokers playing temporarily
  players?: any[]; // Team roster from API
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

export interface Pitch {
  id: string;
  name: string;
  location: string;
  rating: number;
  pricePerHour: number;
  imageUrl: string;
  facilities: string[]; // e.g., "Shower", "Cafe", "Parking"
  phone: string;
  schedule?: PitchSlot[]; // Mock schedule for today
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
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
  isMe?: boolean;
}

export interface MatchHistory {
  id: string;
  opponentId: string;
  opponentName: string;
  opponentLogo: string;
  date: string;
  result: 'WIN' | 'LOSS' | 'DRAW';
  score: string; // e.g. "3-2"
  fairPlayScore: number; // 1-5  
  location: string;
}