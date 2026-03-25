import React, { useState, useCallback, useRef } from 'react';

const FREE_NAME_KEY = 'stakd_free_name';

function loadFreeName() {
  try { return localStorage.getItem(FREE_NAME_KEY) || ''; } catch { return ''; }
}

function saveFreeName(name) {
  try {
    localStorage.setItem(FREE_NAME_KEY, name);
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Guest session row — same bar styling as KioskBanner (kiosk-banner).
 */
export function GuestKioskBanner({ onOpenHistory }) {
  const [name, setName] = useState(loadFreeName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const startEdit = useCallback(() => {
    setDraft(name);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [name]);

  const commitEdit = useCallback(() => {
    const trimmed = draft.trim();
    setName(trimmed);
    saveFreeName(trimmed);
    setEditing(false);
  }, [draft]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(false);
  }, [commitEdit]);

  return (
    <div className="kiosk-banner kiosk-banner--guest">
      <div className="kiosk-banner-left kiosk-banner-left--guest">
        {editing ? (
          <input
            ref={inputRef}
            className="kiosk-banner-input"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            placeholder="Your name"
            maxLength={30}
            aria-label="Guest name"
          />
        ) : name ? (
          <>
            <span className="kiosk-banner-name kiosk-banner-name--guest">
              {name}
            </span>
            <span className="kiosk-banner-guest-hint">Guest</span>
            <button
              type="button"
              className="kiosk-banner-text-btn"
              onClick={startEdit}
            >
              Change
            </button>
          </>
        ) : (
          <>
            <span className="kiosk-banner-guest-hint">Guest session</span>
            <a className="kiosk-banner-text-btn" href="#/login">
              Sign in <i className="fa-solid fa-arrow-right" aria-hidden />
            </a>
          </>
        )}
      </div>
      <button
        type="button"
        className="kiosk-banner-btn kiosk-banner-btn--icon"
        onClick={onOpenHistory}
        aria-label="Drop history"
        title="Drop history"
      >
        <i className="fa-solid fa-clock-rotate-left" />
      </button>
    </div>
  );
}
