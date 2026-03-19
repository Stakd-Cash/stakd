import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';
import { CustomSelect, CustomDatePicker } from './UIComponents.jsx';

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

// --- Chart building helper ---
let chartSeq = 0;

function buildChartSVG(entries, graphMode, fmtLabel) {
  const idRef = ++chartSeq;
  if (entries.length === 0) return (
    <div className="admin-graph-body">
      <div className="admin-graph-empty">No data to chart</div>
    </div>
  );

  const values = entries.map(([, v]) => graphMode === 'count' ? v.count : v.totalCents);
  const maxVal = Math.max(...values);
  const minVal = 0;

  const W = 300;
  const H = 120;
  const padX = 8;
  const padTop = 8;
  const padBot = 24;
  const usableW = W - padX * 2;
  const usableH = H - padTop - padBot;
  const range = maxVal - minVal || 1;

  const strokeId = `adm-stroke-${idRef}`;
  const fillId = `adm-fill-${idRef}`;
  const glowId = `adm-glow-${idRef}`;

  const pts = entries.map(([, v], i) => {
    const val = graphMode === 'count' ? v.count : v.totalCents;
    const x = padX + (entries.length === 1 ? usableW / 2 : (i / (entries.length - 1)) * usableW);
    const y = padTop + (1 - (val - minVal) / range) * usableH;
    return [x, y];
  });

  const buildPath = (ps) => {
    if (ps.length < 2) return `M${ps[0][0]},${ps[0][1]}`;
    let d = `M${ps[0][0]},${ps[0][1]}`;
    for (let i = 1; i < ps.length; i++) {
      const [x0, y0] = ps[i - 1];
      const [x1, y1] = ps[i];
      const cx = (x0 + x1) / 2;
      d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
    }
    return d;
  };

  const linePath = buildPath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  const fillPath = `${linePath} L${last[0]},${H - padBot} L${first[0]},${H - padBot} Z`;

  // Only show a subset of labels if there are too many entries
  const maxLabels = 12;
  const labelStep = entries.length <= maxLabels ? 1 : Math.ceil(entries.length / maxLabels);

  return (
    <div className="admin-graph-body">
      <svg className="admin-graph-svg" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="var(--brand)" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,92,92,.22)" />
            <stop offset="100%" stopColor="rgba(255,92,92,0)" />
          </linearGradient>
          <radialGradient id={glowId}>
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padTop + frac * usableH;
          return (
            <line
              key={frac}
              x1={padX} y1={y}
              x2={W - padX} y2={y}
              stroke="var(--bd)"
              strokeWidth="0.5"
              strokeDasharray={frac === 1 ? 'none' : '3,3'}
            />
          );
        })}

        <path d={fillPath} fill={`url(#${fillId})`} stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke={`url(#${strokeId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="var(--brand)" stroke="var(--bg1)" strokeWidth="1.5" />
        ))}
        <circle cx={last[0]} cy={last[1]} r="10" fill={`url(#${glowId})`} />

        {entries.map(([key], i) => {
          if (i % labelStep !== 0 && i !== entries.length - 1) return null;
          const x = padX + (entries.length === 1 ? usableW / 2 : (i / (entries.length - 1)) * usableW);
          return (
            <text
              key={key}
              x={x}
              y={H - 4}
              textAnchor="middle"
              fill="var(--t2)"
              fontSize="9"
              fontWeight="600"
            >
              {fmtLabel(key)}
            </text>
          );
        })}

        {pts.map(([x, y], i) => {
          if (entries.length > 10 && i % labelStep !== 0 && i !== entries.length - 1) return null;
          const val = values[i];
          const label = graphMode === 'count' ? val : fmtMoney(val);
          return (
            <text
              key={`v${i}`}
              x={x}
              y={y - 8}
              textAnchor="middle"
              fill="var(--t1)"
              fontSize="7"
              fontWeight="600"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// --- Hourly chart (single-day) ---
function DropsChart({ drops, graphMode }) {
  const entries = useMemo(() => {
    const hourMap = new Map();
    drops.forEach((d) => {
      const h = new Date(d.created_at).getHours();
      if (!hourMap.has(h)) hourMap.set(h, { count: 0, totalCents: 0 });
      const entry = hourMap.get(h);
      entry.count++;
      entry.totalCents += d.amount_cents;
    });
    return Array.from(hourMap.entries()).sort((a, b) => a[0] - b[0]);
  }, [drops]);

  const fmtLabel = (hour) => hour === 0 ? '12a' : hour === 12 ? '12p' : hour > 12 ? (hour - 12) + 'p' : hour + 'a';
  return buildChartSVG(entries, graphMode, fmtLabel);
}

// --- Daily chart (multi-day range) ---
function DailyChart({ drops, graphMode }) {
  const entries = useMemo(() => {
    const dayMap = new Map();
    drops.forEach((d) => {
      const day = d.shift_date;
      if (!dayMap.has(day)) dayMap.set(day, { count: 0, totalCents: 0 });
      const entry = dayMap.get(day);
      entry.count++;
      entry.totalCents += d.amount_cents;
    });
    return Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [drops]);

  const fmtLabel = (dateStr) => {
    const [, m, d] = dateStr.split('-');
    return `${parseInt(m)}/${parseInt(d)}`;
  };
  return buildChartSVG(entries, graphMode, fmtLabel);
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
    default: return { from: t, to: t };
  }
}

export function DropsPanel({ company, staff, isAdmin }) {
  const [drops, setDrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [rangePreset, setRangePreset] = useState('today');
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [refreshKey, setRefreshKey] = useState(0);
  const [staffFilter, setStaffFilter] = useState('all');
  const [view, setView] = useState('table'); // 'table' | 'by-employee'
  const [graphMode, setGraphMode] = useState('total'); // 'total' | 'count'
  const [showGraph, setShowGraph] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [expandedDrop, setExpandedDrop] = useState(null);
  const PAGE_SIZE = 100;
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const realtimeDebounceRef = useRef(null);
  const presetDebounceRef = useRef(null);

  const companyId = company?.id;
  const staffId = staff?.id;
  const isMultiDay = dateFrom !== dateTo;

  // Auto-swap if dateFrom > dateTo
  useEffect(() => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setDateFrom(dateTo);
      setDateTo(dateFrom);
    }
  }, [dateFrom, dateTo]);

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

  // Fetch drops
  useEffect(() => {
    if (!companyId) return;
    if (!isAdmin && !staffId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(null);

      let query = supabase
        .from('drops')
        .select('*, staff(name)')
        .eq('company_id', companyId)
        .gte('shift_date', dateFrom)
        .lte('shift_date', dateTo)
        .order('created_at', { ascending: false });

      if (!isAdmin && staffId) {
        query = query.eq('staff_id', staffId);
      }

      const { data, error } = await query;
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setDrops([]);
      } else {
        setDrops(data || []);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [companyId, staffId, isAdmin, dateFrom, dateTo, refreshKey]);

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
        if (payload.eventType === 'INSERT') {
          const newDrop = payload.new;
          if (newDrop.shift_date >= dateFrom && newDrop.shift_date <= dateTo) {
            // Debounce: batch rapid inserts into one re-fetch
            clearTimeout(realtimeDebounceRef.current);
            realtimeDebounceRef.current = setTimeout(() => {
              setRefreshKey((k) => k + 1);
            }, 800);
          }
        } else if (payload.eventType === 'DELETE') {
          setDrops((prev) => prev.filter((d) => d.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      clearTimeout(realtimeDebounceRef.current);
      clearTimeout(presetDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [companyId, dateFrom, dateTo]);

  // Delete drop
  const handleDeleteDrop = useCallback(async (dropId) => {
    setDeletingId(dropId);
    setDeleteError(null);
    const dropToDelete = drops.find((d) => d.id === dropId);
    const { error } = await supabase.from('drops').delete().eq('id', dropId);
    if (error) {
      setDeleteError(error.message);
    } else {
      setDrops((prev) => prev.filter((d) => d.id !== dropId));
      setExpandedDrop(null);
    }
    setDeletingId(null);
  }, [drops, companyId, staff?.id]);

  const totalCents = drops.reduce((sum, d) => sum + d.amount_cents, 0);
  const totalTargetCents = drops.reduce((sum, d) => sum + d.target_cents, 0);
  const netVarianceCents = totalCents - totalTargetCents;
  const avgCents = drops.length > 0 ? Math.round(totalCents / drops.length) : 0;
  const staffActiveCount = new Set(drops.map((d) => d.staff_id)).size;

  // Animated values
  const animDrops = useCountUp(drops.length);
  const animTotal = useCountUp(totalCents);
  const animAvg = useCountUp(avgCents);
  const animStaff = useCountUp(staffActiveCount);
  const animVariance = useCountUp(netVarianceCents);

  // Unique staff names for filter dropdown
  const staffNames = useMemo(() => {
    const map = new Map();
    drops.forEach((d) => {
      if (d.staff_id && d.staff?.name) map.set(d.staff_id, d.staff.name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [drops]);

  // Filtered drops
  const filtered = useMemo(() => {
    if (staffFilter === 'all') return drops;
    return drops.filter((d) => d.staff_id === staffFilter);
  }, [drops, staffFilter]);

  // Employee breakdown
  const byEmployee = useMemo(() => {
    const map = new Map();
    drops.forEach((d) => {
      const key = d.staff_id || 'unknown';
      const name = d.staff?.name || 'Unknown';
      if (!map.has(key)) map.set(key, { name, drops: [], totalCents: 0, totalTargetCents: 0 });
      const entry = map.get(key);
      entry.drops.push(d);
      entry.totalCents += d.amount_cents;
      entry.totalTargetCents += d.target_cents;
    });
    return Array.from(map.values()).sort((a, b) => b.totalCents - a.totalCents);
  }, [drops]);

  const filteredTotal = filtered.reduce((sum, d) => sum + d.amount_cents, 0);

  // Skeleton for stats
  const renderStatsSkeleton = () => (
    <div className="admin-stat-row">
      {[0, 1, 2, 3, ...(isAdmin ? [4] : [])].map((i) => (
        <div key={i} className="adm-sk adm-sk-stat" style={{ animationDelay: `${i * .04}s` }} />
      ))}
    </div>
  );

  const csvLabel = dateFrom === dateTo ? dateFrom : `${dateFrom}_to_${dateTo}`;

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2>{isAdmin ? 'All Drops' : 'My Drops'}</h2>
        <div className="admin-panel-actions">
          <button
            className="admin-btn-sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            data-tooltip="Refresh"
            data-tooltip-pos="left"
          >
            <i className="fa-solid fa-arrows-rotate" />
          </button>
        </div>
      </div>

      {/* Range preset buttons */}
      <div className="admin-range-presets">
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.key}
            className={`admin-range-btn${rangePreset === p.key ? ' active' : ''}`}
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
        {!loading && drops.length > 0 && (
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
      {loading ? renderStatsSkeleton() : (
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
      )}

      {/* Graph */}
      {!loading && drops.length > 0 && showGraph && (
        <div className="admin-graph-card">
          <div className="admin-graph-header">
            <span className="admin-graph-title">{isMultiDay ? 'Drops by Day' : 'Drops by Hour'}</span>
            <div className="admin-graph-toggles">
              <button
                className={`admin-graph-toggle${graphMode === 'total' ? ' active' : ''}`}
                onClick={() => setGraphMode('total')}
              >
                Total $
              </button>
              <button
                className={`admin-graph-toggle${graphMode === 'count' ? ' active' : ''}`}
                onClick={() => setGraphMode('count')}
              >
                Count
              </button>
            </div>
          </div>
          {isMultiDay
            ? <DailyChart drops={drops} graphMode={graphMode} />
            : <DropsChart drops={drops} graphMode={graphMode} />
          }
        </div>
      )}

      {/* View toggle (admin only) */}
      {isAdmin && drops.length > 0 && !loading && (
        <div className="admin-drops-toolbar">
          <div className="admin-view-toggle">
            <button
              className={`admin-btn-sm${view === 'table' ? ' active' : ''}`}
              onClick={() => setView('table')}
            >
              <i className="fa-solid fa-list" /> List
            </button>
            <button
              className={`admin-btn-sm${view === 'by-employee' ? ' active' : ''}`}
              onClick={() => setView('by-employee')}
            >
              <i className="fa-solid fa-users" /> By Employee
            </button>
          </div>
          <div className="admin-drops-toolbar-right">
            <button
              className="admin-btn-sm"
              onClick={() => setShowGraph(!showGraph)}
              data-tooltip={showGraph ? 'Hide graph' : 'Show graph'}
              data-tooltip-pos="left"
            >
              <i className={`fa-solid ${showGraph ? 'fa-chart-simple' : 'fa-chart-simple'}`} />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="adm-sk adm-sk-row" />
          <div className="adm-sk adm-sk-row" style={{ opacity: .7 }} />
          <div className="adm-sk adm-sk-row" style={{ opacity: .5 }} />
        </div>
      ) : loadError ? (
        <div className="admin-empty-state">
          <i className="fa-solid fa-triangle-exclamation" />
          <p>{loadError}</p>
          <button className="admin-btn-sm" onClick={() => setRefreshKey((k) => k + 1)}>
            Retry
          </button>
        </div>
      ) : drops.length === 0 ? (
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
          {staffFilter !== 'all' && (
            <div className="admin-filter-summary">
              Showing {filtered.length} drop{filtered.length !== 1 ? 's' : ''} &middot;
              {fmtMoney(filteredTotal)} total
            </div>
          )}
          {deleteError && (
            <div className="admin-error" style={{ marginBottom: 8 }}>
              Failed to delete: {deleteError}
              <button className="admin-btn-sm" style={{ marginLeft: 8 }} onClick={() => setDeleteError(null)}>Dismiss</button>
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
                {filtered.slice(0, displayLimit).map((drop) => {
                  const v = drop.amount_cents - drop.target_cents;
                  const isExpanded = expandedDrop === drop.id;
                  return (
                    <React.Fragment key={drop.id}>
                      <tr
                        className={drop.note ? 'has-note' : ''}
                        onClick={() => setExpandedDrop(isExpanded ? null : drop.id)}
                        style={{ cursor: drop.note ? 'pointer' : undefined }}
                      >
                        {isAdmin && <td>{drop.staff?.name || '—'}</td>}
                        <td className="admin-amount">
                          {fmtMoney(drop.amount_cents)}
                        </td>
                        <td>{fmtMoney(drop.target_cents)}</td>
                        <td className={`admin-variance${v < 0 ? ' short' : v > 0 ? ' over' : ''}`}>
                          {fmtVariance(v)}
                        </td>
                        {isMultiDay && <td className="admin-time">{drop.shift_date.slice(5).replace('-', '/')}</td>}
                        <td className="admin-time">
                          {new Date(drop.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {drop.note && <i className="fa-solid fa-note-sticky" style={{ marginLeft: 6, fontSize: 10, opacity: .5 }} />}
                        </td>
                        {isAdmin && (
                          <td className="admin-actions-cell" onClick={(e) => e.stopPropagation()}>
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
          {filtered.length > displayLimit && (
            <button
              className="admin-btn-sm"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              onClick={() => setDisplayLimit((l) => l + PAGE_SIZE)}
            >
              Load more ({filtered.length - displayLimit} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}
