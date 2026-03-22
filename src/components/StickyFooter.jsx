import React from 'react';
import { AnimatedTotal } from './AnimatedTotal.jsx';
import { ProgressBar } from './ProgressBar.jsx';
import { computeDrop } from '../utils/drop.js';

export function StickyFooter({
  anyFocused,
  footerEntering,
  totalReveal,
  totalCash,
  over,
  TARGET,
  targetInput,
  setTargetInput,
  recordDrop,
  settings,
  goToResult,
  cash,
  billsMode,
  dropAmount,
}) {
  return (
    <>
      <div className="footer-floor" />
      <div
        className={`sticky-footer calc-footer${
          anyFocused ? ' keyboard-up' : ''
        }${footerEntering ? ' footer-entering' : ''}`}
      >
        <div className="calc-footer-main">
          <div className="footer-top-row">
            <div className={`footer-total-wrap${totalReveal ? ' replay' : ''}`}>
              <div className="footer-total-label login-eyebrow">Total Counted</div>
              <AnimatedTotal
                value={`$${totalCash.toFixed(2)}`}
                className={`footer-total-value${over ? ' over' : ''}`}
              />
            </div>
            <div className="target-row target-row-footer">
              <div className="target-meta target-meta-footer">
                <div className="target-label-group login-eyebrow">
                  <span>Target</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="done"
                    autoComplete="off"
                    className="target-input admin-settings-input"
                    value={targetInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || /^\d*\.?\d*$/.test(v)) {
                        setTargetInput(v);
                      }
                    }}
                    onBlur={(e) => {
                      const n = parseFloat(e.target.value);
                      if (!Number.isNaN(n) && n >= 0) {
                        setTargetInput(Math.min(n, 99999).toFixed(0));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur();
                    }}
                  />
                </div>
              </div>
              {totalCash > 0 && (
                <span className={`target-status${over ? ' over' : ' under'}`}>
                  {over
                    ? `+$${(totalCash - TARGET).toFixed(2)} over`
                    : `-$${(TARGET - totalCash).toFixed(2)} short`}
                </span>
              )}
            </div>
          </div>

          <div className="footer-action-row">
            <div className="footer-progress-wrap" id="progress-bar">
              <ProgressBar
                over={over}
                target={TARGET}
                totalCash={totalCash}
                recordDrop={recordDrop}
                gamification={settings.gamification}
              />
            </div>
            <button
              id="calc-btn"
              className={`btn-calc login-submit${over ? ' over-target' : ''}`}
              onClick={goToResult}
              onTouchStart={() => {
                if (totalCash > 0) computeDrop(cash, billsMode, dropAmount, TARGET);
              }}
            >
              Calculate Drop <i className="fa-solid fa-arrow-right icon-19" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
