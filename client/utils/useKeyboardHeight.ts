import { useSyncExternalStore } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

// İçerik ile klavye arasında bırakılan çok küçük, uygulama-geneli boşluk (px). Tüm tüketiciler
// (Chat input, klavyeye duyarlı modallar, kayıt formları) bu offset'i kullandığı için tek yerden
// yönetilir — "yapışık" hissini önler. Az/çok istenirse yalnız bu sayı değişir.
const KEYBOARD_GAP_PX = 8;

// ── Modül-düzeyi TEK dinleyici (singleton) ────────────────────────────────────
// Eski tasarımda her bileşen kendi listener'ını useEffect ile SONRADAN takıyordu:
// autoFocus'lu bir modal ilk açılışta klavyeyi listener takılmadan tetikleyince
// keyboardWillShow kaçıyor, yükseklik 0 kalıyor ve modal klavyenin arkasında
// kalıyordu (Oyuncu Ekle ilk açılış hatası). Dinleyiciler artık modül yüklenirken
// BİR KEZ takılır; geç mount olan her tüketici mevcut değeri anında okur.
let currentHeight = 0;
const subscribers = new Set<() => void>();

const setHeight = (px: number) => {
  if (px === currentHeight) return;
  currentHeight = px;
  subscribers.forEach((fn) => fn());
};

const subscribe = (fn: () => void) => {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
};

const getSnapshot = () => currentHeight;

if (Capacitor.isNativePlatform()) {
  if (Capacitor.getPlatform() === 'android') {
    // ── ANDROID: native'in (MainActivity) yazdığı --android-keyboard-inset izlenir —
    // info.keyboardHeight cihaz/sürüme göre nav-bar'ı dahil edip etmediği değişen
    // GÜVENİLMEZ bir değer (edge-to-edge Samsung ≠ Redmi); native WindowInsets ile
    // WebView'in fiilen örtülen kısmını hesaplayıp CSS değişkenine yazar.
    const readInset = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(
        '--android-keyboard-inset',
      );
      const px = parseFloat(raw);
      setHeight(Number.isFinite(px) && px > 0 ? px + KEYBOARD_GAP_PX : 0);
    };
    readInset();
    new MutationObserver(readInset).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });
  } else {
    // ── iOS: Capacitor klavye olayları (info.keyboardHeight güvenilir) ──
    Keyboard.addListener('keyboardWillShow', (info) => {
      setHeight(info.keyboardHeight + KEYBOARD_GAP_PX);
    }).catch(() => {});
    Keyboard.addListener('keyboardWillHide', () => {
      setHeight(0);
    }).catch(() => {});
  }
}

/**
 * Klavye yüksekliğini px olarak döner. Değer, fixed inset-0 layout'larda paddingBottom/bottom
 * offset'i olarak kullanılıp içerik klavyenin hemen üstüne (KEYBOARD_GAP_PX kadar) taşınır.
 * Her iki platformda da klavye WebView'in üstüne biner (capacitor.config: resize 'none').
 * Dinleyiciler modül-düzeyi singleton — bileşen ne zaman mount olursa olsun güncel değeri okur.
 */
export function useKeyboardHeight(): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
