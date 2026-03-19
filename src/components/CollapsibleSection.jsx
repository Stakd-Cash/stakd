import React, { useState, useEffect, useRef } from 'react';
import { ModeToggle } from './ModeToggle.jsx';
import { haptic } from '../utils/haptics.js';

export function CollapsibleSection({
  id,
  label,
  badge,
  mode,
  onModeChange,
  children,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [pressing, setPressing] = useState(false);
  const innerRef = useRef(null);
  const [ht, setHt] = useState(0);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    let raf = null;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setHt(el.scrollHeight));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const onPointerDown = (e) => {
    if (!e.target.closest('button,input,a,[role="button"]')) setPressing(true);
  };
  const clearPress = () => setPressing(false);
  const onDivClick = (e) => {
    if (
      e.target.closest('button,input,a') ||
      e.target.closest('.mode-toggle-wrap')
    )
      return;
    haptic('tap');
    setOpen((v) => !v);
  };

  return (
    <div className="gh-card" id={id}>
      <div
        role="button"
        tabIndex={0}
        className={`section-toggle-btn${pressing ? ' pressing' : ''}${
          (parseFloat(badge) || 0) > 0 ? ' has-value' : ''
        }`}
        onPointerDown={onPointerDown}
        onPointerUp={clearPress}
        onPointerLeave={clearPress}
        onPointerCancel={clearPress}
        onClick={onDivClick}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            haptic('tap');
            setOpen((v) => !v);
          }
        }}
      >
        <div className="section-toggle-left">
          <span className="section-label">{label}</span>
          <span className="badge">{badge}</span>
        </div>
        <div className="section-toggle-right">
          <ModeToggle mode={mode} onChange={onModeChange} />
          <i
            className={`fa-solid fa-chevron-down sec-chev icon-16${open ? ' open' : ''}`}
          />
        </div>
      </div>
      <div
        className={`section-body-wrap${open ? '' : ' closed'}`}
        style={{ maxHeight: open ? `${ht}px` : '0' }}
      >
        <div className="section-body-inner" ref={innerRef}>
          {children}
        </div>
      </div>
    </div>
  );
}
