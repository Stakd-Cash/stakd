import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutGrid,
  BarChart3,
  Users,
  Settings,
  ClipboardList,
  Menu,
  House,
  LogOut,
} from 'lucide-react';
import '../../styles/admin.css';
import '../../styles/admin-portal.css';
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
import { 
  getPlanName, 
  formatSubscriptionStatus, 
  formatRenewalDate,
  createPortalSession 
} from '../../lib/billing.js';

const ROLE_LABELS = { cashier: 'Crew Member', manager: 'Manager', owner: 'Owner' };
const ADMIN_ROLES = ['owner', 'manager'];
const VALID_TABS = ['drops', 'analytics', 'staff', 'settings', 'audit'];

function getScopedAdminTabKey(companyId) {
  return companyId ? `stakd_admin_tab:${companyId}` : null;
}

function isAllowedTab(tab, { isAdmin, isOwner }) {
  if (tab === 'drops') return true;
  if ((tab === 'analytics' || tab === 'staff') && isAdmin) return true;
  if ((tab === 'settings' || tab === 'audit') && isOwner) return true;
  return false;
}

export function AdminShell({ navigate, replaceNavigate, initialTab = null }) {
  const {
    user, company, staff, activeStaff,
    signOut, pinLogout, loading,
    kioskMode, setKioskMode, deleteCompany,
  } = useAuthStore();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const [tab, setTab] = useState('drops');
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
  const [billingLoading, setBillingLoading] = useState(false);
  const [staffAddRequest, setStaffAddRequest] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // The "current" staff is either the PIN-identified cashier or the logged-in owner/manager.
  const currentStaff = activeStaff || staff;
  const role = currentStaff?.role || 'cashier';
  const isAdmin = role === 'owner' || role === 'manager';
  const isOwner = role === 'owner';
  const ownerRole = staff?.role || 'cashier';
  const isOwnerAdmin = ownerRole === 'owner' || ownerRole === 'manager';
  const scopedTabKey = getScopedAdminTabKey(company?.id);
  const tabOptions = [
    { value: 'drops', label: 'Drops' },
    ...(isAdmin
      ? [
          { value: 'analytics', label: 'Analytics' },
          { value: 'staff', label: `Staff${staffCount != null ? ` (${staffCount})` : ''}` },
        ]
      : []),
    ...(isOwner
      ? [
          { value: 'settings', label: 'Settings' },
          { value: 'audit', label: 'Audit Log' },
        ]
      : []),
  ];

  const handleManageBilling = async () => {
    if (!company?.stripe_customer_id) return;
    setBillingLoading(true);
    setSettingsError(null);
    try {
      const url = await createPortalSession({ customerId: company.stripe_customer_id });
      window.location.href = url;
    } catch (err) {
      setSettingsError(err.message);
    } finally {
      setBillingLoading(false);
    }
  };

  // Load the last admin tab for this company, but only if it is valid for the current role.
  useEffect(() => {
    if (!company?.id) return;

    let nextTab = 'drops';
    const normalizedInitialTab = VALID_TABS.includes(initialTab) ? initialTab : null;

    if (normalizedInitialTab && isAllowedTab(normalizedInitialTab, { isAdmin, isOwner })) {
      nextTab = normalizedInitialTab;
    } else if (scopedTabKey) {
      try {
        const storedTab = sessionStorage.getItem(scopedTabKey);
        if (storedTab && isAllowedTab(storedTab, { isAdmin, isOwner })) {
          nextTab = storedTab;
        }
      } catch {}
    }

    setTab(nextTab);
  }, [company?.id, initialTab, isAdmin, isOwner, scopedTabKey]);

  // Persist tab to sessionStorage
  useEffect(() => {
    if (!scopedTabKey) return;
    try { sessionStorage.setItem(scopedTabKey, tab); } catch {}
  }, [scopedTabKey, tab]);

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

  const handleAddCashier = useCallback(() => {
    setTab('staff');
    setStaffAddRequest((count) => count + 1);
  }, []);

  const handleOnboardingAddSuccess = useCallback(() => {
    setTab('drops');
  }, []);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const selectTab = useCallback((next) => {
    setTab(next);
    setSidebarOpen(false);
  }, []);

  // --- Compute transition class ---
  const transitionClass = phase === 'fading-out'
    ? 'admin-view admin-view--out'
    : phase === 'fading-in'
      ? 'admin-view admin-view--in'
      : 'admin-view';

  const planName = getPlanName(company?.plan);
  const subscriptionStatusLabel = formatSubscriptionStatus(company?.subscription_status);
  const renewalLabel = formatRenewalDate(company?.current_period_end);

  // --- Loading state (no transition wrapper needed) ---
  if (renderedKey === 'loading') {
    return (
      <div className={transitionClass}>
        <div className="admin-loading">
          <div className="admin-spinner" />
          <div className="admin-loading-skeletons">
            <div className="adm-sk adm-sk-btn" />
            <div className="admin-loading-skeletons-row">
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
    <div className={`ap-root${sidebarOpen ? ' ap-sidebar-open' : ''}`}>
      <button
        type="button"
        className="ap-scrim"
        aria-label="Close menu"
        onClick={closeSidebar}
      />
      <aside className="ap-sidebar" aria-label="Main navigation">
        <div className="ap-sidebar-brand">
          <div className="ap-sidebar-logo">
            <div className="ap-sidebar-logo-mark">
              <img src="/src/stakd-logo-mark.svg" alt="" width="24" height="24" />
            </div>
            <div>
              <p className="ap-sidebar-company">{company.name}</p>
              <p className="ap-sidebar-email">{user?.email || '—'}</p>
            </div>
          </div>
        </div>
        <nav className="ap-nav">
          <div className="ap-nav-group">
            <p className="ap-nav-section-label">Workspace</p>
            <button
              type="button"
              className={`ap-nav-item${tab === 'drops' ? ' active' : ''}`}
              onClick={() => selectTab('drops')}
            >
              <LayoutGrid size={18} strokeWidth={2} aria-hidden />
              Drops
            </button>
            {isAdmin && (
              <button
                type="button"
                className={`ap-nav-item${tab === 'analytics' ? ' active' : ''}`}
                onClick={() => selectTab('analytics')}
              >
                <BarChart3 size={18} strokeWidth={2} aria-hidden />
                Analytics
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                className={`ap-nav-item${tab === 'staff' ? ' active' : ''}`}
                onClick={() => selectTab('staff')}
              >
                <Users size={18} strokeWidth={2} aria-hidden />
                Staff
                {staffCount != null && (
                  <span className="ap-nav-badge">{staffCount}</span>
                )}
              </button>
            )}
          </div>
          {isOwner && (
            <>
              <div className="ap-nav-spacer" aria-hidden />
              <div className="ap-nav-group">
                <p className="ap-nav-section-label">Company</p>
                <button
                  type="button"
                  className={`ap-nav-item${tab === 'settings' ? ' active' : ''}`}
                  onClick={() => selectTab('settings')}
                >
                  <Settings size={18} strokeWidth={2} aria-hidden />
                  Settings
                </button>
                <button
                  type="button"
                  className={`ap-nav-item${tab === 'audit' ? ' active' : ''}`}
                  onClick={() => selectTab('audit')}
                >
                  <ClipboardList size={18} strokeWidth={2} aria-hidden />
                  Audit log
                </button>
              </div>
            </>
          )}
        </nav>
        <div className="ap-sidebar-footer">
          {isOwnerAdmin && (
            <button
              type="button"
              className="ap-sidebar-foot-btn"
              onClick={() => { setConfirmHome(true); closeSidebar(); }}
            >
              <House size={18} strokeWidth={2} aria-hidden />
              Mode select
            </button>
          )}
          <button
            type="button"
            className="ap-sidebar-foot-btn"
            onClick={() => { setConfirmLogout(true); closeSidebar(); }}
          >
            <LogOut size={18} strokeWidth={2} aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <div className="ap-main">
        <header className="ap-main-top">
          <button
            type="button"
            className="ap-menu-btn"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
          <div className="ap-main-user">
            <div className="ap-main-user-text">
              <span className="ap-main-user-name">{currentStaff?.name || user?.email}</span>
              <span className="ap-main-user-meta">{company.slug}</span>
            </div>
            <span className={`ap-role-pill ${role}`}>{ROLE_LABELS[role] || role}</span>
          </div>
          <div className="ap-main-actions">
            {isOwnerAdmin && (
              <button
                type="button"
                className="ap-icon-btn"
                onClick={() => setConfirmHome(true)}
                title="Back to mode select"
              >
                <House size={18} strokeWidth={2} />
              </button>
            )}
            <button
              type="button"
              className="ap-icon-btn"
              onClick={() => setConfirmLogout(true)}
              title="Sign out"
            >
              <LogOut size={18} strokeWidth={2} />
            </button>
          </div>
        </header>

        <div className="adm-dash-mobile-tabs ap-mobile-tab-fallback">
          <CustomSelect
            value={tab}
            onChange={setTab}
            options={tabOptions}
          />
        </div>

        <main className="ap-main-scroll">
        {tab === 'drops' && (
          <DropsPanel
            company={company}
            currentStaff={currentStaff}
            isAdmin={isAdmin}
            onAddCashier={handleAddCashier}
            navigate={navigate}
          />
        )}
        {tab === 'analytics' && isAdmin && <AnalyticsPanel companyId={company.id} />}
        {tab === 'staff' && isAdmin && (
          <StaffPanel
            company={company}
            openAddRequest={staffAddRequest}
            onOnboardingAddSuccess={handleOnboardingAddSuccess}
          />
        )}
        {tab === 'audit' && isOwner && (
          <AuditLogPanel company={company} />
        )}
        {tab === 'settings' && isOwner && (
          <div className="admin-panel ap-settings">
            <div className="admin-panel-header">
              <h2>Company Settings</h2>
            </div>
            {settingsError && (
              <div className="admin-error admin-error-inline">
                {settingsError}
                <button type="button" className="admin-btn-sm" onClick={() => setSettingsError(null)}>Dismiss</button>
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

            <div className="admin-settings-card settings-billing-card">
              <div className="admin-settings-row">
                <div className="admin-settings-label">Billing</div>
                <div className="admin-settings-value-col">
                  <div className="settings-billing-meta">
                    <span className="settings-billing-row-label">Plan</span>
                    <strong>{planName}</strong>
                  </div>
                  <div className="settings-billing-meta">
                    <span className="settings-billing-row-label">Status</span>
                    <strong className={company?.subscription_status === 'active' || company?.subscription_status === 'trialing' ? 'status-active' : 'status-inactive'}>
                      {subscriptionStatusLabel}
                    </strong>
                  </div>
                  <div className="settings-billing-meta">
                    <span className="settings-billing-row-label">Renews</span>
                    <strong>{renewalLabel}</strong>
                  </div>
                  <div className="settings-billing-meta">
                    <span className="settings-billing-row-label">Seat limit</span>
                    <strong>{(company?.seat_limit ?? 0) === -1 ? 'Unlimited' : (company?.seat_limit ?? 0)}</strong>
                  </div>
                </div>
              </div>

              <div className="admin-settings-actions">
                <button
                  type="button"
                  className="admin-submit"
                  onClick={handleManageBilling}
                  disabled={billingLoading || !company?.stripe_customer_id}
                >
                  <i className={`fa-solid ${billingLoading ? 'fa-circle-notch fa-spin' : 'fa-arrow-up-right-from-square'}`} />
                  {billingLoading ? 'Opening Stripe...' : 'Manage Billing'}
                </button>
              </div>

              <div className="admin-billing-trust">
                <i className="fa-solid fa-shield-halved" />
                <span>Billing runs securely through Stripe. We never see your card details.</span>
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
                    <div className="admin-error admin-billing-manage-mt">{settingsError}</div>
                  )}
                  <div className="admin-settings-actions">
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
                      type="button"
                      className="admin-btn-sm"
                      onClick={() => { setConfirmDelete(false); setDeleteSlug(''); }}
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
