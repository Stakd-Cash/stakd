import React from 'react';
import { haptic } from '../utils/haptics.js';

const MODES = ['count', 'value'];
const LABELS = ['Count', 'Value'];

export function ModeToggle({ mode, onChange }) {
  const toggle = (e) => {
    e.stopPropagation();
    haptic('tap');
    onChange(mode === 'count' ? 'value' : 'count');
  };


  return (
    <div className="mode-toggle-wrap" onClick={toggle}>
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
            className={`mode-btn${mode === m ? ' active' : ''}`}
            onClick={toggle}
          >
            {LABELS[i]}
          </button>
        ))}
      </div>
    </div>
  );
}
