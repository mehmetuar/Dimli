// Tanıtım turu adım modeli — tourScripts.ts bu şekle göre senaryo tanımlar,
// TourOverlay/TourSheet bu şekle göre çizer. Yeni tur eklemek = TourId'ye üye + script.
export type TourId = 'pitches' | 'jokers' | 'team';

// TourSheet'te başlık yanında renkli chip olarak gösterilen ikon anahtarları
export type TourStepIcon =
    | 'welcome' | 'pitch' | 'clock' | 'megaphone' | 'shield'
    | 'chat' | 'phone' | 'team' | 'zap' | 'user-plus' | 'flag' | 'filter';

export interface TourStep {
    id: string;
    /** data-tour-id hedefi; boşsa hedefsiz adım: hafif karartma + alt sheet */
    target?: string;
    title: string;
    body: string;
    /** Kart altında küçük puntolu ek bilgi satırı */
    footnote?: string;
    /** Başlık yanındaki renkli ikon chip'i (içerik-önce görünüm) */
    icon?: TourStepIcon;
    /**
     * İlerleme biçimi:
     * - 'next'       → karttaki İleri butonu
     * - 'target-tap' → kullanıcı vurgulanan öğeye dokununca (uygulamanın kendi
     *                  handler'ı çalıştıktan sonraki macrotask'te ilerler)
     * - 'event'      → entegrasyon noktasından emitTourEvent(eventId) gelince
     *                  (async uygulama state'ine bağlı geçişler — yarış olmaz)
     */
    advance: 'next' | 'target-tap' | 'event';
    eventId?: string;
    /** Spotlight deliği ile hedef arasındaki nefes payı (px, varsayılan 8) */
    spotlightPadding?: number;
    /** İleri butonunun etiketi ('next' adımlarında; varsayılan 'İleri') */
    nextLabel?: string;
    /** Adıma girerken çalışan yan etki (ör. sahte sohbeti kapat) */
    onEnter?: 'close-demo-chat';
    /** Hedefsiz adımda arka planı koyu karart (yalnız karşılama kartı kullanır) */
    backdrop?: 'dark';
    /** SON adımda: tur bitince endTour yerine bu tur zincirleme başlar */
    chainTo?: TourId;
}
