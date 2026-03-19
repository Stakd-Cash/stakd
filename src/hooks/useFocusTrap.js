import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(active = true) {
  const ref = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!active) return;
    previousFocus.current = document.activeElement;

    const el = ref.current;
    if (!el) return;

    const focusables = () => [...el.querySelectorAll(FOCUSABLE)].filter(
      (n) => !n.closest('[aria-hidden="true"]') && n.offsetParent !== null
    );

    const first = focusables()[0];
    if (first) first.focus();

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const nodes = focusables();
      if (!nodes.length) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === firstNode) {
          e.preventDefault();
          lastNode.focus();
        }
      } else {
        if (document.activeElement === lastNode) {
          e.preventDefault();
          firstNode.focus();
        }
      }
    };

    el.addEventListener('keydown', onKeyDown);
    return () => {
      el.removeEventListener('keydown', onKeyDown);
      if (previousFocus.current && previousFocus.current.focus) {
        previousFocus.current.focus();
      }
    };
  }, [active]);

  return ref;
}
