import React, { useCallback } from 'react';
import './PathwayPage.css';
import { useAuthStore } from '../../store/useAuthStore.js';

export function PathwayPage({ navigate, replaceNavigate }) {
  const { company, staff, user, loading, signOut } = useAuthStore();

  const handleSignOut = useCallback(async () => {
    await signOut();
    replaceNavigate('/login');
  }, [signOut, replaceNavigate]);

  if (loading) {
    return (
      <div className="pathway-page sk-page-full">
        <div className="sk-auth-container">
          <div className="pathway-loading">
            <i className="fa-solid fa-circle-notch fa-spin" />
            <span>Loading workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="pathway-page sk-page-full">
        <div className="sk-auth-container">
          <div className="sk-auth-logo">
            <img src="/src/stakd-logo-text.svg" alt="stakd" height="35" />
          </div>
          <div className="sk-auth-card">
            <div className="sk-auth-card-header">
              <h1 className="sk-auth-heading">No workspace found</h1>
              <p className="sk-auth-subtext">
                You haven&apos;t created or joined a company yet.
              </p>
            </div>
            <button
              type="button"
              className="sk-btn sk-btn-primary sk-btn-lg pathway-submit"
              onClick={() => navigate('/login')}
            >
              <span>Go to Login</span>
              <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pathway-page sk-page-full">
      <div className="sk-auth-container">
        <div className="sk-auth-logo">
          <img src="/src/stakd-logo-text.svg" alt="stakd" height="35" />
        </div>

        <div className="sk-auth-card">
          <div className="sk-auth-card-header">
            <span className="sk-company-label">{company.name}</span>
            <h1 className="sk-auth-heading">How should this device work?</h1>
            <p className="sk-auth-subtext">
              Choose a mode to get started with your shift.
            </p>
          </div>

          <div className="pathway-options">
            <button
              type="button"
              className="pathway-option pathway-option-primary"
              onClick={() => navigate('/admin')}
            >
              <div className="pathway-option-icon">
                <i className="fa-solid fa-chart-line" />
              </div>
              <div className="pathway-option-text">
                <span className="pathway-option-title">Manager Dashboard</span>
                <span className="pathway-option-sub">
                  View drops, manage staff & settings
                </span>
              </div>
              <i className="fa-solid fa-arrow-right pathway-option-arrow" />
            </button>
            <button
              type="button"
              className="pathway-option"
              onClick={() => navigate('/kiosk')}
            >
              <div className="pathway-option-icon">
                <i className="fa-solid fa-cash-register" />
              </div>
              <div className="pathway-option-text">
                <span className="pathway-option-title">Kiosk Mode</span>
                <span className="pathway-option-sub">
                  PIN entry for cashier drop counting
                </span>
              </div>
              <i className="fa-solid fa-arrow-right pathway-option-arrow" />
            </button>
          </div>
        </div>

        <div className="pathway-footer">
          <button type="button" className="pathway-signout" onClick={handleSignOut}>
            <i className="fa-solid fa-right-from-bracket" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
