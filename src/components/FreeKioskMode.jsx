import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppStore } from '../store/useStore.js';
import { SwipeableHistoryEntry } from './SwipeableHistoryEntry.jsx';
import { useModalClose } from '../hooks/useModalClose.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';
import { haptic } from '../utils/haptics.js';
import { toCents, fromCents, rowValue } from '../utils/money.js';
import { BILL_DENOMS, COIN_DENOMS } from '../utils/constants.js';
import { rollExtraCount, computeDrop } from '../utils/drop.js';
import { formatTime } from '../utils/history.js';
import { KioskShell } from './KioskShell.jsx';
import { KioskFooter } from './KioskFooter.jsx';

// ---------------------------------------------------------------------------
// Free drop localStorage helpers
// ---------------------------------------------------------------------------
const FREE_DROPS_KEY = 'stakd_free_drops';
const MAX_FREE_DROPS = 50;

function loadFreeDrops() {
  try {
    return JSON.parse(localStorage.getItem(FREE_DROPS_KEY) || '[]');
  } catch { return []; }
}

function saveFreeDrops(list) {
  try {
    localStorage.setItem(FREE_DROPS_KEY, JSON.stringify(list.slice(0, MAX_FREE_DROPS)));
  } catch {
    /* ignore quota / private mode */
  }
}

function removeFreeDropByIndex(idx) {
  const list = loadFreeDrops();
  const entry = list[idx];
  const next = list.filter((_, i) => i !== idx);
  saveFreeDrops(next);
  return { next, entry };
}

// ---------------------------------------------------------------------------
// FreeHistoryPanel — reads from stakd_free_drops, reuses SwipeableHistoryEntry
// ---------------------------------------------------------------------------
function FreeHistoryPanel({ onClose }) {
  const [drops, setDrops] = useState(loadFreeDrops);
  const [openSwipeRow, setOpenSwipeRow] = useState(null);
  const [closing, triggerClose] = useModalClose(200);
  const focusRef = useFocusTrap(true);

  const close = useCallback(() => triggerClose(onClose), [triggerClose, onClose]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  const ordered = useMemo(() => drops.slice().reverse(), [drops]);

  const deleteEntry = useCallback((historyIdx) => {
    if (historyIdx == null || historyIdx < 0) return;
    haptic('heavy');
    const { next } = removeFreeDropByIndex(historyIdx);
    setDrops(next);
  }, []);

  return (
    <div
      className={`sk-backdrop${closing ? ' sk-modal-closing' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) { haptic('tap'); close(); } }}
      role="dialog"
      aria-modal="true"
      aria-label="Free Drop History"
    >
      <div
        className="sk-modal sk-modal-wide sk-modal--panel sk-modal--panel-scroll"
        ref={focusRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sk-modal-panel-hd">
          <span className="sk-modal-panel-title">Drop History</span>
          <div className="history-hd-actions">
            <button
              className="icon-btn admin-icon-btn panel-modal-close"
              onClick={() => { haptic('tap'); close(); }}
              aria-label="Close history"
              title="Close"
            >
              <i className="fa-solid fa-xmark icon-18" />
            </button>
          </div>
        </div>
        <div className="sk-modal-panel-body">
          {drops.length === 0 ? (
            <div className="history-empty">
              <div className="history-empty-icon">
                <i className="fa-solid fa-clock-rotate-left"></i>
              </div>
              <div className="history-empty-title">No drops yet</div>
              <div className="history-empty-sub">Completed counts will appear here</div>
            </div>
          ) : (
            <div className="history-list">
              {ordered.map((e, i) => {
                const orderedIdx = i;
                const historyIdx = drops.length - 1 - orderedIdx;
                return (
                  <SwipeableHistoryEntry
                    key={e.ts + '_' + i}
                    rowId={e.ts + '_' + i}
                    entry={e}
                    record={0}
                    formatTime={formatTime}
                    onDelete={() => deleteEntry(historyIdx)}
                    openRowId={openSwipeRow}
                    onSwipeStart={setOpenSwipeRow}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FreeKioskMode — guest kiosk: KioskShell + footer; drop saved toast (no top banner)
// ---------------------------------------------------------------------------
const DROP_TOAST_MS = 6500;

export function FreeKioskMode({ children }) {
  const [showHistory, setShowHistory] = useState(false);
  const [showDropSavedToast, setShowDropSavedToast] = useState(false);
  const page = useAppStore((s) => s.page);
  const prevPageRef = useRef(page);
  const lastSavedTsRef = useRef(0);
  const dropToastTmRef = useRef(null);

  useEffect(() => {
    const prevPage = prevPageRef.current;
    prevPageRef.current = page;

    if (prevPage === 1 && page === 2) {
      const state = useAppStore.getState();
      const { cash, billsMode, coinsMode, coinRolls, targetInput } = state;
      const TARGET = Math.max(0, Number(targetInput) || 0);

      let totalBillsCents = 0;
      for (const d of BILL_DENOMS) {
        totalBillsCents += toCents(rowValue(cash[String(d)], d, billsMode));
      }
      let totalCoinsCents = 0;
      for (const c of COIN_DENOMS) {
        const extra = coinsMode === 'count' ? rollExtraCount(c.id, coinRolls[c.id]) : 0;
        totalCoinsCents += toCents(rowValue(cash[c.id], c.val, coinsMode, extra));
      }
      const totalCents = totalBillsCents + totalCoinsCents;
      const totalCash = fromCents(totalCents);
      const dropAmount = fromCents(Math.max(0, totalCents - toCents(TARGET)));

      if (totalCash <= 0) return;

      const details = computeDrop(cash, billsMode, dropAmount, TARGET);
      if (!details) return;

      const dropped = details.reduce((s, item) => s + item.value, 0);
      const remaining = fromCents(totalCents - toCents(dropped));

      const entry = {
        ts: Date.now(),
        totalCash,
        dropped,
        remaining,
        target: TARGET,
        dropDetails: details,
      };

      if (Date.now() - lastSavedTsRef.current < 500) return;
      lastSavedTsRef.current = Date.now();

      const existing = loadFreeDrops();
      saveFreeDrops([entry, ...existing]);

      if (dropToastTmRef.current) clearTimeout(dropToastTmRef.current);
      setShowDropSavedToast(true);
      dropToastTmRef.current = setTimeout(() => {
        setShowDropSavedToast(false);
        dropToastTmRef.current = null;
      }, DROP_TOAST_MS);
    }
  }, [page]);

  useEffect(() => {
    return () => {
      if (dropToastTmRef.current) clearTimeout(dropToastTmRef.current);
    };
  }, []);

  const openHistory = useCallback(() => {
    haptic('tap');
    setShowHistory(true);
  }, []);

  const dismissDropToast = useCallback(() => {
    if (dropToastTmRef.current) {
      clearTimeout(dropToastTmRef.current);
      dropToastTmRef.current = null;
    }
    setShowDropSavedToast(false);
  }, []);

  return (
    <>
      <KioskShell footer={<KioskFooter variant="guest" />}>
        {children}
      </KioskShell>
      {showDropSavedToast && (
        <div
          className="free-kiosk-drop-toast"
          role="status"
          aria-live="polite"
        >
          <div className="free-kiosk-drop-toast-inner">
            <p className="free-kiosk-drop-toast-msg">
              Drop saved on this device.
            </p>
            <div className="free-kiosk-drop-toast-actions">
              <button
                type="button"
                className="free-kiosk-drop-toast-link"
                onClick={() => {
                  dismissDropToast();
                  openHistory();
                }}
              >
                View history
              </button>
              <button
                type="button"
                className="free-kiosk-drop-toast-dismiss"
                onClick={dismissDropToast}
                aria-label="Dismiss"
              >
                <i className="fa-solid fa-xmark" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}
      {showHistory && (
        <FreeHistoryPanel onClose={() => setShowHistory(false)} />
      )}
    </>
  );
}
