import { normalizeCash, normalizeRolls, loadAppState, sanitizeMode } from '../src/utils/appState.js';
import { EMPTY_CASH, EMPTY_ROLLS, DEFAULT_APP_STATE } from '../src/utils/constants.js';

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

describe('sanitizeMode', () => {
  test('returns "value" for "value"', () => {
    expect(sanitizeMode('value')).toBe('value');
  });
  test('returns "count" for "count"', () => {
    expect(sanitizeMode('count')).toBe('count');
  });
  test('returns "count" for invalid input', () => {
    expect(sanitizeMode('foo')).toBe('count');
    expect(sanitizeMode(null)).toBe('count');
    expect(sanitizeMode(undefined)).toBe('count');
    expect(sanitizeMode('')).toBe('count');
  });
});

describe('normalizeCash', () => {
  test('returns EMPTY_CASH for null/undefined', () => {
    expect(normalizeCash(null)).toEqual(EMPTY_CASH);
    expect(normalizeCash(undefined)).toEqual(EMPTY_CASH);
  });
  test('returns EMPTY_CASH for non-object', () => {
    expect(normalizeCash('string')).toEqual(EMPTY_CASH);
    expect(normalizeCash(42)).toEqual(EMPTY_CASH);
  });
  test('preserves valid cash values as strings', () => {
    const result = normalizeCash({ '100': 5, '50': '2' });
    expect(result['100']).toBe('5');
    expect(result['50']).toBe('2');
  });
  test('ignores unknown keys', () => {
    const result = normalizeCash({ '100': '3', 'bogus': '99' });
    expect(result['100']).toBe('3');
    expect(result).not.toHaveProperty('bogus');
  });
  test('treats empty string as empty', () => {
    const result = normalizeCash({ '20': '' });
    expect(result['20']).toBe('');
  });
  test('fills missing keys with empty string', () => {
    const result = normalizeCash({ '100': '1' });
    expect(result['50']).toBe('');
    expect(result['20']).toBe('');
  });
});

describe('normalizeRolls', () => {
  test('returns EMPTY_ROLLS for null/undefined', () => {
    expect(normalizeRolls(null)).toEqual(EMPTY_ROLLS);
    expect(normalizeRolls(undefined)).toEqual(EMPTY_ROLLS);
  });
  test('floors and clamps roll values', () => {
    const result = normalizeRolls({ '0.25': 2.7, '0.10': -3 });
    expect(result['0.25']).toBe(2);
    expect(result['0.10']).toBe(0);
  });
  test('treats NaN as 0', () => {
    const result = normalizeRolls({ '0.25': 'abc' });
    expect(result['0.25']).toBe(0);
  });
  test('preserves valid positive integers', () => {
    const result = normalizeRolls({ '0.25': 5, '0.01': 3 });
    expect(result['0.25']).toBe(5);
    expect(result['0.01']).toBe(3);
  });
});

describe('loadAppState', () => {
  test('returns defaults when localStorage is empty', () => {
    const state = loadAppState();
    expect(state.cash).toEqual({ ...EMPTY_CASH });
    expect(state.targetInput).toBe(DEFAULT_APP_STATE.targetInput);
    expect(state.billsMode).toBe('count');
    expect(state.coinsMode).toBe('count');
    expect(state.coinRolls).toEqual({ ...EMPTY_ROLLS });
    expect(state.page).toBe(1);
  });

  test('returns defaults for corrupt JSON', () => {
    mockStorage['ac_app_state'] = 'not-json{{{';
    const state = loadAppState();
    expect(state.cash).toEqual({ ...EMPTY_CASH });
  });

  test('returns defaults for non-object stored value', () => {
    mockStorage['ac_app_state'] = JSON.stringify('string');
    const state = loadAppState();
    expect(state.cash).toEqual({ ...EMPTY_CASH });
  });

  test('loads valid persisted state', () => {
    mockStorage['ac_app_state'] = JSON.stringify({
      cash: { '100': '3', '50': '1' },
      targetInput: '300',
      billsMode: 'value',
      coinsMode: 'count',
      coinRolls: { '0.25': 2 },
      page: 2,
    });
    const state = loadAppState();
    expect(state.cash['100']).toBe('3');
    expect(state.cash['50']).toBe('1');
    expect(state.targetInput).toBe('300');
    expect(state.billsMode).toBe('value');
    expect(state.page).toBe(2);
    expect(state.coinRolls['0.25']).toBe(2);
  });

  test('sanitizes invalid billsMode', () => {
    mockStorage['ac_app_state'] = JSON.stringify({
      cash: {},
      billsMode: 'invalid',
      coinsMode: 'invalid',
    });
    const state = loadAppState();
    expect(state.billsMode).toBe('count');
    expect(state.coinsMode).toBe('count');
  });

  test('clamps page to 1 or 2', () => {
    mockStorage['ac_app_state'] = JSON.stringify({
      cash: {},
      page: 99,
    });
    const state = loadAppState();
    expect(state.page).toBe(1);
  });

  test('handles legacy format (cash at top-level without .cash property)', () => {
    mockStorage['ac_app_state'] = JSON.stringify({
      '100': '5',
      '50': '2',
    });
    const state = loadAppState();
    expect(state.cash['100']).toBe('5');
    expect(state.cash['50']).toBe('2');
  });
});
