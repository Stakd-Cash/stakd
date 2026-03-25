import React from 'react';

/**
 * Shared kiosk chrome: staff-style layout (fixed banner + App + optional fixed footer).
 */
export function KioskShell({ banner, footer, children }) {
  const hasFooter = Boolean(footer);
  return (
    <div className={`kiosk-active${hasFooter ? ' kiosk-active--footer' : ''}`}>
      {banner}
      {children}
      {footer}
    </div>
  );
}
