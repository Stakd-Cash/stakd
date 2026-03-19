import React from 'react';
import { Toggle } from './Toggle.jsx';
import { AnimatedSheet } from './AnimatedSheet.jsx';
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
  return (
    <AnimatedSheet onClose={onClose}>
      {(close) => (
        <>
          <div className="sheet-handle">
            <div className="sheet-handle-bar" />
          </div>
          <div className="sheet-hd">
            <span className="sheet-title">Settings</span>
            <button
              className="icon-btn"
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
          <div className="settings-body">
            <div className="settings-row">
              <div>
                <div className="settings-label">Drop History</div>
                <div className="settings-sub">
                  Review past drops &amp; totals
                </div>
              </div>
              <button
                className="settings-action"
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
                onChange={() => {
                  haptic('tap');
                  onChange('gamification', !settings.gamification);
                }}
              />
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-label">Tutorial</div>
                <div className="settings-sub">
                  Replay the onboarding walkthrough
                </div>
              </div>
              <button
                className="settings-action"
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
                className="settings-action"
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
                className="settings-action"
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
        </>
      )}
    </AnimatedSheet>
  );
}
