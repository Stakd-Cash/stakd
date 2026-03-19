import { useEffect } from 'react';
import { primeIOSFeedback } from '../utils/haptics.js';

export function useIOSPriming() {
  useEffect(() => {
    let primed = false;
    const onFirstGesture = () => {
      if (primed) return;
      primed = true;
      primeIOSFeedback();
      window.removeEventListener('pointerdown', onFirstGesture, true);
      window.removeEventListener('touchstart', onFirstGesture, true);
    };
    window.addEventListener('pointerdown', onFirstGesture, true);
    window.addEventListener('touchstart', onFirstGesture, true);
    return () => {
      window.removeEventListener('pointerdown', onFirstGesture, true);
      window.removeEventListener('touchstart', onFirstGesture, true);
    };
  }, []);
}
