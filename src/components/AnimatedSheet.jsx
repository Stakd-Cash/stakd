import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSheetClose } from '../hooks/useSheetClose.js';
import { useSheetDismiss } from '../hooks/useSheetDismiss.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';
import { haptic } from '../utils/haptics.js';

function useIsDesktop() {
  const [desktop, setDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth > 1024
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1025px)');
    const onChange = (e) => setDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return desktop;
}

export function AnimatedSheet({ onClose, children, scrollable = false }) {
  const isDesktop = useIsDesktop();
  const [closing, triggerClose] = useSheetClose(onClose);
  const drag = useSheetDismiss(triggerClose);
  const focusRef = useFocusTrap(true);

  const sheetRef = useCallback(
    (node) => {
      // Only wire drag-to-dismiss on non-desktop
      if (!isDesktop) drag.ref.current = node;
      focusRef.current = node;
    },
    [drag.ref, focusRef, isDesktop]
  );

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      haptic('tap');
      triggerClose();
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') triggerClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [triggerClose]);

  const sheetClass = [
    'sheet',
    scrollable ? 'scrollable' : '',
    isDesktop ? 'sheet--sidebar' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={`sheet-backdrop${closing ? ' closing' : ''}${isDesktop ? ' sheet-backdrop--sidebar' : ''}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={sheetClass}
        ref={sheetRef}
      >
        {children(triggerClose)}
      </div>
    </div>
  );
}
