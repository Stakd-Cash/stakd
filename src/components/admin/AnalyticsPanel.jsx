import React, { useState } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics.js';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Users, Calendar, Award, BarChart3, RefreshCw } from 'lucide-react';

export function AnalyticsPanel({ companyId }) {
  const [dateRange, setDateRange] = useState('month');
  const { analytics, loading, error, refetch } = useAnalytics(companyId, dateRange);

  const formatCurrency = (cents) => {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(dollars);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="admin-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
        <div style={{ textAlign: 'center', color: 'var(--t2)' }}>
          <RefreshCw className="fa-spin" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-panel">
        <div className="admin-error">
          Error loading analytics: {error}
        </div>
      </div>
    );
  }

  const { summary, byStaff, byDay, alerts, topPerformers, lossPreventionFlags } = analytics;

  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <BarChart3 size={24} /> Analytics & Reports
          </h2>
          <p style={{ color: 'var(--t2)', fontSize: 13, margin: '4px 0 0' }}>
            Track performance, profits, and identify loss prevention opportunities
          </p>
        </div>
        <button className="admin-icon-btn" onClick={refetch} title="Refresh data">
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Date Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { value: 'week', label: 'Last 7 Days' },
          { value: 'month', label: 'This Month' },
          { value: 'quarter', label: 'This Quarter' },
          { value: 'year', label: 'This Year' },
        ].map((range) => (
          <button
            key={range.value}
            className={`admin-filter-btn ${dateRange === range.value ? 'active' : ''}`}
            onClick={() => setDateRange(range.value)}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`admin-alert ${alert.type === 'alert' ? 'admin-alert-danger' : 'admin-alert-warning'}`}
            >
              <AlertTriangle size={20} />
              <div>
                <strong>{alert.title}</strong>
                <p style={{ margin: '4px 0 0', fontSize: 13 }}>{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="admin-stats-grid" style={{ marginBottom: 24 }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: 'var(--green)' }}>
            <DollarSign size={24} />
          </div>
          <div className="admin-stat-value">{formatCurrency(summary.totalAmount)}</div>
          <div className="admin-stat-label">Total Collected ({summary.totalDrops} drops)</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: 'var(--brand)' }}>
            <Calendar size={24} />
          </div>
          <div className="admin-stat-value">{formatCurrency(summary.totalTarget)}</div>
          <div className="admin-stat-label">Expected Target</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: summary.variance >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {summary.variance >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
          <div className="admin-stat-value" style={{ color: summary.variance >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {summary.variance >= 0 ? '+' : ''}{formatCurrency(summary.variance)}
          </div>
          <div className="admin-stat-label">Net Variance ({summary.variancePercent.toFixed(1)}%)</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ color: 'var(--blue, #3b82f6)' }}>
            <Users size={24} />
          </div>
          <div className="admin-stat-value">{byStaff.length}</div>
          <div className="admin-stat-label">Active Staff Members</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <div className="admin-card">
            <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={20} style={{ color: 'var(--yellow, #eab308)' }} /> Top Performers
            </h3>
            <div className="admin-list">
              {topPerformers.map((staff, idx) => {
                const accuracy = 100 - Math.abs((staff.variance / Math.max(1, staff.totalTarget)) * 100);
                return (
                  <div key={staff.id} className="admin-list-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="admin-rank-badge">{idx + 1}</div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--t0)' }}>{staff.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--t2)' }}>{staff.totalDrops} drops</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: 'var(--green)' }}>{accuracy.toFixed(1)}% acc</div>
                      <div style={{ fontSize: 12, color: staff.variance >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {staff.variance >= 0 ? '+' : ''}{formatCurrency(staff.variance)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Daily Trend */}
        <div className="admin-card">
          <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={20} /> Daily Trend
          </h3>
          <div className="admin-list" style={{ maxHeight: 300, overflowY: 'auto' }}>
            {byDay.map((day) => (
              <div key={day.date} className="admin-list-item">
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--t0)' }}>{formatDate(day.date)}</div>
                  <div style={{ fontSize: 12, color: 'var(--t2)' }}>{formatCurrency(day.totalAmount)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: day.variance >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {day.variance >= 0 ? '+' : ''}{formatCurrency(day.variance)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t2)' }}>vs {formatCurrency(day.totalTarget)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Performance Table */}
      <div className="admin-card" style={{ marginBottom: 24, overflowX: 'auto' }}>
        <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={20} /> Staff Breakdown
        </h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Staff Member</th>
              <th style={{ textAlign: 'right' }}>Drops</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ textAlign: 'right' }}>Variance</th>
              <th style={{ textAlign: 'center' }}>Issues</th>
            </tr>
          </thead>
          <tbody>
            {byStaff.map((staff) => (
              <tr key={staff.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--t0)' }}>{staff.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--t2)', textTransform: 'capitalize' }}>{staff.role}</div>
                </td>
                <td style={{ textAlign: 'right' }}>{staff.totalDrops}</td>
                <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(staff.totalAmount)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: staff.variance >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {staff.variance >= 0 ? '+' : ''}{formatCurrency(staff.variance)}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                    {staff.shortages > 0 && <span className="admin-badge admin-badge-red" title="Shortages">{staff.shortages}</span>}
                    {staff.overages > 0 && <span className="admin-badge admin-badge-green" title="Overages">{staff.overages}</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Loss Prevention Flags */}
      {lossPreventionFlags.length > 0 && (
        <div className="admin-card admin-card-danger">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(229, 62, 62, 0.2)', background: 'rgba(229, 62, 62, 0.05)' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red)', fontSize: 16 }}>
              <AlertTriangle size={20} /> Loss Prevention Flags
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--t2)' }}>Shortages &gt; $60 requiring review</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Staff</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>Target</th>
                  <th style={{ textAlign: 'right' }}>Shortage</th>
                </tr>
              </thead>
              <tbody>
                {lossPreventionFlags.map((flag) => (
                  <tr key={flag.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(flag.date)}</td>
                    <td style={{ fontWeight: 500 }}>{flag.staffName}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(flag.amount)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--t2)' }}>{formatCurrency(flag.target)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--red)' }}>{formatCurrency(flag.variance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
