import React, { useEffect } from 'react';
import { useModalClose } from '../hooks/useModalClose.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';

export function ConfirmModal({ title, body, confirmLabel, onConfirm, onCancel }) {
  const [closing, triggerClose] = useModalClose(200);
  const focusRef = useFocusTrap(true);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') triggerClose(onCancel);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [triggerClose, onCancel]);

  return (
    <div
      className={`sk-backdrop${closing ? ' sk-modal-closing' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) triggerClose(onCancel);
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="sk-modal" ref={focusRef} onClick={(e) => e.stopPropagation()}>
        <div className="sk-modal-title">
          <span className="sk-modal-eyebrow">Confirm action</span>
          <br />
          {title}
        </div>
        <div className="sk-modal-body">{body}</div>
        <div className="sk-modal-actions">
          <button
            type="button"
            className="sk-btn sk-btn-danger sk-btn-lg"
            onClick={() => triggerClose(onConfirm)}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            className="sk-btn sk-btn-secondary sk-btn-lg"
            onClick={() => triggerClose(onCancel)}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
