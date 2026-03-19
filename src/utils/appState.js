import { lsGet, lsSet } from './storage.js';
import {
  EMPTY_CASH,
  EMPTY_ROLLS,
  DEFAULT_APP_STATE,
  LS_APP_STATE,
} from './constants.js';

export const sanitizeMode = (m) => (m === 'value' ? 'value' : 'count');

export function normalizeCash(raw) {
  const next = { ...EMPTY_CASH };
  if (raw && typeof raw === 'object') {
    for (const id of Object.keys(next)) {
      const v = raw[id];
      if (v !== undefined && v !== null && v !== '') next[id] = String(v);
    }
  }
  return next;
}

export function normalizeRolls(raw) {
  const next = { ...EMPTY_ROLLS };
  if (raw && typeof raw === 'object') {
    for (const id of Object.keys(next)) {
      const v = Math.floor(Number(raw[id]) || 0);
      if (v > 0) next[id] = v;
    }
  }
  return next;
}

export function loadAppState() {
  const raw = lsGet(LS_APP_STATE, null);
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_APP_STATE,
      cash: { ...EMPTY_CASH },
      coinRolls: { ...EMPTY_ROLLS },
    };
  }
  if (!raw.cash) {
    return {
      ...DEFAULT_APP_STATE,
      cash: normalizeCash(raw),
      coinRolls: { ...EMPTY_ROLLS },
    };
  }
  return {
    cash: normalizeCash(raw.cash),
    targetInput:
      raw.targetInput != null
        ? String(raw.targetInput)
        : DEFAULT_APP_STATE.targetInput,
    billsMode: sanitizeMode(raw.billsMode),
    coinsMode: sanitizeMode(raw.coinsMode),
    coinRolls: normalizeRolls(raw.coinRolls),
    page: raw.page === 2 ? 2 : 1,
  };
}

export function saveAppState(state) {
  lsSet(LS_APP_STATE, state);
}
