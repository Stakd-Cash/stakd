import React from 'react';

export function Toast({ toast, aboveFooter }) {
  if (!toast) return null;
  return (
    <div
      className={`toast ${toast.type || ''}${aboveFooter ? ' above-footer' : ''}${
        toast.action ? ' has-action' : ''
      }${toast.leaving ? ' leaving' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span>{toast.message}</span>
      {toast.action && (
        <button className="toast-action-btn" onClick={toast.action.onClick}>
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
