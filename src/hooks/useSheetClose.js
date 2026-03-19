import { useState, useCallback, useEffect, useRef } from 'react';

export function useSheetClose(onClose, duration = 260) {
  const [closing, setClosing] = useState(false);
  const tmRef = useRef(null);

  const triggerClose = useCallback(() => {
    setClosing(true);
    clearTimeout(tmRef.current);
    tmRef.current = setTimeout(() => {
      setClosing(false);
      onClose();
    }, duration);
  }, [onClose, duration]);

  useEffect(() => () => clearTimeout(tmRef.current), []);

  return [closing, triggerClose];
}
