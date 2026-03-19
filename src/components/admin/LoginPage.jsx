import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';

export function LoginPage({ navigate }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [ownerPin, setOwnerPin] = useState('');
  const [message, setMessage] = useState(null);

  const [resetSent, setResetSent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const { signIn, signUp, loading, error, clearError } = useAuthStore();

  const slugify = (val) =>
    val
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email.';
    if (!password) errs.password = 'Password is required.';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters.';
    if (mode === 'signup') {
      if (!companyName.trim()) errs.companyName = 'Company name is required.';
      if (!companySlug.trim()) errs.companySlug = 'Slug is required.';
      else if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(companySlug)) errs.companySlug = '3-50 chars: lowercase letters, numbers, hyphens.';
      if (!ownerPin || ownerPin.length < 4) errs.ownerPin = 'PIN must be at least 4 digits.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setMessage(null);

    if (!validate()) return;

    if (mode === 'login') {
      const result = await signIn(email, password);
      if (result.success) {
        navigate('/pathway');
      }
    } else {
      const result = await signUp(email, password, companyName.trim(), companySlug, ownerPin);
      if (result?.error) {
        // Friendly message for duplicate slug
        if (result.error.includes('companies_slug_key') || result.error.includes('duplicate key')) {
          setFieldErrors((prev) => ({ ...prev, companySlug: 'This slug is already taken. Try a different one.' }));
          return;
        }
        // Friendly message for already-registered email
        if (result.error.toLowerCase().includes('already registered') || result.error.toLowerCase().includes('already been registered')) {
          setFieldErrors((prev) => ({ ...prev, email: 'This email is already registered. Try logging in instead.' }));
          return;
        }
      }
      if (result?.needsConfirmation) {
        setMessage('Check your email to confirm your account, then log in.');
        setMode('login');
      } else if (result?.success) {
        navigate('/pathway');
      }
    }
  };

  return (
    <div className="admin-auth-page">
      <div className="admin-auth-card">
        <button className="pin-back-btn" onClick={() => navigate('/')}>
          <i className="fa-solid fa-arrow-left" /> Back to home
        </button>
        <div className="admin-auth-logo">
          <img src="/favicon.png" alt="stakd" width="48" height="48" />
          <h1>stakd</h1>
        </div>

        <div className="admin-auth-tabs">
          <button
            className={`admin-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => { setMode('login'); clearError(); setMessage(null); }}
          >
            Log In
          </button>
          <button
            className={`admin-tab${mode === 'signup' ? ' active' : ''}`}
            onClick={() => { setMode('signup'); clearError(); setMessage(null); }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="admin-auth-form" noValidate>
          <label className={`admin-field${fieldErrors.email ? ' field-error' : ''}`}>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: null })); }}
              autoComplete="email"
              placeholder="you@company.com"
            />
            {fieldErrors.email && <span className="admin-field-err">{fieldErrors.email}</span>}
          </label>

          <label className={`admin-field${fieldErrors.password ? ' field-error' : ''}`}>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: null })); }}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
            />
            {fieldErrors.password && <span className="admin-field-err">{fieldErrors.password}</span>}
          </label>

          {mode === 'login' && (
            <button
              type="button"
              className="admin-forgot-link"
              onClick={async () => {
                if (!email) { setMessage('Enter your email first.'); return; }
                setMessage(null);
                const { error: resetErr } = await (await import('../../lib/supabase.js')).supabase.auth.resetPasswordForEmail(email);
                if (resetErr) setMessage(resetErr.message);
                else { setResetSent(true); setMessage('Password reset email sent. Check your inbox.'); }
              }}
              disabled={resetSent}
            >
              {resetSent ? 'Reset email sent' : 'Forgot password?'}
            </button>
          )}

          {mode === 'signup' && (
            <>
              <label className={`admin-field${fieldErrors.companyName ? ' field-error' : ''}`}>
                <span>Company Name</span>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    setFieldErrors((p) => ({ ...p, companyName: null }));
                    if (!companySlug || companySlug === slugify(companyName)) {
                      setCompanySlug(slugify(e.target.value));
                    }
                  }}
                  placeholder="Acme Coffee"
                  maxLength={100}
                />
                {fieldErrors.companyName && <span className="admin-field-err">{fieldErrors.companyName}</span>}
              </label>
              <label className={`admin-field${fieldErrors.ownerPin ? ' field-error' : ''}`}>
                <span>Your PIN (4+ digits)</span>
                <input
                  type="password"
                  inputMode="numeric"
                  value={ownerPin}
                  onChange={(e) => { setOwnerPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setFieldErrors((p) => ({ ...p, ownerPin: null })); }}
                  placeholder="••••"
                  maxLength={8}
                />
                {fieldErrors.ownerPin && <span className="admin-field-err">{fieldErrors.ownerPin}</span>}
              </label>
              <label className={`admin-field${fieldErrors.companySlug ? ' field-error' : ''}`}>
                <span>Company Slug</span>
                <div className="admin-slug-preview">
                  <span className="admin-slug-prefix">stakd.cash/</span>
                  <input
                    type="text"
                    value={companySlug}
                    onChange={(e) => { setCompanySlug(slugify(e.target.value)); setFieldErrors((p) => ({ ...p, companySlug: null })); }}
                    placeholder="acme-coffee"
                    maxLength={50}
                  />
                </div>
                {fieldErrors.companySlug && <span className="admin-field-err">{fieldErrors.companySlug}</span>}
              </label>
            </>
          )}

          {error && <div className="admin-error">{error}</div>}
          {message && <div className="admin-message">{message}</div>}

          <button
            type="submit"
            className="admin-submit"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Log In'
                : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
