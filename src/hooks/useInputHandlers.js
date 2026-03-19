import { useCallback } from 'react';
import { BILL_DENOMS, COIN_DENOMS, EMPTY_ROLLS } from '../utils/constants.js';
import { toCents, fromCents } from '../utils/money.js';
import { convertCash, rollExtraCount } from '../utils/drop.js';
import { useAppStore } from '../store/useStore.js';

export function useInputHandlers() {
  const cash = useAppStore((s) => s.cash);
  const billsMode = useAppStore((s) => s.billsMode);
  const coinsMode = useAppStore((s) => s.coinsMode);
  const coinRolls = useAppStore((s) => s.coinRolls);
  const setCash = useAppStore((s) => s.setCash);
  const setBillsMode = useAppStore((s) => s.setBillsMode);
  const setCoinsMode = useAppStore((s) => s.setCoinsMode);
  const setCoinRolls = useAppStore((s) => s.setCoinRolls);

  const handleManualInput = useCallback(
    (id, val, mode) => {
      const re = mode === 'count' ? /^\d*$/ : /^\d*\.?\d*$/;
      if (val === '' || re.test(val)) setCash((prev) => ({ ...prev, [id]: val }));
    },
    [setCash]
  );

  const handleStep = useCallback(
    (id, delta, denom, mode) => {
      setCash((prev) => {
        const cur = Number(prev[id]) || 0;
        const step = mode === 'count' ? 1 : denom;
        const next = Math.max(0, cur + delta * step);
        const val =
          mode === 'value' ? parseFloat(next.toFixed(2)) : Math.round(next);
        return { ...prev, [id]: val === 0 ? '' : String(val) };
      });
    },
    [setCash]
  );

  const handleCoinRoll = useCallback(
    (id, delta) => {
      setCoinRolls((prev) => {
        const cur = Math.max(0, Math.floor(Number(prev[id]) || 0));
        const next = Math.max(0, cur + delta);
        if (next === cur) return prev;
        return { ...prev, [id]: next };
      });
    },
    [setCoinRolls]
  );

  const handleCoinRollSet = useCallback(
    (id, val) => {
      setCoinRolls((prev) => {
        const next = Math.max(0, Math.floor(Number(val) || 0));
        if (next === prev[id]) return prev;
        return { ...prev, [id]: next };
      });
    },
    [setCoinRolls]
  );

  const handleBillsModeChange = useCallback(
    (m) => {
      setCash((prev) =>
        convertCash(
          prev,
          billsMode,
          m,
          BILL_DENOMS.map((d) => ({ id: String(d), val: d }))
        )
      );
      setBillsMode(m);
    },
    [billsMode, setCash, setBillsMode]
  );

  const handleCoinsModeChange = useCallback(
    (nextMode) => {
      if (nextMode === coinsMode) return;
      if (coinsMode === 'count' && nextMode === 'value') {
        const nextCash = { ...cash };
        COIN_DENOMS.forEach((c) => {
          const loose = Number(cash[c.id]) || 0;
          const rolls = Number(coinRolls[c.id]) || 0;
          const totalCount =
            Math.floor(loose) + rollExtraCount(c.id, rolls);
          const totalValue = fromCents(totalCount * toCents(c.val));
          nextCash[c.id] = totalValue ? totalValue.toFixed(2) : '';
        });
        setCash(nextCash);
        setCoinRolls(EMPTY_ROLLS);
      } else if (coinsMode === 'value' && nextMode === 'count') {
        const nextCash = { ...cash };
        const nextRolls = { ...EMPTY_ROLLS };
        COIN_DENOMS.forEach((c) => {
          const totalCount = Math.floor(
            toCents(Number(cash[c.id]) || 0) / toCents(c.val)
          );
          if (c.roll) {
            const rolls = Math.floor(totalCount / c.roll);
            const loose = totalCount - rolls * c.roll;
            nextRolls[c.id] = rolls;
            nextCash[c.id] = loose ? String(loose) : '';
          } else {
            nextCash[c.id] = totalCount ? String(totalCount) : '';
          }
        });
        setCash(nextCash);
        setCoinRolls(nextRolls);
      } else {
        setCash((prev) => convertCash(prev, coinsMode, nextMode, COIN_DENOMS));
        setCoinRolls(EMPTY_ROLLS);
      }
      setCoinsMode(nextMode);
    },
    [coinsMode, cash, coinRolls, setCash, setCoinRolls, setCoinsMode]
  );

  const billStep = useCallback(
    (id, d, denom) => handleStep(id, d, denom, billsMode),
    [handleStep, billsMode]
  );

  const coinStep = useCallback(
    (id, d, denom) => handleStep(id, d, denom, coinsMode),
    [handleStep, coinsMode]
  );

  return {
    handleManualInput,
    handleStep,
    handleCoinRoll,
    handleCoinRollSet,
    handleBillsModeChange,
    handleCoinsModeChange,
    billStep,
    coinStep,
  };
}
