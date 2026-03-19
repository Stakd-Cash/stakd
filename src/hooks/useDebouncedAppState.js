import { useEffect, useRef, useCallback } from 'react';
import { saveAppState } from '../utils/appState.js';

export function useDebouncedAppState(state, delay = 220) {
  const stateRef = useRef(state);
  const tmRef = useRef(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const flush = useCallback(() => {
    if (tmRef.current) {
      clearTimeout(tmRef.current);
      tmRef.current = null;
    }
    try {
      saveAppState(stateRef.current);
    } catch {
      /* swallow */
    }
  }, []);

  useEffect(() => {
    if (tmRef.current) clearTimeout(tmRef.current);
    tmRef.current = setTimeout(flush, delay);
    return () => clearTimeout(tmRef.current);
  }, [state, delay, flush]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [flush]);
}
