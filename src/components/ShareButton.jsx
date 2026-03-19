import React, { useState } from 'react';
import { haptic } from '../utils/haptics.js';

export function ShareButton({ report }) {
  const [state, setState] = useState('idle'); // idle | copied | shared
  const canShare = typeof navigator.share === 'function';

  const legacyCopy = () => {
    try {
      const ta = document.createElement('textarea');
      ta.value = report;
      Object.assign(ta.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        opacity: '0',
        pointerEvents: 'none',
      });
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      setState(ok ? 'copied' : 'idle');
      if (ok) setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('idle');
    }
  };

  const doCopy = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(report)
        .then(() => {
          setState('copied');
          setTimeout(() => setState('idle'), 2000);
        })
        .catch(() => legacyCopy());
    } else {
      legacyCopy();
    }
  };

  const handleShare = async () => {
    haptic('tap');
    if (canShare) {
      try {
        await navigator.share({ title: 'Drop Report', text: report });
        setState('shared');
        setTimeout(() => setState('idle'), 2000);
      } catch (e) {
        if (e.name !== 'AbortError') doCopy();
      }
    } else {
      doCopy();
    }
  };

  const label =
    state === 'copied'
      ? 'Copied!'
      : state === 'shared'
        ? 'Shared!'
        : canShare
          ? 'Share Report'
          : 'Copy Report';

  const iconClass =
    state === 'copied' || state === 'shared'
      ? 'fa-solid fa-circle-check'
      : canShare
        ? 'fa-solid fa-arrow-up-from-bracket'
        : 'fa-regular fa-copy';

  return (
    <button
      className={`share-btn${state !== 'idle' ? ' copied' : ''}`}
      onClick={handleShare}
    >
      <i className={`${iconClass} icon-18`} />
      {label}
    </button>
  );
}
