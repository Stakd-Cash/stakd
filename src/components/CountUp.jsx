import React, { useState, useEffect, useRef } from 'react';
import { useReduceMotion } from '../hooks/useReduceMotion.js';

export function CountUp({
  value,
  format,
  className,
  duration = 1500,
  startFrom = 0,
}) {
  const reduceMotion = useReduceMotion();
  const [display, setDisplay] = useState(startFrom);
  const fromRef = useRef(startFrom);
  const rafRef = useRef(null);

  useEffect(() => {
    if (reduceMotion) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = ease(t);
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  const out = format ? format(display) : display;
  return <span className={className}>{out}</span>;
}
