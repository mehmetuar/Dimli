import { useLayoutEffect } from 'react';

// Reference-counted so nested modals don't prematurely remove the class.
let openCount = 0;

export function useModalBodyClass(isOpen: boolean): void {
  useLayoutEffect(() => {
    if (!isOpen) return;
    openCount++;
    if (openCount === 1) document.body.classList.add('modal-open');
    return () => {
      openCount = Math.max(0, openCount - 1);
      if (openCount === 0) document.body.classList.remove('modal-open');
    };
  }, [isOpen]);
}
