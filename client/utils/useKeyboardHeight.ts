import { useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

// İçerik ile klavye arasında bırakılan çok küçük, uygulama-geneli boşluk (px). Tüm tüketiciler
// (Chat input, klavyeye duyarlı modallar, kayıt formları) bu offset'i kullandığı için tek yerden
// yönetilir — "yapışık" hissini önler. Az/çok istenirse yalnız bu sayı değişir.
const KEYBOARD_GAP_PX = 8;

/**
 * Klavye yüksekliğini px olarak döner — iOS ve Android (tek model).
 *
 * Her iki platformda da klavye WebView'in üstüne biner (capacitor.config: resize 'none',
 * Android resizeOnFullScreen false). Bu değer fixed inset-0 layout'larda paddingBottom/bottom
 * offset'i olarak kullanılarak içerik klavyenin hemen üstüne taşınır. (Android'de native resize
 * bu cihazlarda çalışmadığı için tek güvenilir yöntem budur — iOS ile birebir aynı kod yolu.)
 *
 * Odaklanan input'u görünür alana kaydırma işi useKeyboardScroll'da yapılır (yalnızca iOS;
 * Android'de scrollIntoView WebView'i pan'leyip sabit başlık/footer'ı bozduğu için kapalı).
 *
 * Offset = native keyboardHeight (ekranın gerçek altından ölçülür) + küçük gap. nav-bar inset'i
 * ÇIKARILMAZ: edge-to-edge cihazlarda (Samsung S26, Android 15+) WebView altı = ekran altı olduğu için
 * çıkarmak composer'ı klavyenin ALTINA itip çakışmaya yol açıyordu. Çıkarma olmayınca offset her zaman
 * ≥ gerekli değer → içerik klavyenin tam üstünde veya biraz yukarısında, ASLA altında değil (çakışma yok).
 * (Non-edge-to-edge eski cihazlarda biraz daha boşluk olur — kabul edilebilir; çakışmadan iyidir.)
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let showHandle: { remove: () => void } | null = null;
    let hideHandle: { remove: () => void } | null = null;

    Keyboard.addListener('keyboardWillShow', (info) => {
      setKeyboardHeight(info.keyboardHeight + KEYBOARD_GAP_PX);
    }).then(h => { showHandle = h; }).catch(() => {});

    Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    }).then(h => { hideHandle = h; }).catch(() => {});

    return () => {
      showHandle?.remove();
      hideHandle?.remove();
    };
  }, []);

  return keyboardHeight;
}
