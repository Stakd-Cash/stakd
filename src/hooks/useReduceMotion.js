import { useState, useEffect } from 'react';

export function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setReduceMotion(e.matches);
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Fallback for older browsers
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return reduceMotion;
}
