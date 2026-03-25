import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';
import { CustomSelect, CustomDatePicker } from './UIComponents.jsx';
import { OnboardingEmptyState } from './OnboardingEmptyState.jsx';
import {
  EarningsLineChartDesign,
  computeChartWindow,
  computeFetchDropsRange,
} from './EarningsLineChartDesign.jsx';
import { ChartZoomToolbar } from './ChartZoomToolbar.jsx';
import { lsGet, lsSet } from '../../utils/storage.js';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function fmtMoney(cents) {
  const neg = cents < 0;
  const abs = Math.abs(cents);
  return (neg ? '-$' : '$') + (abs / 100).toFixed(2);
}

function fmtVariance(cents) {
  if (cents === 0) return 'Even';
  const neg = cents < 0;
  const abs = Math.abs(cents);
  return (neg ? '-$' : '+$') + (abs / 100).toFixed(2);
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

// --- Animated count-up hook (uses ref to avoid stale closure) ---
function useCountUp(target, duration = 600) {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const fromRef = useRef(0);
  const displayRef = useRef(display);

  useEffect(() => {
    fromRef.current = displayRef.current;
    startRef.current = null;
    cancelAnimationFrame(rafRef.current);

    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(fromRef.current + (target - fromRef.current) * eased);
      displayRef.current = val;
      setDisplay(val);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

// --- CSV Export (RFC 4180 compliant — properly escapes commas, quotes, newlines) ---
function csvCell(val) {
  const s = String(val);
  if (/[,"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function exportCSV(drops, isAdmin, label) {
  const headers = isAdmin
    ? ['Staff', 'Amount', 'Target', 'Variance', 'Note', 'Date', 'Time']
    : ['Amount', 'Target', 'Variance', 'Note', 'Date', 'Time'];
  const rows = drops.map((d) => {
    const time = new Date(d.created_at).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit',
    });
    const variance = d.amount_cents - d.target_cents;
    const row = [
      fmtMoney(d.amount_cents),
      fmtMoney(d.target_cents),
      fmtVariance(variance),
      d.note || '',
      d.shift_date,
      time,
    ];
    if (isAdmin) row.unshift(d.staff?.name || '—');
    return row;
  });
  const csv = [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `drops-${label}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Date range presets ---
const RANGE_PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: '6m', label: '6 mo' },
  { key: '1y', label: '1 yr' },
  { key: 'custom', label: 'Custom' },
];

function startOfWeek() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? 6 : day - 1; // Monday-based
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function getPresetDates(preset) {
  const t = today();
  switch (preset) {
    case 'today': return { from: t, to: t };
    case 'week': return { from: startOfWeek(), to: t };
    case 'month': return { from: daysAgo(29), to: t };
    case '6m': return { from: daysAgo(180), to: t };
    case '1y': return { from: daysAgo(365), to: t };
    default: return { from: t, to: t };
  }
}

function staffInitials(name) {
  const p = String(name).trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
  return String(name).slice(0, 2).toUpperCase() || '?';
}

function hueFromString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h + s.charCodeAt(i) * 17) % 360;
  return h;
}

const BAR_METRICS = [
  { key: 'earnings', label: 'Earnings' },
  { key: 'count', label: 'Drops' },
  { key: 'avg', label: 'Avg' },
];

/** Top crew horizontal bars — matches reference layout (tabs + shared zoom + in-bar label). */
function DropsByUserChart({
  rows,
  chartZoom,
  onChartZoomChange,
  barMetric,
  onBarMetricChange,
}) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.totalCents - a.totalCents).slice(0, 8),
    [rows],
  );

  const { values, formatVal, rawMax } = useMemo(() => {
    const vals = sorted.map((r) => {
      const n = r.drops.length;
      if (barMetric === 'count') return n;
      if (barMetric === 'avg') return n > 0 ? Math.round(r.totalCents / n) : 0;
      return r.totalCents;
    });
    const mx = Math.max(...vals, 1);
    const fmt = (v) => {
      if (barMetric === 'count') return String(v);
      return fmtMoney(v);
    };
    return { values: vals, formatVal: fmt, rawMax: niceCeiling(mx) };
  }, [sorted, barMetric]);

  const maxVal = rawMax;

  return (
    <div className="ap-bars-card">
      <div className="ap-bars-head">
        <div className="ap-bars-tabs" role="tablist" aria-label="Bar breakdown">
          {BAR_METRICS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={barMetric === key}
              className={`ap-bars-tab${barMetric === key ? ' active' : ''}`}
              onClick={() => onBarMetricChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <ChartZoomToolbar
          value={chartZoom}
          onChange={onChartZoomChange}
          ariaLabel="Bar chart zoom within loaded range"
        />
      </div>
      <div className="ap-bars-divider" />
      <div className="ap-emp-bars">
        {sorted.length === 0 ? (
          <div className="ap-bars-empty">No crew data in this range</div>
        ) : (
          sorted.map((r, i) => {
            const v = values[i];
            const pct = maxVal > 0 ? (v / maxVal) * 100 : 0;
            const h = hueFromString(r.name);
            const depth = sorted.length > 1 ? i / (sorted.length - 1) : 0;
            const avatarSat = Math.max(12, Math.round(42 - depth * 24));
            const avatarSat2 = Math.max(10, Math.round(38 - depth * 20));
            return (
              <div key={r.name} className="ap-hbar-row">
                <div
                  className="ap-hbar-avatar"
                  style={{
                    background: `linear-gradient(145deg, hsl(${h} ${avatarSat}% 42%), hsl(${h} ${avatarSat2}% 28%))`,
                  }}
                  aria-hidden
                >
                  {staffInitials(r.name)}
                </div>
                <div className="ap-hbar-track">
                  <div
                    className="ap-hbar-fill"
                    style={{ width: `${pct}%`, '--ap-hbar-depth': depth }}
                  />
                  <span className="ap-hbar-inlabel" title={r.name}>
                    {r.name}
                  </span>
                </div>
                <div className="ap-hbar-val">{formatVal(v)}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function DropsPanel({ company, currentStaff, isAdmin, onAddCashier, navigate }) {
  const [drops, setDrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [onboardingError, setOnboardingError] = useState(null);
  const [onboardingStatus, setOnboardingStatus] = useState({
    hasStaff: false,
    hasDrops: false,
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [tutorialSkipped, setTutorialSkipped] = useState(false);
  const [rangePreset, setRangePreset] = useState('today');
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [refreshKey, setRefreshKey] = useState(0);
  const [staffFilter, setStaffFilter] = useState('all');
  const [view, setView] = useState('table'); // 'table' | 'by-employee'
  const [showGraph, setShowGraph] = useState(true);
  /** Independent zoom for line vs bar charts; in-memory only (fetch is not tied to these). */
  const [lineChartZoom, setLineChartZoom] = useState('all');
  const [barChartZoom, setBarChartZoom] = useState('all');
  const [barMetric, setBarMetric] = useState('earnings');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [expandedDrop, setExpandedDrop] = useState(null);
  const PAGE_SIZE = 100;
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState('');
  const realtimeDebounceRef = useRef(null);
  const presetDebounceRef = useRef(null);
  const exitTimerRef = useRef(null);
  const prevHasDropsRef = useRef(null);

  const companyId = company?.id;
  const staffId = currentStaff?.id;
  const isMultiDay = dateFrom !== dateTo;
  const onboardingSkipKey = companyId ? `stakd_onboarding_skip:${companyId}` : null;

  // Auto-swap if dateFrom > dateTo
  useEffect(() => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setDateFrom(dateTo);
      setDateTo(dateFrom);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    setLineChartZoom('all');
    setBarChartZoom('all');
  }, [dateFrom, dateTo, rangePreset]);

  /** Wide enough for any chart zoom up to 1y; independent of line/bar toggles (no refetch on zoom). */
  const { fetchFrom, fetchTo } = useMemo(
    () => computeFetchDropsRange(dateFrom, dateTo),
    [dateFrom, dateTo],
  );

  /** Drops limited to the page filter — stats, table, CSV, etc. */
  const pageDrops = useMemo(
    () =>
      drops.filter((d) => d.shift_date >= dateFrom && d.shift_date <= dateTo),
    [drops, dateFrom, dateTo],
  );

  // Apply range preset (debounced to prevent lag on rapid clicks)
  const handlePreset = useCallback((preset) => {
    setRangePreset(preset);
    setDisplayLimit(PAGE_SIZE);
    
    if (preset !== 'custom') {
      clearTimeout(presetDebounceRef.current);
      presetDebounceRef.current = setTimeout(() => {
        const { from, to } = getPresetDates(preset);
        setDateFrom(from);
        setDateTo(to);
      }, 150);
    }
  }, []);

  useEffect(() => {
    if (!onboardingSkipKey) {
      setTutorialSkipped(false);
      return;
    }

    setTutorialSkipped(lsGet(onboardingSkipKey, false));
  }, [onboardingSkipKey]);

  // Load first-run onboarding status separately from the date-filtered table query.
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    (async () => {
      setOnboardingLoading(true);
      setOnboardingError(null);

      const [staffResult, dropResult] = await Promise.all([
        supabase
          .from('staff')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .neq('role', 'owner'),
        supabase
          .from('drops')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
      ]);

      if (cancelled) return;

      if (staffResult.error || dropResult.error) {
        setOnboardingError(staffResult.error?.message || dropResult.error?.message || 'Failed to load onboarding status.');
        setOnboardingStatus({ hasStaff: false, hasDrops: false });
      } else {
        setOnboardingStatus({
          hasStaff: (staffResult.count ?? 0) > 0,
          hasDrops: (dropResult.count ?? 0) > 0,
        });
      }

      setOnboardingLoading(false);
    })();

    return () => { cancelled = true; };
  }, [companyId]);

  useEffect(() => {
    if (onboardingLoading) return;

    const prevHasDrops = prevHasDropsRef.current;

    if (tutorialSkipped) {
      clearTimeout(exitTimerRef.current);
      setShowOnboarding(false);
    } else if (!onboardingStatus.hasDrops) {
      clearTimeout(exitTimerRef.current);
      setShowOnboarding(true);
    } else if (prevHasDrops === false) {
      clearTimeout(exitTimerRef.current);
      setShowOnboarding(true);
      exitTimerRef.current = setTimeout(() => {
        setShowOnboarding(false);
      }, 980);
    } else {
      setShowOnboarding(false);
    }

    prevHasDropsRef.current = onboardingStatus.hasDrops;
  }, [onboardingLoading, onboardingStatus.hasDrops, tutorialSkipped]);

  useEffect(() => {
    return () => clearTimeout(exitTimerRef.current);
  }, []);

  useEffect(() => {
    prevHasDropsRef.current = null;
    clearTimeout(exitTimerRef.current);
  }, [companyId]);

  const handleSkipTutorial = useCallback(() => {
    setTutorialSkipped(true);
    clearTimeout(exitTimerRef.current);
    setShowOnboarding(false);
    if (onboardingSkipKey) lsSet(onboardingSkipKey, true);
  }, [onboardingSkipKey]);

  // Fetch drops
  useEffect(() => {
    if (!companyId) return;
    if (!isAdmin && !staffId) return;
    let cancelled = false;

    (async () => {
      const isInitialLoad = drops.length === 0;
      if (isInitialLoad) setLoading(true);
      else setIsRefreshing(true);
      setLoadError(null);

      let query = supabase
        .from('drops')
        .select('*, staff(name)')
        .eq('company_id', companyId)
        .gte('shift_date', fetchFrom)
        .lte('shift_date', fetchTo)
        .order('created_at', { ascending: false });

      if (!isAdmin && staffId) {
        query = query.eq('staff_id', staffId);
      }

      const { data, error } = await query;
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        if (drops.length === 0) setDrops([]);
      } else {
        setDrops(data || []);
      }
      setLoading(false);
      setIsRefreshing(false);
    })();

    return () => { cancelled = true; };
  }, [companyId, staffId, isAdmin, fetchFrom, fetchTo, refreshKey]);

  // Realtime subscription (debounced to avoid rapid re-fetches)
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel(`drops-${companyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'drops',
        filter: `company_id=eq.${companyId}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setDrops((prev) => prev.filter((d) => d.id !== payload.old.id));
        }

        clearTimeout(realtimeDebounceRef.current);
        realtimeDebounceRef.current = setTimeout(() => {
          setRefreshKey((k) => k + 1);
        }, payload.eventType === 'DELETE' ? 180 : 420);
      })
      .subscribe();

    return () => {
      clearTimeout(realtimeDebounceRef.current);
      clearTimeout(presetDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [companyId, fetchFrom, fetchTo]);

  // Delete drop
  const handleDeleteDrop = useCallback(async (dropId) => {
    setDeletingId(dropId);
    setDeleteError(null);
    const { error } = await supabase.from('drops').delete().eq('id', dropId);
    if (error) {
      setDeleteError(error.message);
    } else {
      setDrops((prev) => prev.filter((d) => d.id !== dropId));
      setExpandedDrop(null);
    }
    setDeletingId(null);
  }, []);

  const totalCents = pageDrops.reduce((sum, d) => sum + d.amount_cents, 0);
  const totalTargetCents = pageDrops.reduce((sum, d) => sum + d.target_cents, 0);
  const netVarianceCents = totalCents - totalTargetCents;
  const avgCents = pageDrops.length > 0 ? Math.round(totalCents / pageDrops.length) : 0;
  const staffActiveCount = new Set(pageDrops.map((d) => d.staff_id)).size;

  // Animated values
  const animDrops = useCountUp(pageDrops.length);
  const animTotal = useCountUp(totalCents);
  const animAvg = useCountUp(avgCents);
  const animStaff = useCountUp(staffActiveCount);
  const animVariance = useCountUp(netVarianceCents);

  // Unique staff names for filter dropdown
  const staffNames = useMemo(() => {
    const map = new Map();
    pageDrops.forEach((d) => {
      if (d.staff_id && d.staff?.name) map.set(d.staff_id, d.staff.name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [pageDrops]);

  // Filtered drops
  const filtered = useMemo(() => {
    if (staffFilter === 'all') return pageDrops;
    return pageDrops.filter((d) => d.staff_id === staffFilter);
  }, [pageDrops, staffFilter]);

  const filteredSearch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((d) => {
      const staffName = (d.staff?.name || '').toLowerCase();
      const note = (d.note || '').toLowerCase();
      const amt = String(Math.round(d.amount_cents / 100));
      const tgt = String(Math.round(d.target_cents / 100));
      return staffName.includes(q) || note.includes(q) || amt.includes(q) || tgt.includes(q);
    });
  }, [filtered, searchQuery]);

  // Employee breakdown (page range — not chart zoom)
  const byEmployee = useMemo(() => {
    const map = new Map();
    pageDrops.forEach((d) => {
      const key = d.staff_id || 'unknown';
      const name = d.staff?.name || 'Unknown';
      if (!map.has(key)) map.set(key, { name, drops: [], totalCents: 0, totalTargetCents: 0 });
      const entry = map.get(key);
      entry.drops.push(d);
      entry.totalCents += d.amount_cents;
      entry.totalTargetCents += d.target_cents;
    });
    return Array.from(map.values()).sort((a, b) => b.totalCents - a.totalCents);
  }, [pageDrops]);

  /** Aggregates for bar chart — bar chart zoom (independent of line chart). */
  const byEmployeeChart = useMemo(() => {
    const { dropsFiltered } = computeChartWindow(barChartZoom, dateFrom, dateTo, drops);
    const map = new Map();
    dropsFiltered.forEach((d) => {
      const key = d.staff_id || 'unknown';
      const name = d.staff?.name || 'Unknown';
      if (!map.has(key)) map.set(key, { name, drops: [], totalCents: 0, totalTargetCents: 0 });
      const entry = map.get(key);
      entry.drops.push(d);
      entry.totalCents += d.amount_cents;
      entry.totalTargetCents += d.target_cents;
    });
    return Array.from(map.values()).sort((a, b) => b.totalCents - a.totalCents);
  }, [barChartZoom, dateFrom, dateTo, drops]);

  const filteredTotal = filteredSearch.reduce((sum, d) => sum + d.amount_cents, 0);

  const renderDropsLoadingSkeleton = () => (
    <div className="admin-panel ap-drops ap-drops-skeleton">
      <div className="ap-sk-panel-head">
        <div className="adm-sk ap-sk-panel-title" />
        <div className="adm-sk ap-sk-round-btn" />
      </div>
      <div className="ap-sk-presets">
        {RANGE_PRESETS.map((p) => (
          <div key={p.key} className="adm-sk ap-sk-preset-pill" />
        ))}
      </div>
      <div className="ap-sk-filter-row">
        <div className="adm-sk ap-sk-date-field" />
        <span className="ap-sk-filter-sep">to</span>
        <div className="adm-sk ap-sk-date-field" />
      </div>
      <div className="admin-stat-row">
        {[0, 1, 2, 3, ...(isAdmin ? [4] : [])].map((i) => (
          <div key={i} className="adm-sk adm-sk-stat" />
        ))}
      </div>
      <div className="ap-sk-at-a-glance">
        <div className="adm-sk ap-sk-section-title" />
        <div className="ap-charts-row">
          <div className="ap-sk-chart-card">
            <div className="ap-sk-chart-toolbar">
              <div className="adm-sk ap-sk-chart-total" />
              <div className="adm-sk ap-sk-chart-zoom" />
            </div>
            <div className="adm-sk ap-sk-chart-plot" />
          </div>
          {isAdmin && (
            <div className="ap-sk-chart-card ap-sk-chart-card--bars">
              <div className="ap-sk-chart-toolbar">
                <div className="adm-sk ap-sk-bar-tabs" />
                <div className="adm-sk ap-sk-chart-zoom" />
              </div>
              <div className="ap-sk-bar-rows">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="ap-sk-bar-row">
                    <div className="adm-sk ap-sk-bar-avatar" />
                    <div className="adm-sk ap-sk-bar-track" />
                    <div className="adm-sk ap-sk-bar-val" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="ap-sk-drops-toolbar">
        <div className="adm-sk ap-sk-toggle-pair" />
        <div className="adm-sk ap-sk-search" />
      </div>
      <div className="ap-sk-table">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="adm-sk ap-sk-table-row" />
        ))}
      </div>
    </div>
  );

  const csvLabel = dateFrom === dateTo ? dateFrom : `${dateFrom}_to_${dateTo}`;
  const panelError = loadError || onboardingError;

  if (loading || onboardingLoading) {
    return renderDropsLoadingSkeleton();
  }

  if (panelError) {
    return (
      <div className="admin-panel ap-drops">
        <div className="admin-empty-state">
          <i className="fa-solid fa-triangle-exclamation" />
          <p>{panelError}</p>
          <button className="admin-btn-sm" onClick={() => setRefreshKey((k) => k + 1)}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (tutorialSkipped && !onboardingStatus.hasDrops) {
    return (
      <div className="admin-panel ap-drops">
        <div className="admin-empty-state">
          <i className={`fa-solid ${onboardingStatus.hasStaff ? 'fa-inbox' : 'fa-user-plus'}`} />
          <p>
            {onboardingStatus.hasStaff
              ? 'Tutorial skipped. The first completed count will show up here.'
              : "Tutorial skipped. Add a cashier from Staff whenever you're ready."}
          </p>
          {!onboardingStatus.hasStaff && (
            <button className="admin-btn-sm" onClick={onAddCashier}>
              Go to Staff
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {showOnboarding ? (
        <OnboardingEmptyState
          company={company}
          navigate={navigate}
          onSkipTutorial={handleSkipTutorial}
          onStaffAdded={() => {
            setOnboardingStatus((prev) => ({ ...prev, hasStaff: true }));
            setRefreshKey((k) => k + 1);
          }}
        />
      ) : null}
      <div
        className="admin-panel ap-drops"
        aria-hidden={showOnboarding ? 'true' : undefined}
      >
      <div className={`admin-panel-header${isRefreshing ? ' ap-panel-refreshing' : ''}`}>
        <h2>{isAdmin ? 'All Drops' : 'My Drops'}</h2>
        <div className="admin-panel-actions">
          <button
            className="admin-btn-sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            data-tooltip="Refresh"
            data-tooltip-pos="left"
          >
            <i className={`fa-solid fa-arrows-rotate${isRefreshing ? ' fa-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Range preset buttons */}
      <div className="admin-range-presets">
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.key}
            className={`admin-filter-btn${rangePreset === p.key ? ' active' : ''}`}
            onClick={() => handlePreset(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Filter bar: date(s) + staff in one row */}
      <div className="admin-filter-bar">
        <CustomDatePicker
          value={dateFrom}
          onChange={(val) => { setDateFrom(val); setRangePreset('custom'); }}
        />
        {rangePreset !== 'today' && (
          <>
            <span className="admin-date-sep">to</span>
            <CustomDatePicker
              value={dateTo}
              onChange={(val) => { setDateTo(val); setRangePreset('custom'); }}
            />
          </>
        )}
        {isAdmin && staffNames.length > 1 && (
          <CustomSelect
            value={staffFilter}
            onChange={(val) => setStaffFilter(val)}
            options={[
              { value: 'all', label: 'All Staff' },
              ...staffNames.map(([id, name]) => ({ value: id, label: name }))
            ]}
          />
        )}
        {!loading && pageDrops.length > 0 && (
          <button
            className="admin-export-btn"
            onClick={() => exportCSV(filtered, isAdmin, csvLabel)}
            data-tooltip="Export to CSV"
            data-tooltip-pos="left"
          >
            <i className="fa-solid fa-download" /> CSV
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="admin-stat-row">
          <div className="admin-stat">
            <span className="admin-stat-value">{animDrops}</span>
            <span className="admin-stat-label">Drops</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value">{fmtMoney(animTotal)}</span>
            <span className="admin-stat-label">Total Dropped</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value">{fmtMoney(animAvg)}</span>
            <span className="admin-stat-label">Avg Drop</span>
          </div>
          <div className={`admin-stat${netVarianceCents < 0 ? ' stat-short' : netVarianceCents > 0 ? ' stat-over' : ''}`}>
            <span className="admin-stat-value">{fmtVariance(animVariance)}</span>
            <span className="admin-stat-label">Net Variance</span>
          </div>
          {isAdmin && (
            <div className="admin-stat">
              <span className="admin-stat-value">{animStaff}</span>
              <span className="admin-stat-label">Staff Active</span>
            </div>
          )}
        </div>

      {/* At a glance — earnings over time + top per user (any date preset; empty data still shows frames) */}
      {showGraph && (
        <section className="ap-at-a-glance" aria-labelledby="ap-at-a-glance-heading">
          <h3 id="ap-at-a-glance-heading" className="ap-at-a-glance-heading">
            At a glance
          </h3>
          <div className={`ap-charts-row${isAdmin ? '' : ' ap-charts-row--single'}`}>
            <div className="ap-chart-card ap-chart-card--earnings-design">
              <EarningsLineChartDesign
                drops={drops}
                dateFrom={dateFrom}
                dateTo={dateTo}
                rangePreset={rangePreset}
                chartZoom={lineChartZoom}
                onChartZoomChange={setLineChartZoom}
              />
            </div>
            {isAdmin && (
              <div className="ap-chart-card ap-chart-card--bars-design">
                <DropsByUserChart
                  rows={byEmployeeChart}
                  chartZoom={barChartZoom}
                  onChartZoomChange={setBarChartZoom}
                  barMetric={barMetric}
                  onBarMetricChange={setBarMetric}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Toolbar: view, charts toggle, search */}
      {pageDrops.length > 0 && !loading && (
        <div className="ap-drops-toolbar">
          {isAdmin && (
            <div className="admin-view-toggle">
              <button
                type="button"
                className={`admin-btn-sm${view === 'table' ? ' active' : ''}`}
                onClick={() => setView('table')}
              >
                <i className="fa-solid fa-list" /> List
              </button>
              <button
                type="button"
                className={`admin-btn-sm${view === 'by-employee' ? ' active' : ''}`}
                onClick={() => setView('by-employee')}
              >
                <i className="fa-solid fa-users" /> By Employee
              </button>
            </div>
          )}
          <div className="ap-drops-toolbar-right">
            <button
              type="button"
              className="admin-btn-sm"
              onClick={() => setShowGraph(!showGraph)}
              title={showGraph ? 'Hide charts' : 'Show charts'}
            >
              <i className="fa-solid fa-chart-line" />
            </button>
            <label className="ap-search">
              <i className="fa-solid fa-magnifying-glass" style={{ opacity: 0.45 }} aria-hidden />
              <input
                type="search"
                placeholder="Search staff, notes, amounts…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
            </label>
          </div>
        </div>
      )}

      {pageDrops.length === 0 ? (
        <div className="admin-empty-state">
          <i className="fa-solid fa-inbox" />
          <p>No drops for {isMultiDay ? 'this period' : 'this date'}.</p>
        </div>
      ) : view === 'by-employee' && isAdmin ? (
        <div className="admin-employee-breakdown">
          {byEmployee.map((emp) => {
            const empVariance = emp.totalCents - emp.totalTargetCents;
            return (
              <div key={emp.name} className="admin-emp-card">
                <div className="admin-emp-header">
                  <span className="admin-emp-name">{emp.name}</span>
                  <span className="admin-emp-total">{fmtMoney(emp.totalCents)}</span>
                </div>
                <div className="admin-emp-meta">
                  {emp.drops.length} drop{emp.drops.length !== 1 ? 's' : ''} &middot;
                  avg {fmtMoney(Math.round(emp.totalCents / emp.drops.length))} &middot;
                  <span className={empVariance < 0 ? 'variance-short' : empVariance > 0 ? 'variance-over' : ''}>
                    {' '}{fmtVariance(empVariance)}
                  </span>
                </div>
                <div className="admin-emp-drops">
                  {emp.drops.map((d) => {
                    const v = d.amount_cents - d.target_cents;
                    return (
                      <div key={d.id} className="admin-emp-drop-row">
                        <span className="admin-amount">{fmtMoney(d.amount_cents)}</span>
                        <span className={`admin-variance${v < 0 ? ' short' : v > 0 ? ' over' : ''}`}>
                          {fmtVariance(v)}
                        </span>
                        <span className="admin-time">
                          {isMultiDay && <>{d.shift_date.slice(5).replace('-', '/')} </>}
                          {new Date(d.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {(staffFilter !== 'all' || searchQuery.trim()) && (
            <div className="admin-filter-summary">
              Showing {filteredSearch.length} drop{filteredSearch.length !== 1 ? 's' : ''} &middot;
              {fmtMoney(filteredTotal)} total
            </div>
          )}
          {deleteError && (
            <div className="admin-error admin-error--mb">
              Failed to delete: {deleteError}
              <button className="admin-btn-sm admin-error-dismiss" type="button" onClick={() => setDeleteError(null)}>Dismiss</button>
            </div>
          )}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  {isAdmin && <th>Staff</th>}
                  <th>Amount</th>
                  <th>Target</th>
                  <th>+/−</th>
                  {isMultiDay && <th>Date</th>}
                  <th>Time</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filteredSearch.slice(0, displayLimit).map((drop) => {
                  const v = drop.amount_cents - drop.target_cents;
                  const isExpanded = expandedDrop === drop.id;
                  return (
                    <React.Fragment key={drop.id}>
                      <tr
                        className={drop.note ? 'has-note' : ''}
                        onClick={() => setExpandedDrop(isExpanded ? null : drop.id)}
                      >
                        {isAdmin && <td data-label="Staff">{drop.staff?.name || '—'}</td>}
                        <td data-label="Amount" className="admin-amount">
                          {fmtMoney(drop.amount_cents)}
                        </td>
                        <td data-label="Target">{fmtMoney(drop.target_cents)}</td>
                        <td data-label="Variance" className={`admin-variance${v < 0 ? ' short' : v > 0 ? ' over' : ''}`}>
                          {fmtVariance(v)}
                        </td>
                        {isMultiDay && <td data-label="Date" className="admin-time">{drop.shift_date.slice(5).replace('-', '/')}</td>}
                        <td data-label="Time" className="admin-time">
                          {new Date(drop.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {drop.note && <i className="fa-solid fa-note-sticky admin-drop-note-icon" />}
                        </td>
                        {isAdmin && (
                          <td data-label="Actions" className="admin-actions-cell" onClick={(e) => e.stopPropagation()}>
                            {deletingId === drop.id ? (
                              <div className="admin-delete-confirm">
                                <span>Delete?</span>
                                <button
                                  className="admin-btn-sm admin-btn-danger"
                                  onClick={() => handleDeleteDrop(drop.id)}
                                >
                                  Yes
                                </button>
                                <button
                                  className="admin-btn-sm"
                                  onClick={() => setDeletingId(null)}
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                className="admin-icon-btn admin-delete-btn"
                                onClick={() => setDeletingId(drop.id)}
                                data-tooltip="Delete drop"
                                data-tooltip-pos="left"
                              >
                                <i className="fa-solid fa-trash" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                      {isExpanded && drop.note && (
                        <tr className="admin-note-row">
                          <td colSpan={99}>
                            <div className="admin-note-content">
                              <i className="fa-solid fa-note-sticky" /> {drop.note}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredSearch.length > displayLimit && (
            <button
              type="button"
              className="admin-btn-sm admin-btn-load-more"
              onClick={() => setDisplayLimit((l) => l + PAGE_SIZE)}
            >
              Load more ({filteredSearch.length - displayLimit} remaining)
            </button>
          )}
        </>
      )}
    </div>
    </>
  );
}
