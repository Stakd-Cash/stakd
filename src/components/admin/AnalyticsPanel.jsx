import React, { useState } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics.js';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Users,
  Calendar,
  Award,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

const RANGE_OPTIONS = [
  { value: 'week', label: '7 days' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

export function AnalyticsPanel({ companyId }) {
  const [dateRange, setDateRange] = useState('month');
  const { analytics, loading, refreshing, error, refreshError, refetch } = useAnalytics(
    companyId,
    dateRange,
  );

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
      <div className="admin-panel ap-analytics admin-analytics-loading">
        <div className="admin-analytics-loading-inner">
          <RefreshCw className="admin-analytics-loading-icon" aria-hidden />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-panel ap-analytics ap-analytics-shell">
        <div className="admin-error">Could not load analytics: {error}</div>
      </div>
    );
  }

  const { summary, byStaff, byDay, alerts, topPerformers, lossPreventionFlags } = analytics;

  return (
    <div
      className={`admin-panel ap-analytics ap-analytics-shell${refreshing ? ' ap-analytics-shell--refreshing' : ''}`}
      aria-busy={refreshing}
    >
      <header className="ap-analytics-hero">
        <div className="ap-analytics-hero-text">
          <span className="sk-modal-eyebrow">Analytics</span>
          <h2 className="sk-modal-title admin-analytics-title-row">
            <BarChart3 size={22} strokeWidth={2} aria-hidden />
            Performance overview
          </h2>
          <p className="admin-analytics-subline">
            Key metrics and trends for the workspace
          </p>
        </div>
        <button
          type="button"
          className={`admin-icon-btn${refreshing ? ' is-refreshing' : ''}`}
          onClick={refetch}
          disabled={refreshing}
          aria-label="Refresh analytics"
          title="Refresh"
        >
          <RefreshCw size={20} className={refreshing ? 'admin-analytics-loading-icon' : undefined} aria-hidden />
        </button>
      </header>

      {refreshError && (
        <div className="admin-error ap-analytics-refresh-error" role="alert">
          {refreshError}
        </div>
      )}

      {alerts.length > 0 && (
        <div className="admin-analytics-alerts ap-analytics-alerts">
          {alerts.map((alert, idx) =>
            alert.type === 'alert' ? (
              <div key={idx} className="sk-callout-note sk-callout-note--danger">
                <AlertTriangle size={20} aria-hidden />
                <div>
                  <strong>{alert.title}</strong>
                  <p>{alert.message}</p>
                </div>
              </div>
            ) : (
              <div key={idx} className="admin-alert admin-alert-warning">
                <AlertTriangle size={20} aria-hidden />
                <div>
                  <strong>{alert.title}</strong>
                  <p>{alert.message}</p>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      <div className="ap-analytics-range" role="group" aria-label="Report period">
        {RANGE_OPTIONS.map((range) => (
          <button
            key={range.value}
            type="button"
            className={`ap-analytics-range-btn ${dateRange === range.value ? 'is-active' : ''}`}
            onClick={() => setDateRange(range.value)}
            disabled={refreshing}
          >
            {range.label}
          </button>
        ))}
      </div>

      <section className="admin-analytics-stats ap-analytics-kpis" aria-label="Summary">
        <div className="sk-card ap-analytics-kpi">
          <div className="sk-card-body">
            <div className="admin-stat-icon admin-stat-icon--success">
              <DollarSign size={22} />
            </div>
            <div className="admin-stat-value">{formatCurrency(summary.totalAmount)}</div>
            <div className="admin-analytics-stat-label">
              Collected · {summary.totalDrops} drops
            </div>
          </div>
        </div>

        <div className="sk-card ap-analytics-kpi">
          <div className="sk-card-body">
            <div className="admin-stat-icon admin-stat-icon--brand">
              <Calendar size={22} />
            </div>
            <div className="admin-stat-value">{formatCurrency(summary.totalTarget)}</div>
            <div className="admin-analytics-stat-label">Expected target</div>
          </div>
        </div>

        <div className="sk-card ap-analytics-kpi">
          <div className="sk-card-body">
            <div
              className={`admin-stat-icon ${summary.variance >= 0 ? 'admin-stat-icon--var-pos' : 'admin-stat-icon--var-neg'}`}
            >
              {summary.variance >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
            </div>
            <div
              className={`admin-stat-value ${summary.variance >= 0 ? 'admin-stat-value--var-pos' : 'admin-stat-value--var-neg'}`}
            >
              {summary.variance >= 0 ? '+' : ''}
              {formatCurrency(summary.variance)}
            </div>
            <div className="admin-analytics-stat-label">
              Net variance · {summary.variancePercent.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="sk-card ap-analytics-kpi">
          <div className="sk-card-body">
            <div className="admin-stat-icon admin-stat-icon--info">
              <Users size={22} />
            </div>
            <div className="admin-stat-value">{byStaff.length}</div>
            <div className="admin-analytics-stat-label">Staff in period</div>
          </div>
        </div>
      </section>

      <div className="ap-analytics-two-col">
        {topPerformers.length > 0 && (
          <div className="sk-card admin-analytics-section ap-analytics-card">
            <div className="sk-card-header ap-analytics-card-hd">
              <h3 className="admin-analytics-section-head">
                <Award size={18} className="admin-analytics-icon-warning" aria-hidden />
                Top performers
              </h3>
            </div>
            <div className="sk-card-body">
              <div className="admin-list ap-analytics-list">
                {topPerformers.map((staff, idx) => {
                  const accuracy =
                    100 - Math.abs((staff.variance / Math.max(1, staff.totalTarget)) * 100);
                  return (
                    <div key={staff.id} className="admin-list-item ap-analytics-list-row">
                      <div className="admin-flex-row-gap">
                        <div className="admin-rank-badge">{idx + 1}</div>
                        <div>
                          <div className="admin-analytics-list-primary">{staff.name}</div>
                          <div className="admin-analytics-list-meta">{staff.totalDrops} drops</div>
                        </div>
                      </div>
                      <div className="admin-text-right">
                        <div className="admin-text-strong-num admin-text-var--pos">
                          {accuracy.toFixed(1)}% acc
                        </div>
                        <div
                          className={`admin-text-caption ${staff.variance >= 0 ? 'admin-text-var--pos' : 'admin-text-var--neg'}`}
                        >
                          {staff.variance >= 0 ? '+' : ''}
                          {formatCurrency(staff.variance)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="sk-card admin-analytics-section ap-analytics-card">
          <div className="sk-card-header ap-analytics-card-hd">
            <h3 className="admin-analytics-section-head">
              <Calendar size={18} aria-hidden />
              Daily trend
            </h3>
          </div>
          <div className="sk-card-body">
            <div className="admin-list admin-list--scroll ap-analytics-list">
              {byDay.map((day) => (
                <div key={day.date} className="admin-list-item ap-analytics-list-row">
                  <div>
                    <div className="admin-analytics-list-primary">{formatDate(day.date)}</div>
                    <div className="admin-analytics-list-meta">{formatCurrency(day.totalAmount)}</div>
                  </div>
                  <div className="admin-text-right">
                    <div
                      className={`admin-text-strong-num ${day.variance >= 0 ? 'admin-text-var--pos' : 'admin-text-var--neg'}`}
                    >
                      {day.variance >= 0 ? '+' : ''}
                      {formatCurrency(day.variance)}
                    </div>
                    <div className="admin-text-caption">vs {formatCurrency(day.totalTarget)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="sk-card admin-analytics-section admin-analytics-table-card ap-analytics-card ap-analytics-wide">
        <div className="sk-card-header ap-analytics-card-hd">
          <h3 className="admin-analytics-section-head">
            <Users size={18} aria-hidden />
            Staff breakdown
          </h3>
        </div>
        <div className="sk-card-body admin-analytics-table-card-body">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Staff</th>
                <th className="admin-table-th-num">Drops</th>
                <th className="admin-table-th-num">Amount</th>
                <th className="admin-table-th-num">Variance</th>
                <th className="admin-table-th-center">Issues</th>
              </tr>
            </thead>
            <tbody>
              {byStaff.map((staff) => (
                <tr key={staff.id}>
                  <td data-label="Staff">
                    <div className="admin-text-strong">{staff.name}</div>
                    <div className="admin-text-caption-capitalize">{staff.role}</div>
                  </td>
                  <td data-label="Drops" className="admin-table-td-num">
                    {staff.totalDrops}
                  </td>
                  <td data-label="Amount" className="admin-table-td-num admin-table-td-medium">
                    {formatCurrency(staff.totalAmount)}
                  </td>
                  <td
                    data-label="Variance"
                    className={`admin-table-td-num admin-text-strong-num ${staff.variance >= 0 ? 'admin-text-var--pos' : 'admin-text-var--neg'}`}
                  >
                    {staff.variance >= 0 ? '+' : ''}
                    {formatCurrency(staff.variance)}
                  </td>
                  <td data-label="Issues" className="admin-table-td-center">
                    <div className="admin-flex-center-gap">
                      {staff.shortages > 0 && (
                        <span className="admin-badge admin-badge-red" title="Shortages">
                          {staff.shortages}
                        </span>
                      )}
                      {staff.overages > 0 && (
                        <span className="admin-badge admin-badge-green" title="Overages">
                          {staff.overages}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {lossPreventionFlags.length > 0 && (
        <div className="sk-card admin-analytics-loss-card admin-analytics-section ap-analytics-card ap-analytics-wide">
          <div className="sk-card-header admin-analytics-loss-card-hd">
            <div>
              <h3 className="admin-analytics-section-head admin-analytics-section-head--loss">
                <AlertTriangle size={18} aria-hidden />
                Loss prevention
              </h3>
              <p className="admin-analytics-loss-sub">Shortages over $60 — review recommended</p>
            </div>
          </div>
          <div className="sk-card-body admin-analytics-loss-table-wrap">
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
                    <td data-label="Date" className="admin-table-td-nowrap">
                      {formatDate(flag.date)}
                    </td>
                    <td data-label="Staff" className="admin-table-td-medium">
                      {flag.staffName}
                    </td>
                    <td data-label="Amount" className="admin-table-td-num">
                      {formatCurrency(flag.amount)}
                    </td>
                    <td data-label="Target" className="admin-table-td-num admin-text-caption">
                      {formatCurrency(flag.target)}
                    </td>
                    <td
                      data-label="Shortage"
                      className="admin-table-td-num admin-text-strong-num admin-text-var--neg"
                    >
                      {formatCurrency(flag.variance)}
                    </td>
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
