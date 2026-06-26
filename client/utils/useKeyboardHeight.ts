import { useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

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
 * Android düzeltmesi: native keyboardHeight ekranın gerçek altından ölçülür ama WebView edge-to-edge
 * OLMADIĞI için (alt kenarı nav-bar'ın üstünde) ham değer nav-bar yüksekliği kadar fazla gelir.
 * MainActivity nav-bar inset'ini `--android-nav-inset` CSS değişkenine yazar; burada çıkarılır.
 * Değişken yoksa (iOS / listener çalışmazsa) çıkarılan 0 → davranış değişmez (regresyon yok).
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const isAndroid = Capacitor.getPlatform() === 'android';
    const readNavInset = (): number => {
      if (!isAndroid) return 0;
      const p = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--android-nav-inset')
      );
      return Number.isFinite(p) ? p : 0;
    };

    let showHandle: { remove: () => void } | null = null;
    let hideHandle: { remove: () => void } | null = null;

    Keyboard.addListener('keyboardWillShow', (info) => {
      setKeyboardHeight(Math.max(0, info.keyboardHeight - readNavInset()));
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
