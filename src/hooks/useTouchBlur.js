import { useEffect } from 'react';

export function useTouchBlur() {
  useEffect(() => {
    const onScrollBlur = (e) => {
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') &&
        !e.target.closest('input,textarea,[contenteditable]')
      ) {
        active.blur();
      }
    };
    document.addEventListener('touchstart', onScrollBlur, { passive: true });
    return () => document.removeEventListener('touchstart', onScrollBlur);
  }, []);
}
