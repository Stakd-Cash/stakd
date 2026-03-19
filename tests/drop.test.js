import { computeDrop, rollExtraCount, convertCash } from '../src/utils/drop.js';

describe('computeDrop', () => {
  test('returns empty array when drop amount is 0', () => {
    const cash = { '100': '1', '50': '', '20': '', '10': '', '5': '', '1': '' };
    expect(computeDrop(cash, 'count', 0, 200)).toEqual([]);
  });

  test('drops exact bills when possible', () => {
    const cash = { '100': '3', '50': '2', '20': '5', '10': '3', '5': '2', '1': '10' };
    const result = computeDrop(cash, 'count', 100, 200);
    const total = result.reduce((s, r) => s + r.value, 0);
    expect(total).toBe(100);
  });

  test('returns optimal bill combination', () => {
    const cash = { '100': '0', '50': '2', '20': '3', '10': '5', '5': '10', '1': '20' };
    const result = computeDrop(cash, 'count', 70, 200);
    const total = result.reduce((s, r) => s + r.value, 0);
    expect(total).toBe(70);
  });

  test('handles large drop amounts with greedy fallback', () => {
    const cash = { '100': '20', '50': '10', '20': '5', '10': '5', '5': '5', '1': '10' };
    const result = computeDrop(cash, 'count', 1500, 200);
    const total = result.reduce((s, r) => s + r.value, 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(1500);
  });

  test('each result item has label, count, value, denom', () => {
    const cash = { '100': '1', '50': '1', '20': '1', '10': '1', '5': '1', '1': '5' };
    const result = computeDrop(cash, 'count', 50, 100);
    for (const item of result) {
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('count');
      expect(item).toHaveProperty('value');
      expect(item).toHaveProperty('denom');
      expect(item.count).toBeGreaterThan(0);
      expect(item.value).toBeGreaterThan(0);
    }
  });
});

describe('rollExtraCount', () => {
  test('returns roll * rollCount for known coins', () => {
    expect(rollExtraCount('0.25', 2)).toBe(80);
    expect(rollExtraCount('0.10', 3)).toBe(150);
  });

  test('returns 0 for coins with no roll size', () => {
    expect(rollExtraCount('1.00', 5)).toBe(0);
    expect(rollExtraCount('0.50', 3)).toBe(0);
  });

  test('returns 0 for zero rolls', () => {
    expect(rollExtraCount('0.25', 0)).toBe(0);
  });
});

describe('convertCash', () => {
  test('count to value conversion', () => {
    const cash = { '100': '3', '50': '2' };
    const denoms = [
      { id: '100', val: 100 },
      { id: '50', val: 50 },
    ];
    const result = convertCash(cash, 'count', 'value', denoms);
    expect(result['100']).toBe('300');
    expect(result['50']).toBe('100');
  });

  test('value to count conversion', () => {
    const cash = { '100': '300', '50': '100' };
    const denoms = [
      { id: '100', val: 100 },
      { id: '50', val: 50 },
    ];
    const result = convertCash(cash, 'value', 'count', denoms);
    expect(result['100']).toBe('3');
    expect(result['50']).toBe('2');
  });

  test('same mode returns same cash', () => {
    const cash = { '100': '5' };
    expect(convertCash(cash, 'count', 'count', [])).toBe(cash);
  });
});
