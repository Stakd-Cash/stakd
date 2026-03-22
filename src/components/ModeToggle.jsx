import React from 'react';
import { haptic } from '../utils/haptics.js';

const MODES = ['count', 'value'];
const LABELS = ['Count', 'Value'];

export function ModeToggle({ mode, onChange }) {
  const handleSelect = (nextMode) => (e) => {
    e.stopPropagation();
    haptic('tap');
    if (nextMode !== mode) onChange(nextMode);
  };

  return (
    <div className="mode-toggle-wrap admin-view-toggle" onClick={(e) => e.stopPropagation()}>
      <div className="mode-toggle">
        <div
          className="mode-toggle-pill"
          style={{
            left: mode === 'value' ? 'calc(50% - 1.5px)' : '3px',
            width: 'calc(50% - 1.5px)',
          }}
        />
        {MODES.map((m, i) => (
          <button
            key={m}
            type="button"
            className={`mode-btn admin-btn-sm${mode === m ? ' active' : ''}`}
            onClick={handleSelect(m)}
            aria-pressed={mode === m}
          >
            {LABELS[i]}
          </button>
        ))}
      </div>
    </div>
  );
}
