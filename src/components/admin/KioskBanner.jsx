import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';

const DEFAULT_TIMEOUT_MIN = 10;

export function KioskBanner({ onTimeout }) {
  const { activeStaff, pinLogout, kioskLoginTime, company } = useAuthStore();
  const timeoutMs = ((company?.kiosk_timeout_minutes ?? DEFAULT_TIMEOUT_MIN) * 60 * 1000);
  const [remaining, setRemaining] = useState(timeoutMs);
  const timerRef = useRef(null);
  const startPerfRef = useRef(null);

  useEffect(() => {
    if (!kioskLoginTime) return;
    // Use performance.now() for a monotonic clock that can't be defeated by changing the system clock
    startPerfRef.current = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startPerfRef.current;
      const left = Math.max(0, timeoutMs - elapsed);
      setRemaining(left);
      if (left <= 0) {
        pinLogout();
        if (onTimeout) onTimeout();
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [kioskLoginTime, pinLogout, onTimeout]);

  if (!activeStaff) return null;

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;
  const isLow = remaining < 2 * 60 * 1000;

  const handleLogout = () => {
    pinLogout();
    if (onTimeout) onTimeout();
  };

  return (
    <div className="kiosk-banner">
      <div className="kiosk-banner-left">
        <span className="kiosk-banner-name">{activeStaff.name}</span>
        <span className={`kiosk-banner-timer${isLow ? ' low' : ''}`}>
          {timeStr}
        </span>
      </div>
      <button className="kiosk-banner-btn" onClick={handleLogout}>
        <i className="fa-solid fa-arrow-right-from-bracket" /> Lock
      </button>
    </div>
  );
}
