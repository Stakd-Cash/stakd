export const toCents = (n) => Math.round(n * 100);
export const fromCents = (c) => c / 100;
export const formatMoney = (v) => `$${v.toFixed(2)}`;

export function rowValue(raw, denom, mode, extraCount = 0) {
  const n = Number(raw) || 0;
  if (mode === "count") {
    const count = Math.floor(n) + Math.floor(extraCount);
    return fromCents(count * toCents(denom));
  }
  return fromCents(toCents(n));
}

export function rowCount(raw, denom, mode, extraCount = 0) {
  const n = Number(raw) || 0;
  return mode === "count"
    ? Math.floor(n) + Math.floor(extraCount)
    : Math.floor(toCents(n) / toCents(denom));
}

export function rowSubtotal(raw, denom, mode, extraCount = 0) {
  const n = Number(raw) || 0;
  const extra = Math.floor(extraCount);
  if (!n && !extra) return null;
  if (mode === "count") {
    const v = (Math.floor(n) + extra) * denom;
    return v ? `=$${v.toFixed(2)}` : null;
  }
  const c = Math.floor(toCents(n) / toCents(denom));
  return c ? `=${c}×` : null;
}

