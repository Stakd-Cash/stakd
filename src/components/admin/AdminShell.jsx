import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useAppStore } from '../../store/useStore.js';
import { supabase } from '../../lib/supabase.js';
import { applyTheme } from '../../utils/theme.js';
import { lsSet } from '../../utils/storage.js';
import { LS_THEME } from '../../utils/constants.js';
import { ConfirmModal } from '../ConfirmModal.jsx';
import { StaffPanel } from './StaffPanel.jsx';
import { DropsPanel } from './DropsPanel.jsx';
import { PinPad } from './PinPad.jsx';
import { AuditLogPanel } from './AuditLogPanel.jsx';
import { AnalyticsPanel } from './AnalyticsPanel.jsx';
import { CustomSelect } from './UIComponents.jsx';

const ROLE_LABELS = { cashier: 'Crew Member', manager: 'Manager', owner: 'Owner' };
const ADMIN_ROLES = ['owner', 'manager'];

export function AdminShell({ navigate, replaceNavigate }) {
  const {
    user, company, staff, activeStaff,
    signOut, pinLogout, loading,
    kioskMode, setKioskMode, deleteCompany,
  } = useAuthStore();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const [tab, setTab] = useState(() => {
    try { return sessionStorage.getItem('stakd_admin_tab') || 'drops'; } catch { return 'drops'; }
  });
  const [staffCount, setStaffCount] = useState(null);
  const [editingCompanyName, setEditingCompanyName] = useState(false);
  const [companyNameDraft, setCompanyNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [editingTimeout, setEditingTimeout] = useState(false);
  const [timeoutDraft, setTimeoutDraft] = useState(10);
  const [savingTimeout, setSavingTimeout] = useState(false);
  const [settingsError, setSettingsError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteSlug, setDeleteSlug] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmHome, setConfirmHome] = useState(false);

  // Persist tab to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem('stakd_admin_tab', tab); } catch {}
  }, [tab]);

  // Fetch staff count for header
  useEffect(() => {
    if (!company?.id) return;
    let cancelled = false;
    (async () => {
      const { count, error } = await supabase
        .from('staff')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('active', true);
      if (!cancelled && !error) setStaffCount(count);
    })();
    return () => { cancelled = true; };
  }, [company?.id]);

  const handleSetTheme = useCallback((t) => {
    applyTheme(t);
    lsSet(LS_THEME, t);
    setTheme(t);
    const html = document.documentElement;
    html.classList.add('thm');
    setTimeout(() => html.classList.remove('thm'), 400);
  }, [setTheme]);

  // The "current" staff is either the PIN-identified cashier or the logged-in owner/manager
  const currentStaff = activeStaff || staff;
  const role = currentStaff?.role || 'cashier';
  const isAdmin = role === 'owner' || role === 'manager';
  const isOwner = role === 'owner';
  const ownerRole = staff?.role || 'cashier';
  const isOwnerAdmin = ownerRole === 'owner' || ownerRole === 'manager';
  const tabOptions = [
    { value: 'drops', label: 'Drops' },
    ...(isAdmin ? [{ value: 'analytics', label: 'Analytics' }, { value: 'staff', label: `Staff${staffCount != null ? ` (${staffCount})` : ''}` }] : []),
    ...(isOwner ? [{ value: 'settings', label: 'Settings' }, { value: 'audit', label: 'Audit Log' }] : []),
  ];

  const handleAdminPinSuccess = useCallback(() => {
    // PIN verified, now show dashboard
    setKioskMode('admin');
  }, [setKioskMode]);

  // On mount, ensure we enter admin-pin flow if not already in admin mode
  useEffect(() => {
    if (!loading && company && kioskMode !== 'admin') {
      setKioskMode('admin-pin');
    }
  }, [loading, company, kioskMode, setKioskMode]);

  // --- View transition system ---
  // Derive a key that represents which "screen" we're on
  const getViewKey = () => {
    if (loading) return 'loading';
    if (!company) return 'no-company';
    if (kioskMode !== 'admin') return 'admin-pin';
    return 'dashboard';
  };
  const viewKey = getViewKey();
  const [renderedKey, setRenderedKey] = useState(viewKey);
  const [phase, setPhase] = useState('visible'); // 'visible' | 'fading-out' | 'fading-in'
  const fadeTimer = useRef(null);

  useEffect(() => {
    if (viewKey !== renderedKey) {
      // Start fade-out
      setPhase('fading-out');
      clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => {
        setRenderedKey(viewKey);
        setPhase('fading-in');
        // After fade-in completes, go to visible
        fadeTimer.current = setTimeout(() => {
          setPhase('visible');
        }, 250);
      }, 150);
    }
    return () => clearTimeout(fadeTimer.current);
  }, [viewKey, renderedKey]);

  const handleSaveCompanyName = useCallback(async () => {
    if (!companyNameDraft.trim()) return;
    setSavingName(true);
    setSettingsError(null);
    const { error } = await supabase
      .from('companies')
      .update({ name: companyNameDraft.trim() })
      .eq('id', company.id);
    if (error) {
      setSettingsError(error.message);
      setSavingName(false);
      return;
    }
    await useAuthStore.getState().loadCompanyContext();
    setEditingCompanyName(false);
    setSavingName(false);
  }, [companyNameDraft, company?.id]);

  const handleSaveTimeout = useCallback(async () => {
    const val = Math.max(1, Math.min(480, Number(timeoutDraft) || 10));
    setSavingTimeout(true);
    setSettingsError(null);
    const { error } = await supabase
      .from('companies')
      .update({ kiosk_timeout_minutes: val })
      .eq('id', company.id);
    if (error) {
      setSettingsError(error.message);
      setSavingTimeout(false);
      return;
    }
    await useAuthStore.getState().loadCompanyContext();
    setEditingTimeout(false);
    setSavingTimeout(false);
  }, [timeoutDraft, company?.id]);

  const handleConfirmLogout = useCallback(async () => {
    setConfirmLogout(false);
    await signOut();
    replaceNavigate('/login');
  }, [signOut, replaceNavigate]);

  const handleConfirmHome = useCallback(() => {
    setConfirmHome(false);
    pinLogout();
    navigate('/pathway');
  }, [pinLogout, navigate]);

  // --- Compute transition class ---
  const transitionClass = phase === 'fading-out'
    ? 'admin-view admin-view--out'
    : phase === 'fading-in'
      ? 'admin-view admin-view--in'
      : 'admin-view';

  // --- Loading state (no transition wrapper needed) ---
  if (renderedKey === 'loading') {
    return (
      <div className={transitionClass}>
        <div className="admin-loading">
          <div className="admin-spinner" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '380px', padding: '0 16px' }}>
            <div className="adm-sk adm-sk-btn" />
            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="adm-sk adm-sk-stat" />
              <div className="adm-sk adm-sk-stat" />
            </div>
            <div className="adm-sk adm-sk-row" />
            <div className="adm-sk adm-sk-row" />
          </div>
        </div>
      </div>
    );
  }

  if (renderedKey === 'no-company') {
    return (
      <div className={transitionClass}>
        <div className="admin-empty">
          <h2>No Company Found</h2>
          <p>You haven&apos;t created or joined a company yet.</p>
          <button className="admin-submit" onClick={() => navigate('/login')}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Manager Dashboard PIN login — show PIN pad filtered to managers/owners
  if (renderedKey === 'admin-pin') {
    return (
      <div className={transitionClass}>
        <PinPad
          company={company}
          onSuccess={handleAdminPinSuccess}
          onBack={() => navigate('/pathway')}
          roleFilter={ADMIN_ROLES}
          prompt="Select a manager to log in as"
        />
      </div>
    );
  }

  return (
    <div className={transitionClass}>
    <div className="adm-dash">
      {/* Header */}
      <header className="adm-dash-header">
        <div className="adm-dash-header-left">
          <div className="adm-dash-brand">
            <img src="/favicon.svg" alt="Stakd" width="22" height="22" />
          </div>
          <div className="adm-dash-identity">
            <h1 className="adm-dash-company">{company.name}</h1>
            <span className="adm-dash-slug">{company.slug}</span>
          </div>
        </div>
        <div className="adm-dash-header-right">
          <div className="adm-dash-user">
            <span className="adm-dash-user-name">{currentStaff?.name || user?.email}</span>
            <span className={`adm-dash-role ${role}`}>{ROLE_LABELS[role] || role}</span>
          </div>
          {isOwnerAdmin && (
            <button
              className="adm-dash-icon-btn"
              onClick={() => setConfirmHome(true)}
              data-tooltip="Back to mode select"
              data-tooltip-pos="right"
            >
              <i className="fa-solid fa-house" />
            </button>
          )}
          <button className="adm-dash-icon-btn" onClick={() => setConfirmLogout(true)} data-tooltip="Sign out" data-tooltip-pos="left">
            <i className="fa-solid fa-right-from-bracket" />
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="adm-dash-mobile-tabs">
        <CustomSelect
          value={tab}
          onChange={setTab}
          options={tabOptions}
        />
      </div>
      <nav className="adm-dash-tabs">
        <button
          className={`adm-dash-tab${tab === 'drops' ? ' active' : ''}`}
          onClick={() => setTab('drops')}
        >
          <i className="fa-solid fa-money-bill-wave" /> Drops
        </button>
        {isAdmin && (
          <button
            className={`adm-dash-tab${tab === 'analytics' ? ' active' : ''}`}
            onClick={() => setTab('analytics')}
          >
            <i className="fa-solid fa-chart-line" /> Analytics
          </button>
        )}
        {isAdmin && (
          <button
            className={`adm-dash-tab${tab === 'staff' ? ' active' : ''}`}
            onClick={() => setTab('staff')}
          >
            <i className="fa-solid fa-users" /> Staff{staffCount != null ? ` (${staffCount})` : ''}
          </button>
        )}
        {isOwner && (
          <button
            className={`adm-dash-tab${tab === 'settings' ? ' active' : ''}`}
            onClick={() => setTab('settings')}
          >
            <i className="fa-solid fa-gear" /> Settings
          </button>
        )}
        {isOwner && (
          <button
            className={`adm-dash-tab${tab === 'audit' ? ' active' : ''}`}
            onClick={() => setTab('audit')}
          >
            <i className="fa-solid fa-clipboard-list" /> Audit Log
          </button>
        )}
      </nav>

      {/* Content */}
      <main className="adm-dash-content">
        {tab === 'drops' && (
          <DropsPanel company={company} currentStaff={currentStaff} isAdmin={isAdmin} />
        )}
        {tab === 'analytics' && isAdmin && <AnalyticsPanel companyId={company.id} />}
        {tab === 'staff' && isAdmin && <StaffPanel company={company} />}
        {tab === 'audit' && isOwner && (
          <AuditLogPanel company={company} />
        )}
        {tab === 'settings' && isOwner && (
          <div className="admin-panel">
            <div className="admin-panel-header">
              <h2>Company Settings</h2>
            </div>
            {settingsError && (
              <div className="admin-error" style={{ margin: '0 0 12px' }}>
                {settingsError}
                <button className="admin-btn-sm" style={{ marginLeft: 8 }} onClick={() => setSettingsError(null)}>Dismiss</button>
              </div>
            )}

            <div className="admin-settings-card">
              <div className="admin-settings-row">
                <div className="admin-settings-label">Company Name</div>
                {editingCompanyName ? (
                  <div className="admin-settings-edit-row">
                    <input
                      className="admin-settings-input"
                      type="text"
                      value={companyNameDraft}
                      onChange={(e) => setCompanyNameDraft(e.target.value)}
                      maxLength={100}
                      autoFocus
                    />
                    <button className="admin-btn-sm" onClick={handleSaveCompanyName} disabled={savingName}>
                      {savingName ? 'Saving...' : 'Save'}
                    </button>
                    <button className="admin-btn-sm" onClick={() => setEditingCompanyName(false)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="admin-settings-value-row">
                    <span className="admin-settings-value">{company.name}</span>
                    <button
                      className="admin-btn-sm"
                      onClick={() => {
                        setCompanyNameDraft(company.name);
                        setEditingCompanyName(true);
                      }}
                    >
                      <i className="fa-solid fa-pen" /> Edit
                    </button>
                  </div>
                )}
              </div>

              <div className="admin-settings-row">
                <div className="admin-settings-label">Slug</div>
                <div className="admin-settings-value-row">
                  <span className="admin-settings-value mono">{company.slug}</span>
                </div>
              </div>

              <div className="admin-settings-row">
                <div className="admin-settings-label">Owner</div>
                <div className="admin-settings-value-row">
                  <span className="admin-settings-value">{user?.email}</span>
                </div>
              </div>

              <div className="admin-settings-row">
                <div className="admin-settings-label">Kiosk Session Timeout</div>
                {editingTimeout ? (
                  <div className="admin-settings-edit-row">
                    <div className="admin-settings-timeout">
                      <input
                        type="number"
                        min="1"
                        max="480"
                        value={timeoutDraft}
                        onChange={(e) => setTimeoutDraft(e.target.value)}
                        autoFocus
                      />
                      <span>minutes</span>
                    </div>
                    <button className="admin-btn-sm" onClick={handleSaveTimeout} disabled={savingTimeout}>
                      {savingTimeout ? 'Saving...' : 'Save'}
                    </button>
                    <button className="admin-btn-sm" onClick={() => setEditingTimeout(false)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="admin-settings-value-row">
                    <span className="admin-settings-value">{company.kiosk_timeout_minutes ?? 10} min</span>
                    <button
                      className="admin-btn-sm"
                      onClick={() => {
                        setTimeoutDraft(company.kiosk_timeout_minutes ?? 10);
                        setEditingTimeout(true);
                      }}
                    >
                      <i className="fa-solid fa-pen" /> Edit
                    </button>
                  </div>
                )}
              </div>

              <div className="admin-settings-row">
                <div className="admin-settings-label">Appearance</div>
                <div className="admin-settings-value-row">
                  <span className="admin-settings-value">
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </span>
                  <div className="admin-theme-toggle">
                    <button
                      className={`admin-theme-btn${theme === 'light' ? ' active' : ''}`}
                      onClick={() => handleSetTheme('light')}
                      data-tooltip="Light mode"
                      data-tooltip-pos="left"
                    >
                      <i className="fa-solid fa-sun" />
                    </button>
                    <button
                      className={`admin-theme-btn${theme === 'dark' ? ' active' : ''}`}
                      onClick={() => handleSetTheme('dark')}
                      data-tooltip="Dark mode"
                      data-tooltip-pos="left"
                    >
                      <i className="fa-solid fa-moon" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="admin-danger-zone">
              <div className="admin-danger-header">
                <i className="fa-solid fa-triangle-exclamation" /> Danger Zone
              </div>
              {!confirmDelete ? (
                <button
                  className="admin-btn-danger-full"
                  onClick={() => { setConfirmDelete(true); setDeleteSlug(''); }}
                >
                  <i className="fa-solid fa-trash" /> Delete Company
                </button>
              ) : (
                <div className="admin-danger-confirm">
                  <p>
                    This will <strong>permanently delete</strong> your company, all staff, all drops, and all audit logs. This cannot be undone.
                  </p>
                  <p>Type <strong>{company.slug}</strong> to confirm:</p>
                  <input
                    type="text"
                    className="admin-settings-input"
                    value={deleteSlug}
                    onChange={(e) => setDeleteSlug(e.target.value)}
                    placeholder={company.slug}
                    autoFocus
                  />
                  {settingsError && (
                    <div className="admin-error" style={{ marginTop: 8 }}>{settingsError}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      className="admin-btn-danger-full"
                      disabled={deleteSlug !== company.slug || deleting}
                      onClick={async () => {
                        setDeleting(true);
                        setSettingsError(null);
                        const result = await deleteCompany();
                        if (result?.error) {
                          setSettingsError(result.error);
                          setDeleting(false);
                          return;
                        }
                        replaceNavigate('/login');
                      }}
                    >
                      {deleting ? 'Deleting...' : 'Permanently Delete'}
                    </button>
                    <button
                      className="admin-btn-sm"
                      onClick={() => { setConfirmDelete(false); setDeleteSlug(''); }}
                      style={{ height: 40 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
    {confirmLogout && createPortal(
      <ConfirmModal
        title="Log Out"
        body="Are you sure you want to log out of this company account?"
        confirmLabel="Log Out"
        onConfirm={handleConfirmLogout}
        onCancel={() => setConfirmLogout(false)}
      />,
      document.body
    )}
    {confirmHome && createPortal(
      <ConfirmModal
        title="Go Home"
        body={`Going home will log out the user session for "${currentStaff?.name || user?.email || 'this account'}". Do you want to continue?`}
        confirmLabel="Go Home"
        onConfirm={handleConfirmHome}
        onCancel={() => setConfirmHome(false)}
      />,
      document.body
    )}
    </div>
  );
}
