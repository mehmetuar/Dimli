// Geolocation hata sınıflandırması — TEK KAYNAK (§103).
//
// @capacitor/geolocation v8 (ION implementasyonu) Android'de hataları KARARLI
// string kodlarla reddeder: err.code = "OS-PLUG-GLOC-XXXX". W3C sayısal code'lar
// (1/2/3) yalnız WEB implementasyonunda vardır (§79 kuralı geçerli). Sıralama:
//   1) string OS-PLUG-GLOC kodu (v8, en güvenilir)
//   2) sayısal W3C code (web)
//   3) mesaj-tabanlı fallback (v6/7 native + bilinmeyenler)
//   4) default: 'retryable' (Tekrar Dene kartı)
//
// DİKKAT: 0009 "Request to enable location was denied." bir AYAR-çözümleme
// reddidir (konum servisini açma dialogu), izin reddi DEĞİL — mesajındaki
// "denied" kelimesi yüzünden koda-öncelik olmadan yanlışlıkla izin-reddine
// düşüyordu (yanlış "Konum İzni Gerekli" kartı). Mesaj fallback'inde de
// 'request to enable location' deseni 'denied'dan ÖNCE kontrol edilir.

export type GeoErrorClass = 'denied' | 'gps_disabled' | 'retryable';

// v8 kod haritası (node_modules/@capacitor/geolocation .../GeolocationErrors.kt):
// 0003 izin reddi → denied
// 0007 konum servisleri kapalı, 0009 ayar-çözümleme reddi, 0014/0015 Play Services,
// 0016 location settings hatası, 0017 Network+Location ikisi de kapalı,
// 0018 manifest'te izin bildirilmemiş (dev hatası — izin kartı yanlış olur) → gps_disabled
// 0002 genel hata, 0010 zaman aşımı → retryable
const V8_CODE_MAP: Record<string, GeoErrorClass> = {
    'OS-PLUG-GLOC-0003': 'denied',
    'OS-PLUG-GLOC-0007': 'gps_disabled',
    'OS-PLUG-GLOC-0009': 'gps_disabled',
    'OS-PLUG-GLOC-0014': 'gps_disabled',
    'OS-PLUG-GLOC-0015': 'gps_disabled',
    'OS-PLUG-GLOC-0016': 'gps_disabled',
    'OS-PLUG-GLOC-0017': 'gps_disabled',
    'OS-PLUG-GLOC-0018': 'gps_disabled',
    'OS-PLUG-GLOC-0002': 'retryable',
    'OS-PLUG-GLOC-0010': 'retryable',
};

export const classifyGeoError = (err: unknown): GeoErrorClass => {
    const e = err as { code?: unknown; message?: unknown } | null | undefined;

    // 1) v8 string kodu
    if (typeof e?.code === 'string') {
        const mapped = V8_CODE_MAP[e.code];
        if (mapped) return mapped;
    }

    // 2) W3C sayısal code (yalnız web implementasyonu üretir)
    if (e?.code === 1) return 'denied';
    if (e?.code === 2) return 'gps_disabled';

    // 3) Mesaj-tabanlı fallback (v6/7 native mesajları + bilinmeyen kaynaklar)
    const msg = String(e?.message ?? '').toLowerCase();
    if (msg.includes('request to enable location')) return 'gps_disabled'; // 'denied'dan ÖNCE
    if (msg.includes('denied')) return 'denied';
    if (
        msg.includes('not enabled') ||
        msg.includes('location disabled') ||
        msg.includes('location services') ||
        msg.includes('location settings') ||
        msg.includes('play services')
    ) {
        return 'gps_disabled';
    }

    // 4) timeout (js-timeout/watch-timeout/0010) ve bilinmeyen her şey → yeniden denenebilir
    return 'retryable';
};

// Tekrar denemeyle DÜZELMEYEN hatalar — watch fallback bunlarda atlanır.
export const isUnrecoverableGpsError = (err: unknown): boolean =>
    classifyGeoError(err) !== 'retryable';
