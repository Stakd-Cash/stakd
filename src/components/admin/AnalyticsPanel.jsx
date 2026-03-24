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
      <div className="admin-panel admin-analytics-loading">
        <div className="admin-analytics-loading-inner">
          <RefreshCw className="fa-spin admin-analytics-loading-icon" />
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
      <div className="admin-panel-header admin-analytics-header">
        <div>
          <h2>
            <BarChart3 size={24} /> Analytics & Reports
          </h2>
          <p className="admin-analytics-subline">
            Track performance, profits, and identify loss prevention opportunities
          </p>
        </div>
        <button className="admin-icon-btn" onClick={refetch} title="Refresh data">
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Date Filters */}
      <div className="admin-analytics-filters">
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
        <div className="admin-analytics-alerts">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`admin-alert ${alert.type === 'alert' ? 'admin-alert-danger' : 'admin-alert-warning'}`}
            >
              <AlertTriangle size={20} />
              <div>
                <strong>{alert.title}</strong>
                <p>{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="admin-stats-grid admin-analytics-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--success">
            <DollarSign size={24} />
          </div>
          <div className="admin-stat-value">{formatCurrency(summary.totalAmount)}</div>
          <div className="admin-stat-label">Total Collected ({summary.totalDrops} drops)</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--brand">
            <Calendar size={24} />
          </div>
          <div className="admin-stat-value">{formatCurrency(summary.totalTarget)}</div>
          <div className="admin-stat-label">Expected Target</div>
        </div>

        <div className="admin-stat-card">
          <div className={`admin-stat-icon ${summary.variance >= 0 ? 'admin-stat-icon--var-pos' : 'admin-stat-icon--var-neg'}`}>
            {summary.variance >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
          <div className={`admin-stat-value ${summary.variance >= 0 ? 'admin-stat-value--var-pos' : 'admin-stat-value--var-neg'}`}>
            {summary.variance >= 0 ? '+' : ''}{formatCurrency(summary.variance)}
          </div>
          <div className="admin-stat-label">Net Variance ({summary.variancePercent.toFixed(1)}%)</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon admin-stat-icon--info">
            <Users size={24} />
          </div>
          <div className="admin-stat-value">{byStaff.length}</div>
          <div className="admin-stat-label">Active Staff Members</div>
        </div>
      </div>

      <div className="admin-analytics-split">
        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <div className="admin-card admin-analytics-section">
            <h3 className="admin-card-title admin-card-title--row">
              <Award size={20} className="admin-analytics-icon-warning" /> Top Performers
            </h3>
            <div className="admin-list">
              {topPerformers.map((staff, idx) => {
                const accuracy = 100 - Math.abs((staff.variance / Math.max(1, staff.totalTarget)) * 100);
                return (
                  <div key={staff.id} className="admin-list-item">
                    <div className="admin-flex-row-gap">
                      <div className="admin-rank-badge">{idx + 1}</div>
                      <div>
                        <div className="admin-text-strong">{staff.name}</div>
                        <div className="admin-text-caption">{staff.totalDrops} drops</div>
                      </div>
                    </div>
                    <div className="admin-text-right">
                      <div className="admin-text-strong-num admin-text-var--pos">{accuracy.toFixed(1)}% acc</div>
                      <div className={`admin-text-caption ${staff.variance >= 0 ? 'admin-text-var--pos' : 'admin-text-var--neg'}`}>
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
        <div className="admin-card admin-analytics-section">
          <h3 className="admin-card-title admin-card-title--row">
            <Calendar size={20} /> Daily Trend
          </h3>
          <div className="admin-list admin-list--scroll">
            {byDay.map((day) => (
              <div key={day.date} className="admin-list-item">
                <div>
                  <div className="admin-text-strong">{formatDate(day.date)}</div>
                  <div className="admin-text-caption">{formatCurrency(day.totalAmount)}</div>
                </div>
                <div className="admin-text-right">
                  <div className={`admin-text-strong-num ${day.variance >= 0 ? 'admin-text-var--pos' : 'admin-text-var--neg'}`}>
                    {day.variance >= 0 ? '+' : ''}{formatCurrency(day.variance)}
                  </div>
                  <div className="admin-text-caption">vs {formatCurrency(day.totalTarget)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Performance Table */}
      <div className="admin-card admin-analytics-section admin-analytics-table-card">
        <h3 className="admin-card-title admin-card-title--row">
          <Users size={20} /> Staff Breakdown
        </h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Staff Member</th>
              <th className="admin-table-th-num">Drops</th>
              <th className="admin-table-th-num">Amount</th>
              <th className="admin-table-th-num">Variance</th>
              <th className="admin-table-th-center">Issues</th>
            </tr>
          </thead>
            <tbody>
              {byStaff.map((staff) => (
                <tr key={staff.id}>
                  <td data-label="Staff Member">
                    <div className="admin-text-strong">{staff.name}</div>
                    <div className="admin-text-caption-capitalize">{staff.role}</div>
                  </td>
                  <td data-label="Drops" className="admin-table-td-num">{staff.totalDrops}</td>
                  <td data-label="Amount" className="admin-table-td-num admin-table-td-medium">{formatCurrency(staff.totalAmount)}</td>
                  <td data-label="Variance" className={`admin-table-td-num admin-text-strong-num ${staff.variance >= 0 ? 'admin-text-var--pos' : 'admin-text-var--neg'}`}>
                    {staff.variance >= 0 ? '+' : ''}{formatCurrency(staff.variance)}
                  </td>
                  <td data-label="Issues" className="admin-table-td-center">
                    <div className="admin-flex-center-gap">
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
        <div className="admin-card admin-card-danger admin-analytics-section">
          <div className="admin-analytics-loss-hd">
            <h3>
              <AlertTriangle size={20} /> Loss Prevention Flags
            </h3>
            <p>Shortages &gt; $60 requiring review</p>
          </div>
          <div className="admin-analytics-loss-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Staff</th>
                  <th className="admin-table-th-num">Amount</th>
                  <th className="admin-table-th-num">Target</th>
                  <th className="admin-table-th-num">Shortage</th>
                </tr>
              </thead>
              <tbody>
                {lossPreventionFlags.map((flag) => (
                  <tr key={flag.id}>
                    <td data-label="Date" className="admin-table-td-nowrap">{formatDate(flag.date)}</td>
                    <td data-label="Staff" className="admin-table-td-medium">{flag.staffName}</td>
                    <td data-label="Amount" className="admin-table-td-num">{formatCurrency(flag.amount)}</td>
                    <td data-label="Target" className="admin-table-td-num admin-text-caption">{formatCurrency(flag.target)}</td>
                    <td data-label="Shortage" className="admin-table-td-num admin-text-strong-num admin-text-var--neg">{formatCurrency(flag.variance)}</td>
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
