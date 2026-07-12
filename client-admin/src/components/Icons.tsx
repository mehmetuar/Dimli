import React from 'react';

type P = { className?: string; size?: number };

// ─── Marka & UI ──────────────────────────────────────────────────────────────

/** Dimli futbol sahası logosu */
export const DimliLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
    <img src="/dimli.png" alt="Dimli" width={size} height={size} className={`object-contain ${className}`} />
);

/** Saat — başvuru tarihi, slot zamanları */
export const IconClock: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15.5 14.5" />
    </svg>
);

/** Onay tiki */
export const IconCheck: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

/** Çarpı — red */
export const IconX: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

/** Duraklat — askıya alma */
export const IconPause: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
);

/** Bekliyor — üçgen içinde nokta */
export const IconPending: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <circle cx="12" cy="16" r="0.5" fill="currentColor" strokeWidth="1" />
    </svg>
);

/** Sağ ok — liste öğesi navigasyon */
export const IconChevronRight: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

/** Sol ok — geri */
export const IconChevronLeft: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

/** Büyüteç — arama */
export const IconSearch: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

/** Çıkış kapısı — oturum kapat */
export const IconLogout: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

/** Konum pini — harita */
export const IconPin: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

/** Telefon */
export const IconPhone: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 3h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 10.6a16 16 0 0 0 5.92 5.92l1.93-1.87a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);

/** Kullanıcı — yetkili bilgisi */
export const IconUser: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

/** İşletme binası */
export const IconBuilding: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
    </svg>
);

/** Futbol sahası — pitch */
export const IconPitch: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="2" y="4" width="20" height="16" rx="1.5" />
        <line x1="12" y1="4" x2="12" y2="20" />
        <circle cx="12" cy="12" r="3" />
        <path d="M2 9h3M2 15h3M19 9h3M19 15h3" />
    </svg>
);

/** Kapalı alan — çatı */
export const IconIndoor: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 12L12 3l9 9" />
        <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
        <rect x="9" y="14" width="6" height="6" />
    </svg>
);

/** Açık alan — güneş */
export const IconOutdoor: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
        <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
        <line x1="2" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="22" y2="12" />
        <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
        <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
);

/** TL para — fiyat */
export const IconPrice: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="9" />
        <text x="12" y="16" textAnchor="middle" fontSize="9" fill="currentColor" stroke="none" fontWeight="bold">₺</text>
    </svg>
);

// ─── Saha İmkanları (Facility) İkonları ──────────────────────────────────────

/** Duş */
export const IconShower: React.FC<P> = ({ className = '', size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4 12a8 8 0 0 1 16 0" />
        <line x1="12" y1="12" x2="12" y2="20" />
        <line x1="8" y1="16" x2="8" y2="20" />
        <line x1="16" y1="16" x2="16" y2="20" />
        <circle cx="12" cy="4" r="2" />
    </svg>
);

/** Otopark */
export const IconParking: React.FC<P> = ({ className = '', size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M9 17V7h5a3 3 0 0 1 0 6H9" />
    </svg>
);

/** Kafeterya */
export const IconCafe: React.FC<P> = ({ className = '', size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="2" x2="6" y2="4" />
        <line x1="10" y1="2" x2="10" y2="4" />
        <line x1="14" y1="2" x2="14" y2="4" />
    </svg>
);

/** Aydınlatma */
export const IconLighting: React.FC<P> = ({ className = '', size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

/** Mescit — hilal */
export const IconMoscue: React.FC<P> = ({ className = '', size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 3a9 9 0 1 0 9 9A9 9 0 0 0 12 3zm0 0a5 5 0 1 1 0 10A5 5 0 0 1 12 3z" />
        <line x1="20" y1="4" x2="22" y2="2" />
        <circle cx="22" cy="3" r="1" fill="currentColor" stroke="none" />
    </svg>
);

/** Soyunma Odası — forma */
export const IconLocker: React.FC<P> = ({ className = '', size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20.38 3.46L16 2l-4 4-4-4L3.62 3.46a2 2 0 0 0-1.34 2.23l1.65 7.69A2 2 0 0 0 6 15h12a2 2 0 0 0 2.03-1.62l1.65-7.69a2 2 0 0 0-1.3-2.23z" />
        <path d="M12 6v13" />
    </svg>
);

/** Tribün */
export const IconStands: React.FC<P> = ({ className = '', size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 20h18" />
        <path d="M3 20L7 8" />
        <path d="M7 8h4l-2 12" />
        <path d="M11 8h4l-1 12" />
        <path d="M15 8h6" />
    </svg>
);

/** Klima — kar tanesi */
export const IconAC: React.FC<P> = ({ className = '', size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
    </svg>
);

/** Video / Kamera */
export const IconCamera: React.FC<P> = ({ className = '', size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
);

/** Krampon Kiralama — krampon */
export const IconBoot: React.FC<P> = ({ className = '', size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M2 18h9l2-8h3l2 3h4v5H2z" />
        <line x1="7" y1="21" x2="7" y2="18" />
        <line x1="13" y1="21" x2="13" y2="18" />
    </svg>
);

/** WC */
export const IconWC: React.FC<P> = ({ className = '', size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="9" cy="4" r="2" />
        <circle cx="15" cy="4" r="2" />
        <path d="M6 9h5v5l-1 7h4l-1-7V9h5" />
    </svg>
);

/** WiFi */
export const IconWifi: React.FC<P> = ({ className = '', size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
        <path d="M8.53 16.11a6 16 0 0 1 6.95 0" />
        <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
    </svg>
);

/** Genel / bilinmeyen imkan */
export const IconFacility: React.FC<P> = ({ className = '', size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="9" />
        <polyline points="9 12 11 14 15 10" />
    </svg>
);

// ─── Yeni Admin Panel İkonları ────────────────────────────────────────────────

/** Ana sayfa / Dashboard */
export const IconHome: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 12L12 3l9 9" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9" />
    </svg>
);

/** Düzenleme kalemi */
export const IconEdit: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);

/** Kaydet — disket */
export const IconSave: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
    </svg>
);

/** Büyüme trendi — yukarı ok */
export const IconTrendingUp: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
    </svg>
);

/** Bar grafik — istatistik */
export const IconBarChart: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
);

/** Para — gelir */
export const IconDollar: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
);

/** Kalkan — admin rolü */
export const IconShield: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

/** Hamburger menü */
export const IconMenu: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
);

/** Uyarı dairesi */
export const IconAlertCircle: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

/** Artı — yeni ekle */
export const IconPlus: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

/** Çöp kutusu — sil */
export const IconTrash: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
);

/** Fotoğraf / resim */
export const IconImage: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
    </svg>
);

/** Abone — abonelik */
export const IconSubscription: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <line x1="7" y1="15" x2="9" y2="15" />
        <line x1="12" y1="15" x2="17" y2="15" />
    </svg>
);

// ─── Facility icon map ────────────────────────────────────────────────────────

export const FACILITY_ICON_MAP: Record<string, React.FC<P>> = {
    'Duş': IconShower,
    'Otopark': IconParking,
    'Kafeterya': IconCafe,
    'Aydınlatma': IconLighting,
    'Profesyonel Aydınlatma': IconLighting,
    'Mescit': IconMoscue,
    'Soyunma Odası': IconLocker,
    'Tribün': IconStands,
    'Klima': IconAC,
    'Video': IconCamera,
    'Video Kaydı': IconCamera,
    'Krampon Kiralama': IconBoot,
    'WC': IconWC,
    'WiFi': IconWifi,
    'Spor Salonu': IconPitch,
};

export const getFacilityIcon = (name: string): React.FC<P> =>
    FACILITY_ICON_MAP[name] ?? IconFacility;

/** Can simidi — destek talepleri */
export const IconSupport: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
        <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
        <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
        <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
    </svg>
);

/** Bayrak — şikayetler / raporlar */
export const IconFlag: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
);

/** Yasak — chat ban */
export const IconBan: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
);

/** Pano — değişiklik istekleri */
export const IconClipboard: React.FC<P> = ({ className = '', size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
);
