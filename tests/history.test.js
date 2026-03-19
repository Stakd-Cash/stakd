import { loadHistory, pushHistory, removeHistoryEntry, insertHistoryEntry, formatTime } from '../src/utils/history.js';

// Mock localStorage
const mockStorage = {};
const localStorageMock = {
  getItem: (key) => (key in mockStorage ? mockStorage[key] : null),
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

beforeEach(() => localStorageMock.clear());

const makeEntry = (i) => ({
  ts: 1700000000000 + i * 1000,
  totalCash: 100 + i,
  dropped: 50 + i,
  remaining: 50,
  target: 200,
  dropDetails: [],
});

describe('loadHistory', () => {
  test('returns empty array when no history', () => {
    expect(loadHistory()).toEqual([]);
  });

  test('returns stored history', () => {
    const entries = [makeEntry(0), makeEntry(1)];
    mockStorage['ac_history_v2'] = JSON.stringify(entries);
    expect(loadHistory()).toEqual(entries);
  });

  test('returns empty array for corrupt data', () => {
    mockStorage['ac_history_v2'] = 'not-json{';
    expect(loadHistory()).toEqual([]);
  });
});

describe('pushHistory', () => {
  test('adds entry to front', () => {
    const e1 = makeEntry(1);
    const e2 = makeEntry(2);
    pushHistory(e1);
    pushHistory(e2);
    const history = loadHistory();
    expect(history.length).toBe(2);
    expect(history[0]).toEqual(e2);
    expect(history[1]).toEqual(e1);
  });

  test('caps history at 50 entries', () => {
    for (let i = 0; i < 55; i++) {
      pushHistory(makeEntry(i));
    }
    const history = loadHistory();
    expect(history.length).toBe(50);
    // Most recent should be first
    expect(history[0].ts).toBe(makeEntry(54).ts);
  });
});

describe('removeHistoryEntry', () => {
  test('removes entry at index', () => {
    pushHistory(makeEntry(0));
    pushHistory(makeEntry(1));
    pushHistory(makeEntry(2));
    const { next, entry } = removeHistoryEntry(1);
    expect(next.length).toBe(2);
    expect(entry.ts).toBe(makeEntry(1).ts);
  });

  test('returns removed entry for undo', () => {
    pushHistory(makeEntry(0));
    const { entry } = removeHistoryEntry(0);
    expect(entry).toEqual(makeEntry(0));
  });
});

describe('insertHistoryEntry', () => {
  test('re-inserts entry at index', () => {
    pushHistory(makeEntry(0));
    pushHistory(makeEntry(1));
    pushHistory(makeEntry(2));
    const { entry } = removeHistoryEntry(1);
    insertHistoryEntry(1, entry);
    const history = loadHistory();
    expect(history.length).toBe(3);
    expect(history[1].ts).toBe(entry.ts);
  });

  test('returns current history for null entry', () => {
    pushHistory(makeEntry(0));
    const result = insertHistoryEntry(0, null);
    expect(result.length).toBe(1);
  });

  test('clamps index to valid range', () => {
    pushHistory(makeEntry(0));
    insertHistoryEntry(999, makeEntry(1));
    const history = loadHistory();
    expect(history.length).toBe(2);
  });
});

describe('formatTime', () => {
  test('returns a non-empty formatted string', () => {
    const result = formatTime(1700000000000);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
