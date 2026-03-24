import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';

const PAGE_SIZE = 50;

const ACTION_ICONS = {
  'staff.create': 'fa-user-plus',
  'staff.update': 'fa-user-pen',
  'staff.deactivate': 'fa-user-slash',
  'staff.activate': 'fa-user-check',
  'staff.pin_change': 'fa-key',
  'drop.delete': 'fa-trash',
  'settings.update': 'fa-gear',
  'company.name_change': 'fa-pen',
};

const ACTION_LABELS = {
  'staff.create': 'Added staff',
  'staff.update': 'Updated staff',
  'staff.deactivate': 'Deactivated staff',
  'staff.activate': 'Activated staff',
  'staff.pin_change': 'Changed PIN',
  'drop.delete': 'Deleted drop',
  'settings.update': 'Updated settings',
  'company.name_change': 'Changed company name',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function AuditLogPanel({ company }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);

  const companyId = company?.id;

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from('audit_log')
        .select('*, staff(name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setEntries([]);
      } else {
        setEntries(data || []);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [companyId]);

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="admin-panel-header"><h2>Audit Log</h2></div>
        <div className="admin-panel-skeleton-stack">
          {[0, 1, 2].map((i) => (
            <div key={i} className="adm-sk adm-sk-row" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="admin-panel">
        <div className="admin-panel-header"><h2>Audit Log</h2></div>
        <div className="admin-empty-state">
          <i className="fa-solid fa-triangle-exclamation" />
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

  const visible = entries.slice(0, displayLimit);

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2>Audit Log</h2>
      </div>

      {entries.length === 0 ? (
        <div className="admin-empty-state">
          <i className="fa-solid fa-clipboard-list" />
          <p>No activity recorded yet.</p>
        </div>
      ) : (
        <>
          <div className="audit-log-list">
            {visible.map((entry) => {
              const icon = ACTION_ICONS[entry.action] || 'fa-circle-info';
              const label = ACTION_LABELS[entry.action] || entry.action;
              const actor = entry.staff?.name || 'System';
              const details = entry.details || {};
              return (
                <div key={entry.id} className="audit-log-entry">
                  <div className="audit-log-icon">
                    <i className={`fa-solid ${icon}`} />
                  </div>
                  <div className="audit-log-body">
                    <div className="audit-log-main">
                      <strong>{actor}</strong> {label}
                      {details.target_name && (
                        <span className="audit-log-target"> — {details.target_name}</span>
                      )}
                    </div>
                    {details.changes && (
                      <div className="audit-log-details">
                        {Object.entries(details.changes).map(([k, v]) => (
                          <span key={k} className="audit-log-change">{k}: {String(v)}</span>
                        ))}
                      </div>
                    )}
                    <div className="audit-log-time">{timeAgo(entry.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {entries.length > displayLimit && (
            <button
              type="button"
              className="admin-btn-sm admin-btn-load-more"
              onClick={() => setDisplayLimit((l) => l + PAGE_SIZE)}
            >
              Load more ({entries.length - displayLimit} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}
