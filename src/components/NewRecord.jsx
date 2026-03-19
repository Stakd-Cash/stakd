import React from 'react';
import { useModalClose } from '../hooks/useModalClose.js';
import { haptic } from '../utils/haptics.js';

export function NewRecord({ amount, onDismiss }) {
  const [closing, triggerClose] = useModalClose(220);

  return (
    <div
      className={`record-overlay${closing ? ' modal-closing' : ''}`}
      onClick={() => triggerClose(onDismiss)}
    >
      <div className="record-card" onClick={(e) => e.stopPropagation()}>
        <div className="record-icon">
          <i className="fa-solid fa-trophy"></i>
        </div>
        <div className="record-title">New Drop Record!</div>
        <div className="record-amount">${amount.toFixed(2)}</div>
        <div className="record-sub">
          That&apos;s your biggest drop yet. Nice work!
        </div>
        <button
          className="record-dismiss"
          onClick={() => triggerClose(onDismiss)}
          type="button"
        >
          Awesome!
        </button>
      </div>
    </div>
  );
}
