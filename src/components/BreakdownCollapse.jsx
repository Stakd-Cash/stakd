import React, { useState, useEffect, useRef } from 'react';

export function BreakdownCollapse({ open, children }) {
  const innerRef = useRef(null);
  const [ht, setHt] = useState(0);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHt(el.scrollHeight));
    ro.observe(el);
    setHt(el.scrollHeight);
    return () => ro.disconnect();
  }, []);

  const maxH = open ? ht || 9999 : 0;

  return (
    <div
      ref={innerRef}
      className={`breakdown-collapse${open ? '' : ' closed'}`}
      style={{ maxHeight: `${maxH}px` }}
    >
      {children}
    </div>
  );
}
