import { useEffect, useRef } from 'react';
import { haptic } from '../utils/haptics.js';

export function useSheetDismiss(triggerClose) {
  const ref = useRef(null);
  const startY = useRef(null);
  const dragging = useRef(false);
  const scrollTop = useRef(0);
  const rafId = useRef(null);
  const lastDy = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.willChange = 'transform';
    const DISMISS_THRESHOLD = 80;

    const applyRubberBand = (v) => {
      if (v <= DISMISS_THRESHOLD) return v;
      return DISMISS_THRESHOLD + (v - DISMISS_THRESHOLD) * 0.35;
    };

    const scheduleTransform = (dy) => {
      lastDy.current = applyRubberBand(dy);
      if (rafId.current) return;
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        el.style.transition = 'none';
        el.style.transform = `translate3d(0,${Math.max(0, lastDy.current)}px,0)`;
      });
    };

    const onStart = (e) => {
      const bodyEl = el.querySelector('.sheet-body');
      scrollTop.current = bodyEl ? bodyEl.scrollTop : 0;
      startY.current = e.touches[0].clientY;
      dragging.current = false;
    };

    const onMove = (e) => {
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      const bodyEl = el.querySelector('.sheet-body');
      scrollTop.current = bodyEl ? bodyEl.scrollTop : 0;
      if (dy > 4 && scrollTop.current <= 0) {
        dragging.current = true;
        e.preventDefault();
        scheduleTransform(dy);
      }
    };

    const onEnd = (e) => {
      if (startY.current === null) return;
      const dy = e.changedTouches[0].clientY - startY.current;
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      if (dragging.current && dy > DISMISS_THRESHOLD) {
        el.style.transition = '';
        el.style.transform = '';
        haptic('light');
        triggerClose();
      } else {
        el.style.transition = 'transform .22s cubic-bezier(.25,1,.5,1)';
        el.style.transform = '';
      }
      startY.current = null;
      dragging.current = false;
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      el.style.willChange = '';
    };
  }, [triggerClose]);

  return { ref };
}
