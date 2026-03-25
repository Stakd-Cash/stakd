import React, { useMemo, useId, useState, useEffect, useCallback } from 'react';
import { ChartZoomToolbar } from './ChartZoomToolbar.jsx';

/* Align with tokens.css brand coral (--c-brand-500 / --c-brand-400) */
const CHART_LINE = '#DE7356';
const CHART_LINE_SOFT = '#e48d74';
const CHART_BG = '#0E0E0E';

function fmtMoneyHeader(cents) {
  const neg = cents < 0;
  const abs = Math.abs(cents);
  return (neg ? '-$' : '$') + (abs / 100).toFixed(2);
}

function fmtMoneyCompact(cents) {
  const d = Math.abs(cents) / 100;
  if (d >= 10000) return `$${Math.round(d / 1000)}k`;
  if (d >= 1000) return `$${(d / 1000).toFixed(1)}k`;
  return `$${Math.round(d)}`;
}

function niceCeiling(value) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

/**
 * Distinct cents ticks from 0 through `maxValCents` (already the chart scale max).
 * Never extends past that max so grid matches the plotted series. Keys stay unique.
 */
function buildYCentsTickValues(maxValCents, maxTickCount = 5) {
  if (maxValCents <= 0) return [0];
  const top = maxValCents;
  let step = niceCeiling(top / Math.max(1, maxTickCount - 1));
  step = Math.max(1, Math.round(step));

  const collect = () => {
    const out = [0];
    let v = step;
    while (v < top) {
      out.push(Math.round(v));
      v += step;
    }
    if (top > 0) out.push(Math.round(top));
    return [...new Set(out)].sort((a, b) => a - b);
  };

  let levels = collect();
  while (levels.length > maxTickCount + 1) {
    step = Math.max(1, step * 2);
    levels = collect();
  }
  return levels;
}

function enumerateDays(fromIso, toIso) {
  const out = [];
  const cur = new Date(`${fromIso}T12:00:00`);
  const end = new Date(`${toIso}T12:00:00`);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** One point per calendar day in range, zero-filled */
export function buildPaddedDailyEntries(drops, dateFrom, dateTo) {
  const days = enumerateDays(dateFrom, dateTo);
  const map = new Map();
  drops.forEach((d) => {
    const day = d.shift_date;
    map.set(day, (map.get(day) || 0) + d.amount_cents);
  });
  return days.map((day) => [day, { totalCents: map.get(day) || 0 }]);
}

/** 24 hours, zero-filled */
export function buildPaddedHourlyEntries(drops) {
  const hourTotals = Array(24).fill(0);
  drops.forEach((d) => {
    const h = new Date(d.created_at).getHours();
    hourTotals[h] += d.amount_cents;
  });
  return hourTotals.map((totalCents, hour) => [hour, { totalCents }]);
}

/** Mon-first weekday letter (M T W T F S S) — only for ≤7-day ranges */
function weekdayLetter(dateStr) {
  const dow = new Date(`${dateStr}T12:00:00`).getDay();
  const monFirst = dow === 0 ? 6 : dow - 1;
  const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return letters[monFirst];
}

/** Evenly space at most `maxTicks` indices across [0, n-1] */
function computeXTickIndices(n, maxTicks = 8) {
  if (n <= 0) return [];
  if (n === 1) return [0];
  if (n <= maxTicks) return Array.from({ length: n }, (_, i) => i);
  const idx = new Set();
  const m = Math.min(maxTicks, n);
  for (let k = 0; k < m; k++) {
    idx.add(Math.round((k * (n - 1)) / Math.max(1, m - 1)));
  }
  return [...idx].sort((a, b) => a - b);
}

/**
 * Label for a calendar day on the X-axis — avoids jumbling when many days
 * (weekday letters only for short ranges; month names for long ranges).
 */
function formatDateAxisLabel(dateStr, dayCount) {
  const d = new Date(`${dateStr}T12:00:00`);
  if (dayCount <= 7) {
    return weekdayLetter(dateStr);
  }
  if (dayCount <= 31) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  if (dayCount <= 120) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function hourAxisLabel(h) {
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  if (h < 12) return `${h}a`;
  return `${h - 12}p`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function subtractDays(iso, n) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function maxIso(a, b) {
  return a >= b ? a : b;
}

function minIso(a, b) {
  return a <= b ? a : b;
}

/**
 * Natural [from, to] for a chart zoom (not clamped to the page filter).
 * Used to widen Supabase fetch so chart zoom has rows to plot.
 */
export function computeChartQueryRange(chartZoom, dateFrom, dateTo) {
  const todayStr = todayIso();
  const effTo = minIso(dateTo, todayStr);

  if (chartZoom === 'all') {
    return { from: dateFrom, to: effTo };
  }

  let daysBack = 0;
  switch (chartZoom) {
    case 'today':
      daysBack = 0;
      break;
    case 'week':
      daysBack = 6;
      break;
    case 'month':
      daysBack = 29;
      break;
    case '6m':
      daysBack = 179;
      break;
    case '1y':
      daysBack = 364;
      break;
    default:
      daysBack = 0;
  }

  const effFrom = subtractDays(effTo, daysBack);
  return { from: effFrom, to: effTo };
}

/**
 * Query range for drops — wide enough for any chart zoom (up to 1y) without depending on zoom.
 * Chart toggles only re-filter in memory; changing them does not refetch.
 */
export function computeFetchDropsRange(dateFrom, dateTo) {
  const todayStr = todayIso();
  const effTo = minIso(dateTo, todayStr);
  const widestFrom = subtractDays(effTo, 364);
  return {
    fetchFrom: minIso(dateFrom, widestFrom),
    fetchTo: maxIso(dateTo, effTo),
  };
}

/**
 * Chart view: zoom using loaded `drops` (already fetched for fetchFrom…fetchTo).
 * Zoom windows are not clamped to the page filter — only to today on the end date.
 */
export function computeChartWindow(chartZoom, dateFrom, dateTo, drops) {
  const todayStr = todayIso();
  const parentEnd = minIso(dateTo, todayStr);

  if (chartZoom === 'all') {
    const dropsFiltered = drops.filter(
      (d) => d.shift_date >= dateFrom && d.shift_date <= dateTo,
    );
    return {
      effFrom: dateFrom,
      effTo: dateTo,
      dropsFiltered,
      chartIsMultiDay: dateFrom !== dateTo,
    };
  }

  const effTo = minIso(parentEnd, dateTo);
  let daysBack = 0;
  switch (chartZoom) {
    case 'today':
      daysBack = 0;
      break;
    case 'week':
      daysBack = 6;
      break;
    case 'month':
      daysBack = 29;
      break;
    case '6m':
      daysBack = 179;
      break;
    case '1y':
      daysBack = 364;
      break;
    default:
      daysBack = 0;
  }

  let effFrom = subtractDays(effTo, daysBack);
  const effToFinal = minIso(effTo, dateTo);
  if (effFrom > effToFinal) {
    effFrom = effToFinal;
  }

  const dropsFiltered = drops.filter(
    (d) => d.shift_date >= effFrom && d.shift_date <= effToFinal,
  );

  return {
    effFrom,
    effTo: effToFinal,
    dropsFiltered,
    chartIsMultiDay: effFrom !== effToFinal,
  };
}

/** Smooth Catmull-Rom style curve through points */
function catmullRomPath(points) {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const [x, y] = points[0];
    return `M${x - 0.5},${y} L${x + 0.5},${y}`;
  }
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export { CHART_ZOOM } from './chartConstants.js';

/**
 * Earnings line chart: page filters supply data; chart pills zoom within that range only.
 * Pass `chartZoom` + `onChartZoomChange` from the parent to sync with other charts (e.g. bar).
 */
export function EarningsLineChartDesign({
  drops,
  dateFrom,
  dateTo,
  rangePreset,
  chartZoom: chartZoomProp,
  onChartZoomChange,
}) {
  const uid = useId();
  const fillGradId = `ap-earnings-fill-${uid}`;
  const lineGradId = `ap-earnings-line-${uid}`;

  const [chartZoomState, setChartZoomState] = useState('all');
  const isControlled = chartZoomProp !== undefined;
  const chartZoom = isControlled ? chartZoomProp : chartZoomState;
  const setChartZoom = useCallback(
    (next) => {
      if (isControlled) onChartZoomChange?.(next);
      else setChartZoomState(next);
    },
    [isControlled, onChartZoomChange],
  );

  useEffect(() => {
    if (!isControlled) setChartZoomState('all');
  }, [dateFrom, dateTo, rangePreset, isControlled]);

  const { effFrom, effTo, dropsFiltered, chartIsMultiDay } = useMemo(
    () => computeChartWindow(chartZoom, dateFrom, dateTo, drops),
    [chartZoom, dateFrom, dateTo, drops],
  );

  const entries = useMemo(() => {
    if (!chartIsMultiDay) {
      return buildPaddedHourlyEntries(dropsFiltered);
    }
    return buildPaddedDailyEntries(dropsFiltered, effFrom, effTo);
  }, [chartIsMultiDay, dropsFiltered, effFrom, effTo]);

  const totalCents = useMemo(
    () => dropsFiltered.reduce((s, d) => s + d.amount_cents, 0),
    [dropsFiltered],
  );

  const svgBody = useMemo(() => {
    if (entries.length === 0) {
      return (
        <div className="ap-earnings-chart-empty">No data in this range</div>
      );
    }

    const values = entries.map(([, v]) => v.totalCents);
    const rawMax = Math.max(...values, 1);
    const maxVal = niceCeiling(rawMax);
    const minVal = 0;
    const W = 400;
    const H = 232;
    const padLeft = 44;
    const padRight = 14;
    const padTop = 20;
    const padBot = 36;
    const usableW = W - padLeft - padRight;
    const usableH = H - padTop - padBot;
    const range = maxVal - minVal || 1;
    const n = entries.length;
    const dayCount = chartIsMultiDay ? n : 1;
    const xTickSet = new Set(computeXTickIndices(n, 8));

    const pts = entries.map(([, v], i) => {
      const val = v.totalCents;
      const x = padLeft + (n === 1 ? usableW / 2 : (i / (n - 1)) * usableW);
      const y = padTop + (1 - (val - minVal) / range) * usableH;
      return [x, y];
    });

    const linePath = catmullRomPath(pts);
    const last = pts[pts.length - 1];
    const first = pts[0];
    const fillPath = `${linePath} L${last[0]},${H - padBot} L${first[0]},${H - padBot} Z`;

    const tickValues = buildYCentsTickValues(maxVal, 5);
    const maxTick = tickValues[tickValues.length - 1] || 1;
    const yTicks = tickValues.map((value) => ({
      value,
      y: padTop + (1 - value / maxTick) * usableH,
    }));

    return (
      <svg
        className="ap-earnings-chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <linearGradient id={fillGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_LINE} stopOpacity="0.38" />
            <stop offset="55%" stopColor={CHART_LINE} stopOpacity="0.08" />
            <stop offset="100%" stopColor={CHART_BG} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={lineGradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={CHART_LINE_SOFT} />
            <stop offset="100%" stopColor={CHART_LINE} />
          </linearGradient>
        </defs>

        {/* Vertical grid — align with x-axis ticks only when many days (reduces noise) */}
        {pts.map(([x], i) => {
          if (chartIsMultiDay) {
            if (n > 14 && !xTickSet.has(i)) return null;
          } else if (i % 4 !== 0 && i !== pts.length - 1) {
            return null;
          }
          return (
            <line
              key={`vx-${i}`}
              x1={x}
              y1={padTop}
              x2={x}
              y2={H - padBot}
              className="ap-earnings-chart-grid-v"
            />
          );
        })}

        {/* Horizontal grid */}
        {yTicks.map((tick, idx) => (
          <line
            key={`h-${idx}`}
            x1={padLeft}
            y1={tick.y}
            x2={W - padRight}
            y2={tick.y}
            className="ap-earnings-chart-grid-h"
          />
        ))}

        <path d={fillPath} fill={`url(#${fillGradId})`} stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke={`url(#${lineGradId})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Y-axis labels — keys by index so duplicate formatted values never confuse React */}
        {yTicks.map((tick, idx) => (
          <text
            key={`yl-${idx}`}
            x={padLeft - 6}
            y={tick.y}
            textAnchor="end"
            dominantBaseline="middle"
            className="ap-earnings-chart-axis-y"
          >
            {fmtMoneyCompact(tick.value)}
          </text>
        ))}

        {/* X-axis labels — thinned; format depends on span (weekday vs M/D vs month) */}
        {entries.map(([key], i) => {
          if (!xTickSet.has(i)) return null;
          const x = padLeft + (n === 1 ? usableW / 2 : (i / (n - 1)) * usableW);
          let label;
          if (!chartIsMultiDay) {
            const h = key;
            label = hourAxisLabel(h);
          } else {
            label = formatDateAxisLabel(key, dayCount);
          }
          return (
            <text
              key={`x-${key}-${i}`}
              x={x}
              y={H - 10}
              textAnchor="middle"
              className="ap-earnings-chart-axis-x"
            >
              {label}
            </text>
          );
        })}
      </svg>
    );
  }, [entries, chartIsMultiDay, fillGradId, lineGradId]);

  return (
    <div className="ap-earnings-chart">
      <div className="ap-earnings-chart-head">
        <div className="ap-earnings-chart-total">
          <span className="ap-earnings-chart-total-label">Total dropped:</span>
          <span className="ap-earnings-chart-total-value">
            {fmtMoneyHeader(totalCents)}
          </span>
        </div>
        <ChartZoomToolbar
          value={chartZoom}
          onChange={setChartZoom}
          title="Zoom the chart inside the date range from the filters above. Does not change table or filters."
        />
      </div>
      <div className="ap-earnings-chart-divider" />
      <div className="ap-earnings-chart-body">{svgBody}</div>
    </div>
  );
}
