import React, { useState, useCallback } from 'react';
import { CountUp } from './CountUp.jsx';
import { PullRows } from './PullRows.jsx';
import { ShareButton } from './ShareButton.jsx';
import { BreakdownCollapse } from './BreakdownCollapse.jsx';
import { BILL_DENOMS, COIN_DENOMS } from '../utils/constants.js';
import { fromCents, toCents, formatMoney, rowValue, rowCount } from '../utils/money.js';
import { rollExtraCount } from '../utils/drop.js';
import { buildReport } from '../utils/report.js';
import { haptic } from '../utils/haptics.js';
import { useAuthStore } from '../store/useAuthStore.js';

export function ResultPage({
  actualDropTotal,
  totalCash,
  TARGET,
  dropDetails,
  overageCents,
  remainingDrawer,
  undroppableCents,
  totalBillsCents,
  totalCoinsCents,
  drawerOpen,
  setDrawerOpen,
  cash,
  billsMode,
  coinsMode,
  coinRolls,
  goToCount,
}) {
  return (
    <>
      <button className="back-btn" onClick={goToCount}>
        <i className="fa-solid fa-arrow-left icon-18" /> Back to edit
      </button>
      <div className="rc drop-hero">
        <div className="drop-hero-top">
          <div className="drop-eyebrow">Drop Safe</div>
          <div
            className="drop-amount"
            title="Tap to copy"
            onClick={() => {
              const txt = `$${actualDropTotal.toFixed(2)}`;
              if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(txt).catch(() => {});
              }
              haptic('tap');
            }}
          >
            <CountUp
              key="drop-total"
              value={actualDropTotal}
              format={formatMoney}
            />
          </div>
          <div className="drop-sub">
            from{' '}
            <CountUp
              key="counted-total"
              value={totalCash}
              format={formatMoney}
            />{' '}
            counted · target ${TARGET.toFixed(2)}
          </div>
        </div>
        <div className="drop-hero-body">
          <div className="pull-label">
            Pull these bills
          </div>
          <div className="pull-list">
            {dropDetails.length > 0 ? (
              <PullRows dropDetails={dropDetails} />
            ) : overageCents === 0 && totalCash > 0 ? (
              <div className="perfect-state">
                <div className="empty-icon"><i className="fa-solid fa-scale-balanced"></i></div>
                <div className="perfect-title">Perfect balance</div>
                <div className="perfect-sub">
                  Drawer is sitting right at ${TARGET.toFixed(2)}.
                  <br />
                  Nothing to pull — you can close with confidence.
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon"><i className="fa-solid fa-circle-check"></i></div>
                <div className="empty-state-title">
                  No drop needed
                </div>
                <div className="empty-state-sub">
                  Drawer is at or below target — you're good to go.
                </div>
              </div>
            )}
          </div>
          {undroppableCents > 0 && (
            <div className="warn-banner">
              <div className="warn-dot">!</div>
              <div>
                <div className="warn-title">
                  <CountUp
                    key="undrop"
                    value={fromCents(undroppableCents)}
                    format={formatMoney}
                  />{' '}
                  couldn't be dropped
                </div>
                <div className="warn-body">
                  No matching bills — this overage stays in the
                  drawer.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="rc drawer-card">
        <div className="drawer-header">
          <div>
            <div className="drawer-eyebrow">
              Leave in Drawer
            </div>
            <div className="drawer-total">
              <CountUp
                key="drawer-total"
                value={remainingDrawer}
                format={formatMoney}
              />
            </div>
          </div>
          <button
            className="breakdown-btn"
            onClick={() => {
              haptic('tap');
              setDrawerOpen(!drawerOpen);
            }}
          >
            Breakdown
            <i
              className={`fa-solid fa-chevron-down breakdown-chev icon-16${
                drawerOpen ? ' open' : ''
              }`}
            />
          </button>
        </div>
        <BreakdownCollapse open={drawerOpen}>
          <div className="breakdown-body">
            <div className="breakdown-bills">
              <div className="breakdown-section-title">
                <span>Bills</span>
                <span className="breakdown-subtotal">
                  <CountUp
                    key="bills-subtotal"
                    value={fromCents(
                      totalBillsCents - toCents(actualDropTotal)
                    )}
                    format={formatMoney}
                  />
                </span>
              </div>
              {(() => {
                const rows = BILL_DENOMS.map((d) => {
                  const sv = rowValue(
                    cash[String(d)],
                    d,
                    billsMode
                  );
                  const drop = dropDetails.find(
                    (i) => i.denom === d
                  );
                  const fv = sv - (drop ? drop.value : 0);
                  const fc = Math.round(fv / d);
                  if (fc <= 0) return null;
                  return (
                    <div key={d} className="breakdown-row">
                      <div className="breakdown-left">
                        <div className="chip-bill">${d}</div>
                        <span className="breakdown-count">
                          × {fc}
                        </span>
                      </div>
                      <span className="breakdown-val">
                        <CountUp
                          key={`bill-row-${d}`}
                          value={fv}
                          format={formatMoney}
                        />
                      </span>
                    </div>
                  );
                }).filter(Boolean);
                return rows.length > 0 ? (
                  rows
                ) : (
                  <div className="breakdown-empty">
                    No bills remaining
                  </div>
                );
              })()}
            </div>
            <div>
              <div className="breakdown-section-title">
                <span>Coins</span>
                <span className="breakdown-subtotal">
                  <CountUp
                    key="coins-subtotal"
                    value={fromCents(totalCoinsCents)}
                    format={formatMoney}
                  />
                </span>
              </div>
              {(() => {
                const rows = COIN_DENOMS.map((c) => {
                  const extra =
                    coinsMode === 'count'
                      ? rollExtraCount(c.id, coinRolls[c.id])
                      : 0;
                  const val = rowValue(
                    cash[c.id],
                    c.val,
                    coinsMode,
                    extra
                  );
                  const count = rowCount(
                    cash[c.id],
                    c.val,
                    coinsMode,
                    extra
                  );
                  if (count <= 0) return null;
                  return (
                    <div key={c.id} className="breakdown-row">
                      <div className="breakdown-left">
                        <div className="chip-coin">{c.label}</div>
                        <span className="breakdown-count">
                          × {count}
                        </span>
                      </div>
                      <span className="breakdown-val">
                        <CountUp
                          key={`coin-row-${c.id}`}
                          value={val}
                          format={formatMoney}
                        />
                      </span>
                    </div>
                  );
                }).filter(Boolean);
                return rows.length > 0 ? (
                  rows
                ) : (
                  <div className="breakdown-empty">
                    No coins remaining
                  </div>
                );
              })()}
            </div>
          </div>
        </BreakdownCollapse>
      </div>
      <div className="rc">
        <ShareButton
          report={buildReport({
            totalCash,
            actualDropTotal,
            remainingDrawer,
            TARGET,
            dropDetails,
          })}
        />
      </div>
      <SaveDropButton
        actualDropTotal={actualDropTotal}
        TARGET={TARGET}
        dropDetails={dropDetails}
      />
    </>
  );
}

function SaveDropButton({ actualDropTotal, TARGET, dropDetails }) {
  const { activeStaff, saveDrop, pinLogout } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState('');

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    haptic('success');

    const result = await saveDrop({
      amountCents: Math.round(actualDropTotal * 100),
      targetCents: Math.round(TARGET * 100),
      dropDetails,
      ...(note.trim() ? { note: note.trim() } : {}),
    });

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);

    // Brief pause to show success, then lock back to kiosk PIN screen
    setTimeout(() => {
      pinLogout();
      // Stay on /kiosk — pinLogout clears activeStaff, which re-renders the PIN pad
    }, 1200);
  }, [actualDropTotal, TARGET, dropDetails, note, saveDrop, pinLogout]);

  if (!activeStaff) return null;

  if (saved) {
    return (
      <div className="rc save-drop-card saved">
        <i className="fa-solid fa-circle-check" />
        <span>Drop saved! Locking...</span>
      </div>
    );
  }

  return (
    <div className="rc save-drop-card">
      {error && <div className="save-drop-error">{error}</div>}
      <textarea
        className="save-drop-note"
        placeholder="Add a note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 500))}
        rows={2}
        maxLength={500}
      />
      <button
        className="save-drop-btn"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? (
          <><div className="admin-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving...</>
        ) : (
          <><i className="fa-solid fa-vault" /> Save Drop &amp; Lock</>)
        }
      </button>
      <div className="save-drop-hint">
        Saves to {activeStaff.name}&apos;s record and locks this device
      </div>
    </div>
  );
}
