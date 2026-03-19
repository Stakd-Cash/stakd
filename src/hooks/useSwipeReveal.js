import { useEffect, useRef, useCallback } from 'react';
import { haptic } from '../utils/haptics.js';

export function useSwipeReveal({ rowId, openRowId, onSwipeStart, onDelete }) {
  const ref = useRef(null);
  const startX = useRef(null);
  const startY = useRef(null);
  const rafId = useRef(null);
  const lastOffset = useRef(0);
  const dragging = useRef(false);
  const directionLocked = useRef(null);
  const isOpen = openRowId === rowId;
  const DELETE_THRESHOLD = 100;

  const getTrack = () => ref.current?.querySelector('.swipe-track');
  const getDeleteBtn = () => ref.current?.querySelector('.swipe-delete');

  const showDelete = () => {
    const btn = getDeleteBtn();
    if (btn) btn.style.opacity = '1';
  };

  const hideDelete = () => {
    const btn = getDeleteBtn();
    if (btn) btn.style.opacity = '0';
  };

  useEffect(() => {
    if (!isOpen) {
      const track = getTrack();
      if (track) {
        track.style.transition = '';
        track.style.transform = '';
      }
      hideDelete();
      lastOffset.current = 0;
    }
  }, [isOpen]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const applyRubberBand = (v) => {
      const abs = Math.abs(v);
      if (abs <= DELETE_THRESHOLD) return v;
      const over = abs - DELETE_THRESHOLD;
      return -(DELETE_THRESHOLD + over * 0.3) * Math.sign(-v);
    };

    const onStart = (e) => {
      const track = getTrack();
      if (!track) return;
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      directionLocked.current = null;
      dragging.current = false;
      track.style.transition = 'none';
      onSwipeStart?.(rowId);
    };

    const onMove = (e) => {
      if (startX.current === null) return;
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;

      if (directionLocked.current === null) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        directionLocked.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }

      if (directionLocked.current !== 'x') return;

      const raw = Math.min(0, dx);
      const next = applyRubberBand(raw);
      lastOffset.current = next;
      dragging.current = true;
      if (Math.abs(next) > 4) showDelete();
      if (rafId.current) return;
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        const t = getTrack();
        if (t) t.style.transform = `translateX(${next}px)`;
      });
    };

    const onEnd = () => {
      const endOffset = lastOffset.current;
      startX.current = null;
      startY.current = null;
      directionLocked.current = null;
      const wasDragging = dragging.current;
      dragging.current = false;
      const track = getTrack();
      if (!track) return;

      if (!wasDragging) return;

      if (Math.abs(endOffset) >= DELETE_THRESHOLD && onDelete) {
        haptic('light');
        track.style.transition = 'transform .22s cubic-bezier(.34,1.4,.64,1)';
        track.style.transform = '';
        lastOffset.current = 0;

        const row = ref.current;
        if (row) {
          row.style.transition = 'max-height .3s cubic-bezier(.4,0,.2,1) .12s, opacity .2s ease .08s, transform .2s ease .08s';
          row.style.maxHeight = row.offsetHeight + 'px';
          row.style.overflow = 'hidden';
          requestAnimationFrame(() => {
            row.style.maxHeight = '0px';
            row.style.opacity = '0';
            row.style.transform = 'scale(.96)';
          });
        }
        hideDelete();
        setTimeout(() => onDelete(), 380);
        return;
      }

      track.style.transition = 'transform .25s cubic-bezier(.34,1.4,.64,1)';
      track.style.transform = '';
      lastOffset.current = 0;
      hideDelete();
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [rowId, openRowId, onSwipeStart, onDelete]);

  const reset = useCallback(() => {
    const track = getTrack();
    if (track) {
      track.style.transition = '';
      track.style.transform = '';
    }
    hideDelete();
    lastOffset.current = 0;
  }, []);

  const open = useCallback(() => {
    const track = getTrack();
    if (track) {
      track.style.transition = '';
      track.style.transform = `translateX(-${DELETE_THRESHOLD}px)`;
      lastOffset.current = -DELETE_THRESHOLD;
    }
    showDelete();
  }, []);

  return { ref, reset, open };
}
