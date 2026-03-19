import { useState, useCallback, useEffect, useRef } from 'react';
import { haptic } from '../utils/haptics.js';

const SCROLL_GUARD_MS = 80;

export function useHoldRepeat(cb) {
  const tmRef = useRef(null);
  const guardRef = useRef(null);
  const [rpt, setRpt] = useState(false);
  const touchStartY = useRef(null);
  const cancelled = useRef(true);
  const fired = useRef(false);
  const started = useRef(false);

  const start = useCallback(
    (startY) => {
      touchStartY.current = startY ?? null;
      cancelled.current = false;
      fired.current = false;
      started.current = true;

      guardRef.current = setTimeout(() => {
        if (cancelled.current) return;
        fired.current = true;
        cb();
      }, SCROLL_GUARD_MS);

      let delay = 380;
      const loop = () => {
        if (cancelled.current) return;
        cb();
        haptic('step');
        delay = Math.max(55, delay * 0.72);
        tmRef.current = setTimeout(loop, delay);
      };
      tmRef.current = setTimeout(() => {
        if (cancelled.current) return;
        setRpt(true);
        loop();
      }, 380);
    },
    [cb]
  );

  const cancel = useCallback(() => {
    cancelled.current = true;
    clearTimeout(tmRef.current);
    clearTimeout(guardRef.current);
    setRpt(false);
    touchStartY.current = null;
  }, []);

  const stop = useCallback(() => {
    if (started.current && !cancelled.current && !fired.current) {
      clearTimeout(guardRef.current);
      cb();
    }
    cancelled.current = true;
    started.current = false;
    clearTimeout(tmRef.current);
    setRpt(false);
    touchStartY.current = null;
  }, [cb]);

  const onTouchMove = useCallback(
    (e) => {
      if (touchStartY.current == null) return;
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
      if (dy > 8) cancel();
    },
    [cancel]
  );

  useEffect(() => () => {
    clearTimeout(tmRef.current);
    clearTimeout(guardRef.current);
  }, []);

  return { repeating: rpt, start, stop, onTouchMove };
}
