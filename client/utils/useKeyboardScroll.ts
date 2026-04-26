import { useEffect } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

/**
 * Klavye açıldığında aktif input görünür değilse minimum kadar scroll eder.
 * block: 'nearest' → sadece görünmüyorsa ve en az miktarda kaydırır.
 * Sadece native platformlarda çalışır.
 */
export function useKeyboardScroll() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const scrollFocusedIntoView = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return;

      const tag = el.tagName.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || el.isContentEditable;
      if (!isInput) return;

      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
    };

    let handle: { remove: () => void } | null = null;

    Keyboard.addListener('keyboardWillShow', scrollFocusedIntoView)
      .then(h => { handle = h; })
      .catch(() => {});

    return () => {
      handle?.remove();
    };
  }, []);
}
