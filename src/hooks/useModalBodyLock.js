import { useEffect } from 'react';

export function useModalBodyLock(anyModalOpen) {
  useEffect(() => {
    if (!anyModalOpen) return;
    const y = window.scrollY || document.documentElement.scrollTop;
    document.body.style.top = `-${y}px`;
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.top = '';
      window.scrollTo(0, y);
    };
  }, [anyModalOpen]);
}
