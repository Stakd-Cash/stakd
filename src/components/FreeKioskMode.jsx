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

// ---------------------------------------------------------------------------
// Free drop localStorage helpers
// ---------------------------------------------------------------------------
const FREE_DROPS_KEY = 'stakd_free_drops';
const FREE_NAME_KEY = 'stakd_free_name';
const MAX_FREE_DROPS = 50;

function loadFreeDrops() {
  try {
    return JSON.parse(localStorage.getItem(FREE_DROPS_KEY) || '[]');
  } catch { return []; }
}

function saveFreeDrops(list) {
  try {
    localStorage.setItem(FREE_DROPS_KEY, JSON.stringify(list.slice(0, MAX_FREE_DROPS)));
  } catch {}
}

function removeFreeDropByIndex(idx) {
  const list = loadFreeDrops();
  const entry = list[idx];
  const next = list.filter((_, i) => i !== idx);
  saveFreeDrops(next);
  return { next, entry };
}

function loadFreeName() {
  try { return localStorage.getItem(FREE_NAME_KEY) || ''; } catch { return ''; }
}

function saveFreeName(name) {
  try { localStorage.setItem(FREE_NAME_KEY, name); } catch {}
}

// ---------------------------------------------------------------------------
// FreeKioskEyebrow — "GUEST SESSION" / editable name eyebrow inside card
// ---------------------------------------------------------------------------
function FreeKioskEyebrow({ onOpenHistory }) {
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
    <div className="free-kiosk-eyebrow-bar">
      <div className="free-kiosk-eyebrow-left">
        {editing ? (
          <input
            ref={inputRef}
            className="free-kiosk-name-input"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            placeholder="Enter your name"
            maxLength={30}
          />
        ) : name ? (
          <span className="free-kiosk-eyebrow">
            Counting as {name.toUpperCase()}
            <button className="free-kiosk-eyebrow-action" onClick={startEdit}>
              Change
            </button>
          </span>
        ) : (
          <span className="free-kiosk-eyebrow">
            Guest session
            <a className="free-kiosk-eyebrow-action" href="#/login">
              Sign in <i className="fa-solid fa-arrow-right" />
            </a>
          </span>
        )}
      </div>
      <button
        className="free-kiosk-history-btn"
        onClick={onOpenHistory}
        aria-label="Drop history"
        title="Drop history"
      >
        <i className="fa-solid fa-clock-rotate-left" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FreeModeBanner — quiet upsell footer line below card
// ---------------------------------------------------------------------------
function FreeModeBanner() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <div className="free-kiosk-footer">
        <span>Your drops are saved on this device only.</span>
        {' '}
        <button className="free-kiosk-footer-cta" onClick={() => setSheetOpen(true)}>
          Show your manager →
        </button>
      </div>
      {sheetOpen && <UpsellSheet onClose={() => setSheetOpen(false)} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// UpsellSheet — bottom sheet / modal with share functionality
// ---------------------------------------------------------------------------
function UpsellSheet({ onClose }) {
  const [closing, triggerClose] = useModalClose(200);
  const focusRef = useFocusTrap(true);
  const [copied, setCopied] = useState(false);

  const close = useCallback(() => triggerClose(onClose), [triggerClose, onClose]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  const handleCopy = useCallback(() => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText('stakd.cash').then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  }, []);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: 'stakd',
        text: 'Check out stakd for managing your store\'s cash drops.',
        url: 'https://stakd.cash',
      }).catch(() => {});
    } else {
      handleCopy();
    }
  }, [handleCopy]);

  return (
    <div
      className={`sk-backdrop${closing ? ' sk-modal-closing' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Sync your drops"
    >
      <div className="free-upsell-sheet" ref={focusRef} onClick={(e) => e.stopPropagation()}>
        <button className="free-upsell-close" onClick={close} aria-label="Close">
          <i className="fa-solid fa-xmark icon-18" />
        </button>
        <div className="free-upsell-body">
          <h2 className="free-upsell-title">
            stakd saves your whole team's drops — automatically.
          </h2>
          <p className="free-upsell-text">
            Managers get real-time visibility, variance alerts, and full drop
            history across every cashier. Ask your manager to set up stakd for your store.
          </p>
          <div className="free-upsell-link-row">
            <span className="free-upsell-url">stakd.cash</span>
            <button className="free-upsell-copy" onClick={handleCopy}>
              {copied ? (
                <><i className="fa-solid fa-check" /> Copied</>
              ) : (
                <><i className="fa-solid fa-copy" /> Copy</>
              )}
            </button>
          </div>
          <button className="free-upsell-share" onClick={handleShare}>
            <i className="fa-solid fa-share-nodes" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
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
// FreeKioskMode — main container for unauthenticated kiosk
// ---------------------------------------------------------------------------
export function FreeKioskMode({ children }) {
  const [showHistory, setShowHistory] = useState(false);
  const page = useAppStore((s) => s.page);
  const prevPageRef = useRef(page);
  const lastSavedTsRef = useRef(0);

  // When page transitions to 2 (result), capture drop data and save to free drops
  useEffect(() => {
    const prevPage = prevPageRef.current;
    prevPageRef.current = page;

    if (prevPage === 1 && page === 2) {
      const state = useAppStore.getState();
      const { cash, billsMode, coinsMode, coinRolls, targetInput } = state;
      const TARGET = Math.max(0, Number(targetInput) || 0);

      // Compute totals synchronously
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

      // Timing guard: bail if no meaningful data
      if (totalCash <= 0) return;

      const details = computeDrop(cash, billsMode, dropAmount, TARGET);
      // Bail if drop details couldn't be computed
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

      // Dedup guard: don't save if we just saved within 500ms
      if (Date.now() - lastSavedTsRef.current < 500) return;
      lastSavedTsRef.current = Date.now();

      const existing = loadFreeDrops();
      saveFreeDrops([entry, ...existing]);
    }
  }, [page]);

  const openHistory = useCallback(() => {
    haptic('tap');
    setShowHistory(true);
  }, []);

  return (
    <div className="free-kiosk-page">
      <div className="free-kiosk-container">
        <div className="pathway-brand">
          <span className="pathway-brand-name">
            <img src="/src/stakd-logo-text.svg" alt="stakd" height="35" />
          </span>
        </div>

        <div className="free-kiosk-card">
          <FreeKioskEyebrow onOpenHistory={openHistory} />
          {children}
        </div>

        <FreeModeBanner />
      </div>
      {showHistory && (
        <FreeHistoryPanel onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}
