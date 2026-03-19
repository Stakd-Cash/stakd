import { toCents, fromCents, rowCount } from './money.js';
import { BILL_DENOMS, COIN_DENOMS, DP_MAX_CENTS, COIN_ROLLS } from './constants.js';

const RANK = { 100: 1, 50: 2, 20: 3, 10: 4, 5: 5, 1: 6 };
const BILL_COST_WEIGHT = 1000;

let _dpArr = null;
let _prevArr = null;
let _pickArr = null;

function _getDPBuffers(size) {
  if (!_dpArr || _dpArr.length < size) {
    _dpArr = new Int32Array(size);
    _prevArr = new Int32Array(size);
    _pickArr = new Int16Array(size);
  }
  return { dp: _dpArr, prev: _prevArr, pick: _pickArr };
}

function greedyDrop(avail, tc) {
  const order = [...BILL_DENOMS];
  let rem = tc;
  const out = [];
  for (const d of order) {
    const dc = toCents(d);
    const take = Math.min(avail[d] || 0, Math.floor(rem / dc));
    if (take > 0) {
      out.push({ label: `$${d}`, count: take, value: take * d, denom: d });
      rem -= take * dc;
    }
  }
  return out.sort((a, b) => b.denom - a.denom);
}

export function computeDrop(cash, bm, da, _target) {
  if (da <= 0) return [];

  const tc = toCents(da);
  const avail = {};
  for (const d of BILL_DENOMS) {
    avail[d] = rowCount(cash[String(d)], d, bm);
  }

  if (tc > DP_MAX_CENTS) return greedyDrop(avail, tc);

  const INF = 2e9;
  const { dp, prev, pick } = _getDPBuffers(tc + 1);
  dp.fill(INF, 0, tc + 1);
  prev.fill(-1, 0, tc + 1);
  pick.fill(-1, 0, tc + 1);
  dp[0] = 0;

  for (const d of BILL_DENOMS) {
    const dc = toCents(d);
    const cnt = avail[d];
    if (!cnt || !dc) continue;
    const c = BILL_COST_WEIGHT + RANK[d];
    for (let k = 0; k < cnt; k++) {
      for (let a = tc; a >= dc; a--) {
        const prevA = a - dc;
        if (dp[prevA] >= INF) continue;
        const nextCost = dp[prevA] + c;
        if (nextCost < dp[a]) {
          dp[a] = nextCost;
          prev[a] = prevA;
          pick[a] = d;
        }
      }
    }
  }

  let best = 0;
  for (let a = tc; a >= 0; a--) {
    if (dp[a] < INF) {
      best = a;
      break;
    }
  }
  if (best === 0) return greedyDrop(avail, tc);

  const bills = {};
  let rem = best;
  while (rem > 0) {
    const d = pick[rem];
    const p = prev[rem];
    if (d === -1 || p < 0) break;
    bills[d] = (bills[d] || 0) + 1;
    rem = p;
  }

  return BILL_DENOMS.filter((d) => bills[d] > 0).map((d) => ({
    label: `$${d}`,
    count: bills[d],
    value: bills[d] * d,
    denom: d,
  }));
}

export function rollExtraCount(id, rolls) {
  const size = COIN_ROLLS[id] || 0;
  if (!size) return 0;
  const r = Math.max(0, Math.floor(Number(rolls) || 0));
  return r * size;
}

export function convertCash(cash, from, to, denoms) {
  if (from === to) return cash;
  const next = { ...cash };
  for (const { id, val } of denoms) {
    const raw = Number(cash[id]) || 0;
    if (!raw) continue;
    if (from === 'count') {
      const c = Math.floor(raw) * toCents(val);
      next[id] = c ? fromCents(c).toString() : '';
    } else {
      const c = Math.floor(toCents(raw) / toCents(val));
      next[id] = c ? String(c) : '';
    }
  }
  return next;
}

