import { lsGet, lsSet } from './storage.js';
import { LS_HISTORY } from './constants.js';

export function loadHistory() {
  return lsGet(LS_HISTORY, []);
}

export function pushHistory(entry) {
  lsSet(LS_HISTORY, [entry, ...loadHistory()].slice(0, 50));
}

export function removeHistoryEntry(index) {
  const list = loadHistory();
  const entry = list[index];
  const next = list.filter((_, i) => i !== index);
  lsSet(LS_HISTORY, next);
  return { next, entry };
}

export function insertHistoryEntry(index, entry) {
  if (!entry) return loadHistory();
  const list = loadHistory();
  const next = list.slice();
  const safe = Math.max(0, Math.min(index, next.length));
  next.splice(safe, 0, entry);
  lsSet(LS_HISTORY, next);
  return next;
}

export function formatTime(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
