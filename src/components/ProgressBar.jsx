import React, { useState, useEffect, useRef } from 'react';

export function ProgressBar({ over, target, totalCash, recordDrop, gamification }) {
  const beatAt = recordDrop > 0 ? target + recordDrop : 0;
  const barMax = Math.max(totalCash, beatAt > 0 ? beatAt * 1.08 : 0, target || 1);
  const filledPct = Math.min(100, (totalCash / barMax) * 100);
  const rawFlagPct =
    gamification && recordDrop > 0 ? (beatAt / barMax) * 100 : null;
  const beatLabel = `$${beatAt.toFixed(0)}`;
  const wrapRef = useRef(null);
  const [clampedPct, setClampedPct] = useState(rawFlagPct ?? 50);

  useEffect(() => {
    if (rawFlagPct == null) return;
    const el = wrapRef.current;
    if (!el) return;
    const W = el.offsetWidth;
    const TAG_HALF = 34;
    const PAD = 4;
    const minPct = ((TAG_HALF + PAD) / W) * 100;
    const maxPct = ((W - TAG_HALF - PAD) / W) * 100;
    setClampedPct(Math.min(maxPct, Math.max(minPct, rawFlagPct)));
  }, [rawFlagPct]);

  return (
    <div className="progress-wrap" ref={wrapRef}>
      <div className="progress-track">
        <div
          className={`progress-fill${over ? ' over' : ''}`}
          style={{ width: `${filledPct}%` }}
        />
      </div>
      {rawFlagPct != null && (
        <div
          className="progress-flag"
          style={{ left: `${clampedPct}%` }}
        >
          <div className="progress-flag-tag">Best {beatLabel}</div>
        </div>
      )}
    </div>
  );
}
