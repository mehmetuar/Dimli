// İşletme bildirimleri için paylaşılan tipler + küçük yardımcılar.
// BusinessNotificationsPage ve ReservationRequestDetailModal birlikte kullanır.

export interface ReservationRequestTeam {
  id?: string;
  name?: string;
  logo?: string | null;
  level?: string | null;
  fairPlay?: number | null;
  ratingCount?: number | null;
}

export interface BusinessNotificationMetadata {
  reservationId?: string;
  pitchName?: string;
  date?: string; // '4 Temmuz'
  time?: string; // 'HH:MM'
  role?: string;
  // zenginleştirme alanları (RESERVATION_REQUEST)
  slotDateIso?: string; // 'YYYY-MM-DD' ← Sahaya Git
  slotTimeIso?: string;
  dayName?: string; // 'Cuma'
  startTime?: string; // 'HH:MM'
  endTime?: string; // 'HH:MM'
  matchType?: string | null; // 'kendi_aramizda' | 'rakip_araniyor' | null
  reservationType?: 'DIRECT' | 'MATCH';
  team?: ReservationRequestTeam | null;
}

export interface BusinessNotification {
  id: string;
  type: string; // 'RESERVATION_REQUEST' | 'CANCEL_REQUEST' | ...
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  metadata?: BusinessNotificationMetadata;
}

// Takım seviyesi etiketleri — mevcut değerler Türkçe ise idempotent döner.
const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Başlangıç',
  INTERMEDIATE: 'Orta',
  ADVANCED: 'İyi',
  PRO: 'Pro',
  Başlangıç: 'Başlangıç',
  Orta: 'Orta',
  İyi: 'İyi',
  Pro: 'Pro',
};

export const levelLabel = (lvl?: string | null): string | null =>
  lvl ? LEVEL_LABELS[lvl] ?? lvl : null;

// Maç tipi rozeti metni. null → rozet gösterme (DIRECT rezervasyon).
export const matchTypeLabel = (mt?: string | null): string | null =>
  mt === 'kendi_aramizda'
    ? 'Kendi Aramızda'
    : mt
      ? 'Rakip Aranıyor'
      : null;
