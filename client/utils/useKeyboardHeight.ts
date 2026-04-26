import { useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

/**
 * Klavye yüksekliğini px olarak döner.
 * fixed inset-0 layout'larda paddingBottom olarak kullanılır.
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let showHandle: { remove: () => void } | null = null;
    let hideHandle: { remove: () => void } | null = null;

    Keyboard.addListener('keyboardWillShow', (info) => {
      setKeyboardHeight(info.keyboardHeight);
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
