import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Sparkline } from './Sparkline.jsx';
import { SwipeableHistoryEntry } from './SwipeableHistoryEntry.jsx';
import { AnimatedSheet } from './AnimatedSheet.jsx';
import { haptic } from '../utils/haptics.js';
import { lsGet } from '../utils/storage.js';
import { LS_RECORD, LS_HISTORY, HISTORY_FILTERS } from '../utils/constants.js';
import {
  loadHistory,
  removeHistoryEntry,
  insertHistoryEntry,
  formatTime,
} from '../utils/history.js';
import { useAuthStore } from '../store/useAuthStore.js';

export function HistoryPanel({
  onClose,
  onRecordCleared,
  onRecordRestored,
  showToast,
  dismissToast,
}) {
  const [history, setHistory] = useState(loadHistory);
  const [clearConfirming, setClearConfirming] = useState(false);
  const [openSwipeRow, setOpenSwipeRow] = useState(null);
  const sheetBodyRef = useRef(null);
  const isKiosk = !!useAuthStore((s) => s.activeStaff);

  const clearConfirmTm = useRef(null);
  const undoRef = useRef(null);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const searchRef = useRef(null);
  const record = lsGet(LS_RECORD, 0);

  const clearHistory = useCallback(() => {
    haptic('heavy');
    localStorage.removeItem(LS_HISTORY);
    setHistory([]);
    setClearConfirming(false);
    onRecordCleared?.();
  }, [onRecordCleared]);

  const handleClearClick = useCallback(() => {
    if (clearConfirming) {
      clearHistory();
      return;
    }
    haptic('light');
    setClearConfirming(true);
    clearTimeout(clearConfirmTm.current);
    clearConfirmTm.current = setTimeout(
      () => setClearConfirming(false),
      2500
    );
  }, [clearConfirming, clearHistory]);

  useEffect(() => () => clearTimeout(clearConfirmTm.current), []);

  const ordered = useMemo(() => history.slice().reverse(), [history]);
  const recent = useMemo(() => ordered.slice(-14), [ordered]);
  const drops = useMemo(() => recent.map((e) => e.dropped), [recent]);
  const avgDrop = drops.length
    ? drops.reduce((s, v) => s + v, 0) / drops.length
    : 0;
  const dropStroke = ['var(--brand)', 'var(--brand-h)'];
  const dropFill = ['rgba(255,92,92,.2)', 'rgba(255,92,92,0)'];

  const exportCSV = () => {
    haptic('tap');
    const rows = [
      ['Date', 'Counted', 'Dropped', 'Remaining', 'Target'],
      ...ordered.map((e) => [
        new Date(e.ts).toLocaleString(),
        e.totalCash.toFixed(2),
        e.dropped.toFixed(2),
        e.remaining.toFixed(2),
        (e.target || 0).toFixed(2),
      ]),
    ];
    const csv = rows
      .map((r) =>
        r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drop-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    return ordered.filter((e) => {
      if (activeFilter === 'over' && e.totalCash < (e.target || 0))
        return false;
      if (activeFilter === 'under' && e.totalCash >= (e.target || 0))
        return false;
      if (activeFilter === 'record' && e.dropped !== record) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const date = formatTime(e.ts).toLowerCase();
        const counted = `$${e.totalCash.toFixed(2)}`;
        const dropped = `$${e.dropped.toFixed(2)}`;
        const target = `$${(e.target || 0).toFixed(2)}`;
        const bills = (e.dropDetails || [])
          .map((d) => `${d.count} ${d.label}`)
          .join(' ')
          .toLowerCase();
        if (![date, counted, dropped, target, bills].some((s) => s.includes(q)))
          return false;
      }
      return true;
    });
  }, [ordered, activeFilter, record, query]);

  const isFiltering = query.trim() !== '' || activeFilter !== 'all';

  const deleteEntryByIdx = useCallback(
    (idx) => {
      if (idx == null || idx < 0) return;
      haptic('heavy');
      const wasRecord = record > 0;
      const { next, entry } = removeHistoryEntry(idx);
      setHistory(next);
      if (wasRecord && entry?.dropped === record) onRecordCleared?.();
      undoRef.current = {
        index: idx,
        entry,
        wasRecord: wasRecord && entry?.dropped === record,
      };
      showToast?.('Entry deleted', 'neutral', 5000, {
        label: 'Undo',
        onClick: () => {
          const undo = undoRef.current;
          if (!undo?.entry) return;
          const restored = insertHistoryEntry(undo.index, undo.entry);
          setHistory(restored);
          if (undo.wasRecord) onRecordRestored?.(undo.entry.dropped);
          undoRef.current = null;
          dismissToast?.();
          showToast?.('Entry restored', 'success');
        },
      });
    },
    [record, onRecordCleared, onRecordRestored, showToast, dismissToast]
  );

  return (
    <AnimatedSheet onClose={onClose} scrollable>
      {(close) => (
        <>
          <div className="sheet-handle">
            <div className="sheet-handle-bar" />
          </div>
          <div className="sheet-hd">
            <span className="sheet-title">Drop History</span>
            <div className="history-hd-actions">
              {history.length > 0 && !isKiosk && (
                <button
                  className="clear-btn"
                  onClick={exportCSV}
                  title="Export CSV"
                >
                  <i className="fa-solid fa-arrow-up-from-bracket icon-14" /> CSV
                </button>
              )}
              {history.length > 0 && !isKiosk && (
                <button
                  className={`clear-btn${
                    clearConfirming ? ' confirming' : ''
                  }`}
                  onClick={handleClearClick}
                >
                  Clear All
                </button>
              )}
              <button
                className="icon-btn"
                onClick={() => {
                  haptic('tap');
                  close();
                }}
                aria-label="Close history"
                title="Close"
              >
                <i className="fa-solid fa-xmark icon-18" />
              </button>
            </div>
          </div>
          <div className="sheet-body" ref={sheetBodyRef}>
            {history.length > 0 && (
              <>
                <div className="history-search-wrap">
                  <div className="history-search-row">
                    <span className="history-search-icon">
                      <i className="fa-solid fa-magnifying-glass icon-15" />
                    </span>
                    <input
                      ref={searchRef}
                      className="history-search-input"
                      type="text"
                      placeholder="Search by date, amount, bills…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                      <button
                        className="history-search-clear"
                        onClick={() => {
                          setQuery('');
                          searchRef.current?.focus();
                        }}
                        aria-label="Clear search"
                        title="Clear search"
                      >
                        <i className="fa-solid fa-xmark icon-11" />
                      </button>
                    )}
                  </div>
                  <div className="history-filter-row">
                    <button
                      className={`history-filter-toggle${
                        filterOpen ? ' open' : ''
                      }${activeFilter !== 'all' ? ' active' : ''}`}
                      onClick={() => {
                        haptic('tap');
                        setFilterOpen((v) => !v);
                      }}
                      aria-expanded={filterOpen}
                    >
                      <span>
                        {HISTORY_FILTERS.find((f) => f.id === activeFilter)
                          ?.label || 'All'}
                      </span>
                      <i
                        className="fa-solid fa-chevron-down history-filter-chev icon-14"
                      />
                    </button>
                    {filterOpen && (
                      <div className="history-filter-dropdown">
                        {HISTORY_FILTERS.map((f) => (
                          <button
                            key={f.id}
                            className={`history-filter-option${
                              activeFilter === f.id ? ' active' : ''
                            }`}
                            onClick={() => {
                              haptic('tap');
                              setActiveFilter(f.id);
                              setFilterOpen(false);
                            }}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="history-trends">
                  <div className="trend-card trend-card-wide">
                    <div className="trend-title">Avg drop (last 14)</div>
                    <div className="trend-value">${avgDrop.toFixed(2)}</div>
                    <Sparkline
                      data={drops}
                      stroke={dropStroke}
                      fill={dropFill}
                    />
                  </div>
                  <div className="trend-row">
                    <div className="trend-card">
                      <div className="trend-title">Record drop</div>
                      <div className={`trend-value${record > 0 ? ' up' : ''}`}>
                        {record > 0 ? `$${record.toFixed(2)}` : '—'}
                      </div>
                    </div>
                    <div className="trend-card">
                      <div className="trend-title">Total drops</div>
                      <div className="trend-value">{history.length}</div>
                    </div>
                  </div>
                </div>
                {isFiltering && (
                  <div className="history-results-count">
                    {filtered.length} result
                    {filtered.length !== 1 ? 's' : ''}
                  </div>
                )}
              </>
            )}
            {history.length === 0 ? (
              <div className="history-empty">
                <div className="history-empty-icon"><i className="fa-solid fa-clock-rotate-left"></i></div>
                <div className="history-empty-title">
                  No drops yet
                </div>
                <div className="history-empty-sub">
                  Completed counts will appear here
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="history-empty">
                <div className="history-empty-icon"><i className="fa-solid fa-magnifying-glass"></i></div>
                <div className="history-empty-title">
                  No results
                </div>
                <div className="history-empty-sub">
                  Try a different search or filter
                </div>
              </div>
            ) : (
              <div className="history-list">
                {filtered.map((e, i) => {
                  const orderedIdx = ordered.findIndex((o) => o === e);
                  const historyIdx =
                    orderedIdx >= 0 ? history.length - 1 - orderedIdx : -1;
                  return (
                    <SwipeableHistoryEntry
                      key={e.ts + '_' + i}
                      rowId={e.ts + '_' + i}
                      entry={e}
                      record={record}
                      formatTime={formatTime}
                      onDelete={
                        !isKiosk && historyIdx >= 0
                          ? () => deleteEntryByIdx(historyIdx)
                          : undefined
                      }
                      openRowId={openSwipeRow}
                      onSwipeStart={setOpenSwipeRow}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </AnimatedSheet>
  );
}
