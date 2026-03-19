import { useState, useCallback, useEffect, useRef } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);
  const tmRef = useRef(null);
  const exitRef = useRef(null);
  const EXIT_MS = 170;

  const dismiss = useCallback(() => {
    clearTimeout(tmRef.current);
    clearTimeout(exitRef.current);
    setToast((prev) => {
      if (!prev) return null;
      if (prev.leaving) return prev;
      return { ...prev, leaving: true };
    });
    exitRef.current = setTimeout(() => setToast(null), EXIT_MS);
  }, []);

  const show = useCallback(
    (message, type = 'neutral', duration = 1800, action = null) => {
      clearTimeout(tmRef.current);
      clearTimeout(exitRef.current);
      setToast({ message, type, action, leaving: false });
      tmRef.current = setTimeout(dismiss, Math.max(0, duration));
    },
    [dismiss]
  );

  useEffect(() => {
    return () => {
      clearTimeout(tmRef.current);
      clearTimeout(exitRef.current);
    };
  }, []);

  return { toast, show, dismiss };
}
