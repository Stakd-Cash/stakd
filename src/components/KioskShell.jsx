import React from 'react';

/**
 * Shared kiosk chrome: staff-style layout (fixed banner + App + optional fixed footer).
 */
export function KioskShell({ banner, footer, children }) {
  const hasFooter = Boolean(footer);
  const hasBanner = Boolean(banner);
  return (
    <div
      className={`kiosk-active${hasFooter ? ' kiosk-active--footer' : ''}${
        !hasBanner ? ' kiosk-active--no-banner' : ''
      }`.trim()}
    >
      {banner}
      {children}
      {footer}
    </div>
  );
}
