import React, { useEffect, useCallback } from 'react';
import { Toggle } from './Toggle.jsx';
import { useModalClose } from '../hooks/useModalClose.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';
import { haptic } from '../utils/haptics.js';

export function SettingsPanel({
  onClose,
  settings,
  onChange,
  onReplayTutorial,
  onShowAbout,
  onShowChangelog,
  onShowHistory,
}) {
  const [closing, triggerClose] = useModalClose(200);
  const focusRef = useFocusTrap(true);

  const close = useCallback(() => triggerClose(onClose), [triggerClose, onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  return (
    <div
      className={`sk-backdrop${closing ? ' sk-modal-closing' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          haptic('tap');
          close();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="sk-modal sk-modal-wide sk-modal--panel" ref={focusRef} onClick={(e) => e.stopPropagation()}>
        <div className="sk-modal-panel-hd">
          <span className="sk-modal-panel-title">Settings</span>
          <button
            className="icon-btn admin-icon-btn panel-modal-close"
            onClick={() => {
              haptic('tap');
              close();
            }}
            aria-label="Close settings"
            title="Close"
          >
            <i className="fa-solid fa-xmark icon-18" />
          </button>
        </div>
        <div className="sk-modal-panel-body settings-body">
          <div className="settings-row">
            <div>
              <div className="settings-label">Drop History</div>
              <div className="settings-sub">Review past drops &amp; totals</div>
            </div>
            <button
              className="settings-action admin-btn-sm"
              onClick={() => {
                haptic('tap');
                close();
                onShowHistory();
              }}
            >
              View
            </button>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Gamification</div>
              <div className="settings-sub">
                High-score flag, record alerts &amp; confetti
              </div>
            </div>
            <Toggle
              on={settings.gamification}
              label="Gamification"
              onChange={() => {
                haptic('tap');
                onChange('gamification', !settings.gamification);
              }}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Tutorial</div>
              <div className="settings-sub">Replay the onboarding walkthrough</div>
            </div>
            <button
              className="settings-action admin-btn-sm"
              onClick={() => {
                haptic('tap');
                onReplayTutorial();
                close();
              }}
            >
              Replay
            </button>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Changelog</div>
              <div className="settings-sub">
                See recent updates &amp; commit history
              </div>
            </div>
            <button
              className="settings-action admin-btn-sm"
              onClick={() => {
                haptic('tap');
                close();
                onShowChangelog();
              }}
            >
              View
            </button>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">About</div>
              <div className="settings-sub">Who made this and why</div>
            </div>
            <button
              className="settings-action admin-btn-sm"
              onClick={() => {
                haptic('tap');
                close();
                onShowAbout();
              }}
            >
              About
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
