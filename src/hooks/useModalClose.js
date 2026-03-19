import { useState, useCallback, useEffect, useRef } from 'react';

export function useModalClose(duration = 200) {
  const [closing, setClosing] = useState(false);
  const tmRef = useRef(null);

  const triggerClose = useCallback(
    (onClose) => {
      if (typeof onClose !== 'function') return;
      setClosing(true);
      clearTimeout(tmRef.current);
      tmRef.current = setTimeout(() => {
        setClosing(false);
        onClose();
      }, duration);
    },
    [duration]
  );

  useEffect(() => () => clearTimeout(tmRef.current), []);

  return [closing, triggerClose];
}
