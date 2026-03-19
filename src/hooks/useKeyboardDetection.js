import { useEffect } from 'react';

export function useKeyboardDetection(setAnyFocused) {
  useEffect(() => {
    const vv = window.visualViewport;
    if (vv) {
      let baseHeight = vv.height;
      let tmRef = null;
      const onResize = () => {
        clearTimeout(tmRef);
        tmRef = setTimeout(() => {
          const shrunk = vv.height < baseHeight * 0.85;
          setAnyFocused(shrunk);
          if (!shrunk) baseHeight = Math.max(baseHeight, vv.height);
        }, 60);
      };
      vv.addEventListener('resize', onResize);
      return () => {
        vv.removeEventListener('resize', onResize);
        clearTimeout(tmRef);
      };
    }
    const onFocus = (e) => {
      if (e.target.tagName === 'INPUT') setAnyFocused(true);
    };
    const onBlur = (e) => {
      if (e.target.tagName === 'INPUT') setAnyFocused(false);
    };
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onBlur);
    return () => {
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', onBlur);
    };
  }, [setAnyFocused]);
}
