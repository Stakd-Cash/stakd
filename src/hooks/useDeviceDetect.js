import { useState, useEffect, useCallback } from 'react';

// Breakpoints (CSS-aligned)
const BP_MOBILE = 640;   // 0–640 = mobile
const BP_TABLET = 1024;  // 641–1024 = tablet
                          // 1025+ = desktop

function detectTouch() {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

function detectDevice(width) {
  if (width <= BP_MOBILE) return 'mobile';
  if (width <= BP_TABLET) return 'tablet';
  return 'desktop';
}

export function useDeviceDetect() {
  const [state, setState] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 375;
    return {
      device: detectDevice(w),
      isTouch: detectTouch(),
      width: w,
    };
  });

  const update = useCallback(() => {
    const w = window.innerWidth;
    const device = detectDevice(w);
    const isTouch = detectTouch();
    setState((prev) => {
      if (prev.device === device && prev.isTouch === isTouch && prev.width === w) return prev;
      return { device, isTouch, width: w };
    });
  }, []);

  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    // Re-check on orientation change (tablets)
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [update]);

  // Set CSS classes on <html> for pure-CSS responsive hooks
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('device-mobile', 'device-tablet', 'device-desktop', 'is-touch', 'is-pointer');
    html.classList.add(`device-${state.device}`);
    html.classList.add(state.isTouch ? 'is-touch' : 'is-pointer');
  }, [state.device, state.isTouch]);

  return state;
}
