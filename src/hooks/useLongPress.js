import { useEffect, useRef } from 'react';
import { haptic } from '../utils/haptics.js';

export function useLongPress(onLongPress, ms = 300) {
  const ref = useRef(null);
  const tmRef = useRef(null);
  const cancelled = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const start = () => {
      cancelled.current = false;
      tmRef.current = setTimeout(() => {
        if (!cancelled.current) {
          haptic('light');
          onLongPress();
        }
      }, ms);
    };

    const cancel = () => {
      cancelled.current = true;
      clearTimeout(tmRef.current);
    };

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', cancel, { passive: true });
    el.addEventListener('touchcancel', cancel, { passive: true });
    el.addEventListener(
      'touchmove',
      () => {
        if (cancelled.current) return;
        cancel();
      },
      { passive: true }
    );

    return () => {
      clearTimeout(tmRef.current);
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchend', cancel);
      el.removeEventListener('touchcancel', cancel);
    };
  }, [onLongPress, ms]);

  return ref;
}
