import { useEffect, useState, useCallback } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

/**
 * Klavye yüksekliğini px olarak döner.
 * fixed inset-0 layout'larda paddingBottom olarak kullanılır.
 * Ayrıca focus olan input'u klavyenin üstüne scroll eder (iOS & Android uyumlu).
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollFocusedIntoView = useCallback(() => {
    const el = document.activeElement as HTMLElement | null;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let showHandle: { remove: () => void } | null = null;
    let hideHandle: { remove: () => void } | null = null;

    Keyboard.addListener('keyboardWillShow', (info) => {
      setKeyboardHeight(info.keyboardHeight);
      // Klavye açıldığında fokuslanmış elemanı görünür yap
      scrollFocusedIntoView();
    }).then(h => { showHandle = h; }).catch(() => {});

    Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    }).then(h => { hideHandle = h; }).catch(() => {});

    return () => {
      showHandle?.remove();
      hideHandle?.remove();
    };
  }, [scrollFocusedIntoView]);

  return keyboardHeight;
}
