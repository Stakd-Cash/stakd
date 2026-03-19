import { toCents, fromCents, formatMoney, rowValue, rowCount, rowSubtotal } from '../src/utils/money.js';

describe('toCents', () => {
  test('converts dollars to cents', () => {
    expect(toCents(1)).toBe(100);
    expect(toCents(0.25)).toBe(25);
    expect(toCents(0.01)).toBe(1);
    expect(toCents(99.99)).toBe(9999);
  });
  test('handles zero', () => {
    expect(toCents(0)).toBe(0);
  });
  test('handles floating point', () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
  });
});

describe('fromCents', () => {
  test('converts cents to dollars', () => {
    expect(fromCents(100)).toBe(1);
    expect(fromCents(25)).toBe(0.25);
    expect(fromCents(1)).toBe(0.01);
    expect(fromCents(9999)).toBe(99.99);
  });
  test('handles zero', () => {
    expect(fromCents(0)).toBe(0);
  });
});

describe('formatMoney', () => {
  test('formats dollars with two decimals', () => {
    expect(formatMoney(100)).toBe('$100.00');
    expect(formatMoney(0)).toBe('$0.00');
    expect(formatMoney(1.5)).toBe('$1.50');
    expect(formatMoney(99.999)).toBe('$100.00');
  });
});

describe('rowValue', () => {
  test('count mode: raw * denom', () => {
    expect(rowValue('5', 20, 'count')).toBe(100);
    expect(rowValue('', 20, 'count')).toBe(0);
    expect(rowValue('0', 10, 'count')).toBe(0);
  });
  test('value mode: raw directly', () => {
    expect(rowValue('50.00', 20, 'value')).toBe(50);
    expect(rowValue('', 20, 'value')).toBe(0);
  });
  test('value mode: rounds through cents to avoid float errors', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS, should round to 0.3
    expect(rowValue(String(0.1 + 0.2), 0.01, 'value')).toBe(0.3);
  });
  test('count mode with extra coins', () => {
    expect(rowValue('3', 0.25, 'count', 40)).toBe(10.75);
  });
});

describe('rowCount', () => {
  test('count mode: raw + extra', () => {
    expect(rowCount('5', 20, 'count')).toBe(5);
    expect(rowCount('5', 0.25, 'count', 40)).toBe(45);
  });
  test('value mode: value / denom', () => {
    expect(rowCount('100', 20, 'value')).toBe(5);
  });
});
