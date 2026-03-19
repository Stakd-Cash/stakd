import { useCallback, useRef } from 'react';
import { useAppStore } from '../store/useStore.js';

const NAV_DURATION = 300;

/**
 * Encapsulates the page navigation state machine.
 * States: idle | transitioning-fwd | transitioning-back
 *
 * Instead of 4 loose booleans synced via setTimeout, this hook
 * manages them atomically through a single `navigateTo` function.
 */
export function useNavigation() {
  const page = useAppStore((s) => s.page);
  const pageDir = useAppStore((s) => s.pageDir);
  const prevPage = useAppStore((s) => s.prevPage);
  const transitioning = useAppStore((s) => s.transitioning);

  const setPage = useAppStore((s) => s.setPage);
  const setPageDir = useAppStore((s) => s.setPageDir);
  const setPrevPage = useAppStore((s) => s.setPrevPage);
  const setTransitioning = useAppStore((s) => s.setTransitioning);

  const navTm = useRef(null);

  const navigateTo = useCallback(
    (targetPage, dir) => {
      // Read fresh state to avoid stale closure
      const { transitioning: t, page: p } = useAppStore.getState();
      if (t) return;
      setPageDir(dir);
      setPrevPage(p);
      setTransitioning(true);
      setPage(targetPage);
      clearTimeout(navTm.current);
      navTm.current = setTimeout(() => {
        setTransitioning(false);
        setPrevPage(null);
        setPageDir(null);
      }, NAV_DURATION);
    },
    [setPageDir, setPrevPage, setTransitioning, setPage]
  );

  const cleanup = useCallback(() => {
    clearTimeout(navTm.current);
  }, []);

  const showPageCount = page === 1 || (transitioning && prevPage === 1);
  const showPageResult = page === 2 || (transitioning && prevPage === 2);

  const getPageAnimClass = useCallback(
    (target) => {
      if (!transitioning || !pageDir) return '';
      const entering = page === target;
      if (entering)
        return pageDir === 'fwd' ? ' slide-enter-fwd' : ' slide-enter-back';
      return pageDir === 'fwd'
        ? ' slide-exit-fwd is-exit'
        : ' slide-exit-back is-exit';
    },
    [transitioning, pageDir, page]
  );

  return {
    page,
    transitioning,
    navigateTo,
    cleanup,
    showPageCount,
    showPageResult,
    getPageAnimClass,
  };
}
