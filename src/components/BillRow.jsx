import React, { memo, useCallback, useState, useEffect, useRef } from 'react';
import { haptic } from '../utils/haptics.js';
import { rowSubtotal } from '../utils/money.js';
import { useHoldRepeat } from '../hooks/useHoldRepeat.js';

export const BillRow = memo(function BillRow({
  id,
  label,
  denom,
  rollCount,
  rolls = 0,
  onRoll,
  onRollSet,
  inputMode,
  value,
  onManualInput,
  onStep,
  onEnterKey,
}) {
  const hasRoll = Number.isFinite(rollCount) && rollCount > 0;
  const rollQty = Math.max(0, Math.floor(Number(rolls) || 0));
  const extraCount =
    inputMode === 'count' && hasRoll ? rollQty * rollCount : 0;
  const has = Number(value) > 0 || extraCount > 0;
  const sub = rowSubtotal(value, denom, inputMode, extraCount);
  const rollLabel = hasRoll
    ? inputMode === 'count'
      ? `${rollCount}/roll`
      : `$${(rollCount * denom).toFixed(2)}`
    : '';

  const plusCb = useCallback(
    () => onStep(id, 1, denom),
    [id, denom, onStep]
  );
  const minusCb = useCallback(
    () => onStep(id, -1, denom),
    [id, denom, onStep]
  );
  const plus = useHoldRepeat(plusCb);
  const minus = useHoldRepeat(minusCb);

  const applyRollDelta = useCallback(
    (delta) => {
      if (inputMode === 'count' && onRoll) {
        onRoll(id, delta);
        return;
      }
      onStep(id, delta * rollCount, denom);
    },
    [id, inputMode, onRoll, onStep, rollCount, denom]
  );

  const rollHoldRef = useRef(null);
  const rollFiredRef = useRef(false);
  const rollTouchActive = useRef(false);
  const [rollHolding, setRollHolding] = useState(false);
  const rollTouchStartY = useRef(null);

  const startRollHold = useCallback(
    (e) => {
      haptic('destruct');
      rollFiredRef.current = false;
      rollTouchStartY.current = e.touches?.[0]?.clientY ?? null;
      rollHoldRef.current = setTimeout(() => {
        haptic('success');
        rollFiredRef.current = true;
        setRollHolding(true);
        applyRollDelta(-1);
      }, 600);
    },
    [applyRollDelta]
  );

  const cancelRollHold = useCallback(() => {
    clearTimeout(rollHoldRef.current);
    setRollHolding(false);
    rollTouchStartY.current = null;
    rollFiredRef.current = false;
  }, []);

  useEffect(() => () => clearTimeout(rollHoldRef.current), []);

  return (
    <div className={`denom-row${has ? ' has-value' : ''}`}>
      <span className={`denom-label${has ? ' active' : ''}`}>{label}</span>
      <div className="denom-input-wrap">
        {inputMode === 'value' && <span className="denom-prefix">$</span>}
        <input
          type="text"
          inputMode={inputMode === 'count' ? 'numeric' : 'decimal'}
          enterKeyHint="done"
          autoComplete="off"
          className={`denom-input${inputMode === 'value' ? ' has-prefix' : ''}`}
          value={value}
          placeholder="0"
          onChange={(e) => {
            onManualInput(id, e.target.value, inputMode);
          }}
          onFocus={(e) => {
            e.target.select();
          }}
          onBlur={(e) => {
            if (inputMode === 'value') {
              const n = parseFloat(e.target.value);
              if (!Number.isNaN(n) && n >= 0)
                onManualInput(id, n.toFixed(2), inputMode);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.target.blur();
              onEnterKey?.();
            }
          }}
          onWheel={(e) => e.target.blur()}
        />
        {sub && (
          <span className="row-sub-inline">{sub}</span>
        )}
      </div>
      <div className="stepper">
        {hasRoll && inputMode === 'count' && (
          <button
            className={`roll-btn${rollHolding ? ' roll-holding' : ''}`}
            title={`Tap: +1 roll (${rollCount} coins) · Hold: −1 roll`}
            aria-label={`Add 1 roll (${rollCount} coins); hold to remove`}
            onTouchStart={(e) => {
              e.stopPropagation();
              rollTouchActive.current = true;
              startRollHold(e);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (!rollFiredRef.current) applyRollDelta(1);
              cancelRollHold();
            }}
            onTouchMove={(e) => {
              const y = rollTouchStartY.current;
              if (y == null) return;
              const dy = Math.abs(e.touches[0].clientY - y);
              if (dy > 10) cancelRollHold();
            }}
            onPointerDown={(e) => {
              if (e.pointerType === 'mouse') haptic('destruct');
            }}
            onClick={() => {
              if (rollTouchActive.current) {
                rollTouchActive.current = false;
                return;
              }
              applyRollDelta(1);
            }}
          >
            <div className="roll-btn-icons">
              {rollHolding ? (
                <i className="fa-solid fa-minus icon-13" />
              ) : (
                <i className="fa-solid fa-plus icon-11" />
              )}
              <i className="fa-solid fa-coins icon-14" />
            </div>
            <span className="roll-btn-label">
              {rollHolding ? '−roll' : rollLabel}
            </span>
            {rollQty > 0 && !rollHolding && (
              <span className="roll-btn-count">×{rollQty}</span>
            )}
          </button>
        )}
        <button
          className={`step-btn${minus.repeating ? ' repeating' : ''}`}
          onTouchStart={(e) => {
            e.stopPropagation();
            haptic('step');
            minus.start(e.touches[0].clientY);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            minus.stop();
          }}
          onTouchMove={minus.onTouchMove}
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse') {
              haptic('step');
              minus.start();
            }
          }}
          onPointerUp={(e) => {
            if (e.pointerType === 'mouse') minus.stop();
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') minus.stop();
          }}
          onPointerCancel={minus.stop}
          aria-label={`Decrease ${label}`}
        >
          <i className="fa-solid fa-minus icon-16" />
        </button>
        <button
          className={`step-btn plus${has ? ' active' : ''}${
            plus.repeating ? ' repeating' : ''
          }`}
          onTouchStart={(e) => {
            e.stopPropagation();
            haptic('step');
            plus.start(e.touches[0].clientY);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            plus.stop();
          }}
          onTouchMove={plus.onTouchMove}
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse') {
              haptic('step');
              plus.start();
            }
          }}
          onPointerUp={(e) => {
            if (e.pointerType === 'mouse') plus.stop();
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') plus.stop();
          }}
          onPointerCancel={plus.stop}
          aria-label={`Increase ${label}`}
        >
          <i className="fa-solid fa-plus icon-16" />
        </button>
      </div>
    </div>
  );
});

// CoinRow is the same component — rolls only render when rollCount is provided
export const CoinRow = BillRow;
