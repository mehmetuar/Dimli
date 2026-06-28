import type { CSSProperties } from 'react';

/**
 * Akışkan (clamp tabanlı) form stil token'ları — işletme paneli ayar sayfalarında
 * ortak kullanılır. Tek kaynak olması sayesinde Şifre Değiştir ve İşletme Bilgileri
 * sayfaları tüm ekran boyutlarında BİREBİR aynı ölçeklemeyi alır.
 *
 * Kural: dikey ölçek + font => vh, yatay sayfa boşluğu => vw. (dvh/svh KULLANILMAZ —
 * eski/MIUI WebView'de düşer.) Dokunma hedefleri min 44px.
 */

// Sayfa başlığı (header)
export const pageTitle: CSSProperties = {
    fontSize: 'clamp(1.05rem, 2.6vh, 1.35rem)',
    lineHeight: 1.15,
};

export const pageSubtitle: CSSProperties = {
    fontSize: 'clamp(0.7rem, 1.7vh, 0.85rem)',
};

// Alan etiketi (label) — uppercase/bold sınıfıyla birlikte
export const fieldLabel: CSSProperties = {
    fontSize: 'clamp(0.65rem, 1.7vh, 0.8rem)',
};

// Tek satır input
export const fieldInput: CSSProperties = {
    height: 'clamp(44px, 6.5vh, 56px)',
    fontSize: 'clamp(0.85rem, 2.1vh, 1rem)',
};

// Çok satır textarea
export const fieldTextarea: CSSProperties = {
    minHeight: 'clamp(76px, 12vh, 110px)',
    fontSize: 'clamp(0.85rem, 2.1vh, 1rem)',
};

// Input içi ikon (sol/sağ)
export const fieldIcon: CSSProperties = {
    width: 'clamp(16px, 4vh, 20px)',
    height: 'clamp(16px, 4vh, 20px)',
};

// Birincil (turuncu) buton
export const primaryButton: CSSProperties = {
    height: 'clamp(48px, 7.5vh, 58px)',
    fontSize: 'clamp(0.9rem, 2.3vh, 1.05rem)',
};

// Kart iç boşluğu
export const cardPad: CSSProperties = {
    padding: 'clamp(16px, 3vw, 20px)',
};

// Yardımcı/ipucu metni (strength, eşleşme, hata satırı vb.)
export const helperText: CSSProperties = {
    fontSize: 'clamp(0.68rem, 1.7vh, 0.8rem)',
};

// Başarı/hata rozeti
export const noticeText: CSSProperties = {
    fontSize: 'clamp(0.78rem, 1.9vh, 0.9rem)',
};

// Ortak sınıf parçaları (görsel dil tutarlılığı)
export const inputBaseClass =
    'w-full bg-slate-900 border border-slate-700 rounded-xl text-white font-medium ' +
    'focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 ' +
    'transition-colors placeholder:text-slate-600';

export const labelBaseClass =
    'block font-bold uppercase italic tracking-wide text-slate-300';
