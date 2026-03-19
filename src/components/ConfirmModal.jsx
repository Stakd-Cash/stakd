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
      className={`modal-backdrop${closing ? ' modal-closing' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) triggerClose(onCancel);
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="modal-card" ref={focusRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-body">{body}</div>
        <div className="modal-actions">
          <button
            className="modal-btn danger"
            onClick={() => triggerClose(onConfirm)}
          >
            {confirmLabel}
          </button>
          <button
            className="modal-btn cancel"
            onClick={() => triggerClose(onCancel)}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
