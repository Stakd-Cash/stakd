import { useEffect, useRef } from 'react';

export function useWakeLock() {
  const wakeLockRef = useRef(null);
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    const acquire = async () => {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch { /* user denied or not supported */ }
    };
    acquire();
    const onVis = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      wakeLockRef.current?.release().catch(() => {});
    };
  }, []);
}
