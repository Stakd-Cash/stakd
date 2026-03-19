export function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    if (fallback != null && typeof parsed !== typeof fallback) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e?.name === 'QuotaExceededError') {
      console.warn('[storage] localStorage quota exceeded for key:', key);
    }
  }
}
