import { useEffect } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

const isFocusable = (el: Element | null): el is HTMLElement => {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
};

/**
 * Klavye açıkken odaklanan input/textarea'yı ekranın ortasına kaydırır — yalnızca iOS'ta.
 * App.tsx kökünde tek sefer mount edilir.
 *
 * Android'de DEVRE DIŞI: native resize (resizeOnFullScreen) WebView'i klavyenin üstüne
 * küçültüp odaklanan input'u zaten görünür kılar. Bu durumda manuel `scrollIntoView`
 * tüm WebView'i PAN'ler (sabit üst başlığı ekran dışına çıkarır, footer'ı klavyenin
 * altına iter). Bu yüzden Android'de çalışmaz — bkz. [[useKeyboardHeight]] ile aynı ayrım.
 */
export function useKeyboardScroll() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    // Android: native resize hallediyor — manuel scroll WebView'i pan'ler, sabit başlık/footer bozulur.
    if (Capacitor.getPlatform() === 'android') return;

    const keyboardVisible = { current: false };

    const scrollFocusedIntoView = (delay: number) => {
      const el = document.activeElement;
      if (!isFocusable(el)) return;

      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, delay);
    };

    let showHandle: { remove: () => void } | null = null;
    let hideHandle: { remove: () => void } | null = null;

    Keyboard.addListener('keyboardWillShow', () => {
      keyboardVisible.current = true;
      scrollFocusedIntoView(300);
    }).then(h => { showHandle = h; }).catch(() => {});

    Keyboard.addListener('keyboardWillHide', () => {
      keyboardVisible.current = false;
    }).then(h => { hideHandle = h; }).catch(() => {});

    const handleFocusIn = (e: FocusEvent) => {
      if (!keyboardVisible.current) return;
      if (!isFocusable(e.target as Element)) return;
      scrollFocusedIntoView(150);
    };
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      showHandle?.remove();
      hideHandle?.remove();
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, []);
}
