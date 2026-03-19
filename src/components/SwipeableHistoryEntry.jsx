import React from 'react';
import { useSwipeReveal } from '../hooks/useSwipeReveal.js';
import { useLongPress } from '../hooks/useLongPress.js';
import { haptic } from '../utils/haptics.js';

export function SwipeableHistoryEntry({
  entry: e,
  record,
  formatTime,
  onDelete,
  rowId,
  openRowId,
  onSwipeStart,
}) {
  const swipe = useSwipeReveal({
    rowId,
    openRowId,
    onSwipeStart,
    onDelete,
  });

  const longPressRef = useLongPress(
    onDelete
      ? () => {
          onSwipeStart?.(rowId);
          swipe.open();
          haptic('light');
        }
      : () => {},
    300
  );

  return (
    <div
      className="swipeable-row"
      ref={(el) => {
        swipe.ref.current = el;
        longPressRef.current = el;
      }}
    >
      {onDelete && (
        <button
          type="button"
          className="swipe-delete"
          onClick={(ev) => {
            ev.stopPropagation();
            onDelete();
          }}
          aria-label="Delete"
        >
          <i className="fa-solid fa-trash icon-18" />
        </button>
      )}
      <div className="swipe-track">
        <div
          className={`history-entry${
            e.dropped === record && record > 0 ? ' record' : ''
          }`}
        >
          <div className="history-meta">
            <span className="history-time">{formatTime(e.ts)}</span>
            <div className="history-meta-right">
              {e.dropped === record && record > 0 && (
                <span className="record-badge">Record</span>
              )}
              <span className="history-target">
                target ${e.target?.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="stat-grid">
            <div className="stat-pill neutral">
              <div className="stat-pill-label">Counted</div>
              <div className="stat-pill-value">
                ${e.totalCash.toFixed(2)}
              </div>
            </div>
            <div className="stat-pill green">
              <div className="stat-pill-label">Dropped</div>
              <div className="stat-pill-value">
                ${e.dropped.toFixed(2)}
              </div>
            </div>
            <div className="stat-pill dark">
              <div className="stat-pill-label">Remains</div>
              <div className="stat-pill-value">
                ${e.remaining.toFixed(2)}
              </div>
            </div>
          </div>
          {e.dropDetails?.length > 0 && (
            <div className="history-chips">
              {e.dropDetails.map((d) => (
                <span key={d.label} className="history-chip">
                  {d.count}× {d.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
