import React from 'react';

export function Toggle({ on, onChange, label }) {
  return (
    <button
      className={`toggle-track ${on ? 'on' : 'off'}`}
      onClick={onChange}
      role="switch"
      aria-checked={on}
      aria-label={label}
    >
      <div className="toggle-thumb" />
    </button>
  );
}
