import React, { useState, useEffect, useRef } from 'react';
import { useReduceMotion } from '../hooks/useReduceMotion.js';

export function AnimatedTotal({ value, className }) {
  const reduceMotion = useReduceMotion();
  const [bump, setBump] = useState(false);
  const prev = useRef(value);
  const tm = useRef(null);

  useEffect(() => {
    if (reduceMotion) {
      prev.current = value;
      return;
    }
    if (value !== prev.current) {
      prev.current = value;
      setBump(true);
      clearTimeout(tm.current);
      tm.current = setTimeout(() => setBump(false), 200);
    }
    return () => clearTimeout(tm.current);
  }, [value]);

  return (
    <div className={`${className}${bump ? ' bump' : ''}`}>{value}</div>
  );
}
