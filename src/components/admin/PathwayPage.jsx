import React, { useCallback } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';

export function PathwayPage({ navigate, replaceNavigate }) {
  const { company, staff, user, loading, signOut } = useAuthStore();

  const handleSignOut = useCallback(async () => {
    await signOut();
    replaceNavigate('/login');
  }, [signOut, replaceNavigate]);

  if (loading) {
    return (
      <div className="admin-view">
        <div className="admin-loading">
          <div className="admin-spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="admin-view">
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

  return (
    <div className="admin-view">
      <div className="admin-mode-page">
        <div className="admin-mode-card">
          <div className="admin-mode-logo">
            <img src="/favicon.png" alt="stakd" width="56" height="56" />
            <h1>{company.name}</h1>
            <p>How would you like to use this device?</p>
          </div>
          <div className="admin-mode-options">
            <button className="admin-mode-btn primary" onClick={() => navigate('/admin')}>
              <div className="admin-mode-btn-icon">
                <i className="fa-solid fa-chart-line" />
              </div>
              <div className="admin-mode-btn-text">
                <span className="admin-mode-btn-title">Manager Dashboard</span>
                <span className="admin-mode-btn-sub">View drops, manage staff & settings</span>
              </div>
              <i className="fa-solid fa-chevron-right" style={{ color: 'var(--t2)', marginLeft: 'auto' }} />
            </button>
            <button className="admin-mode-btn" onClick={() => navigate('/kiosk')}>
              <div className="admin-mode-btn-icon">
                <i className="fa-solid fa-cash-register" />
              </div>
              <div className="admin-mode-btn-text">
                <span className="admin-mode-btn-title">Kiosk Mode</span>
                <span className="admin-mode-btn-sub">PIN entry for cashier drop counting</span>
              </div>
              <i className="fa-solid fa-chevron-right" style={{ color: 'var(--t2)', marginLeft: 'auto' }} />
            </button>
          </div>
          <button className="admin-mode-signout" onClick={handleSignOut}>
            <i className="fa-solid fa-right-from-bracket" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
