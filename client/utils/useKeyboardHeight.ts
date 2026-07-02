import { useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

// İçerik ile klavye arasında bırakılan çok küçük, uygulama-geneli boşluk (px). Tüm tüketiciler
// (Chat input, klavyeye duyarlı modallar, kayıt formları) bu offset'i kullandığı için tek yerden
// yönetilir — "yapışık" hissini önler. Az/çok istenirse yalnız bu sayı değişir.
const KEYBOARD_GAP_PX = 8;

/**
 * Klavye yüksekliğini px olarak döner. Değer, fixed inset-0 layout'larda paddingBottom/bottom
 * offset'i olarak kullanılıp içerik klavyenin hemen üstüne (KEYBOARD_GAP_PX kadar) taşınır.
 * Her iki platformda da klavye WebView'in üstüne biner (capacitor.config: resize 'none').
 *
 * iOS: Capacitor `keyboardWillShow.info.keyboardHeight` güvenilir → doğrudan kullanılır.
 *
 * Android: `info.keyboardHeight` GÜVENİLMEZ — nav-bar'ı dahil edip etmediği cihaz/sürüme göre değişir
 * (edge-to-edge Samsung S26 ≠ non-edge-to-edge Redmi 10S). Sabit bir formül iki cihazda birden doğru
 * olamaz (flip-flop). Bu yüzden native (MainActivity) WindowInsets geometrisiyle WebView'in klavyeyle
 * FİİLEN örtülen kısmını hesaplayıp `--android-keyboard-inset` CSS değişkenine yazar (cihaz-bağımsız).
 * Burada o değişkeni MutationObserver ile izleriz. Not: native + JS `cap sync` ile birlikte paketlenir →
 * değişken her zaman mevcuttur. Odaklanan input'u kaydırma işi useKeyboardScroll'da (yalnız iOS) yapılır.
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // ── ANDROID: native'in yazdığı --android-keyboard-inset (gerçek örtüşme) izlenir ──
    if (Capacitor.getPlatform() === 'android') {
      const readInset = () => {
        const raw = getComputedStyle(document.documentElement).getPropertyValue(
          '--android-keyboard-inset',
        );
        const px = parseFloat(raw);
        setKeyboardHeight(
          Number.isFinite(px) && px > 0 ? px + KEYBOARD_GAP_PX : 0,
        );
      };
      readInset(); // mount'ta mevcut değeri al
      // Native her inset değişiminde documentElement.style'a yazar (klavye aç/kapa/animasyon sonu dahil).
      const observer = new MutationObserver(readInset);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['style'],
      });
      return () => observer.disconnect();
    }

    // ── iOS: Capacitor klavye olayları (info.keyboardHeight güvenilir) ──
    let showHandle: { remove: () => void } | null = null;
    let hideHandle: { remove: () => void } | null = null;

    Keyboard.addListener('keyboardWillShow', (info) => {
      setKeyboardHeight(info.keyboardHeight + KEYBOARD_GAP_PX);
    })
      .then((h) => {
        showHandle = h;
      })
      .catch(() => {});

    Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    })
      .then((h) => {
        hideHandle = h;
      })
      .catch(() => {});

    return () => {
      showHandle?.remove();
      hideHandle?.remove();
    };
  }, []);

  return keyboardHeight;
}
