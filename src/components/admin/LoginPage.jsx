import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';

const MODE_CONTENT = {
  login: {
    label: 'Cash control for real-world operators',
    title: 'Sign in and get back to the floor.',
    copy: 'Access your workspace with your company email.',
    submitLabel: 'Open workspace',
    switchPrompt: 'Need access?',
    switchAction: 'Create workspace',
  },
  signup: {
    label: 'Cash control for real-world operators',
    title: 'Create the workspace once. Run every shift from it.',
    copy: 'Set up the company, owner PIN, and shared device link.',
    submitLabel: 'Create workspace',
    switchPrompt: 'Already have access?',
    switchAction: 'Sign in',
  },
};

export function LoginPage({ navigate }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [ownerPin, setOwnerPin] = useState('');
  const [message, setMessage] = useState(null);
  const [resetSent, setResetSent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const { signIn, signUp, loading, error, clearError } = useAuthStore();

  // Parse URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get('mode');
    if (urlMode === 'signup' || urlMode === 'login') {
      setMode(urlMode);
    }
  }, []);

  const content = MODE_CONTENT[mode];

  const slugify = (val) =>
    val
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

  const resetFeedback = () => {
    clearError();
    setMessage(null);
    setFieldErrors({});
    setResetSent(false);
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    resetFeedback();
  };

  const validate = () => {
    const errs = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) errs.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      errs.email = 'Enter a valid email.';
    }

    if (!password) errs.password = 'Password is required.';
    else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (mode === 'signup') {
      if (!companyName.trim()) errs.companyName = 'Company name is required.';
      if (!companySlug.trim()) errs.companySlug = 'Slug is required.';
      else if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(companySlug)) {
        errs.companySlug = '3-50 chars: lowercase letters, numbers, hyphens.';
      }
      if (!ownerPin || ownerPin.length < 4) {
        errs.ownerPin = 'PIN must be at least 4 digits.';
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setMessage(null);

    if (!validate()) return;

    const normalizedEmail = email.trim();

    if (mode === 'login') {
      const result = await signIn(normalizedEmail, password);
      if (result.success) navigate('/pathway');
      return;
    }

    const result = await signUp(
      normalizedEmail,
      password,
      companyName.trim(),
      companySlug,
      ownerPin
    );

    if (result?.error) {
      if (
        result.error.includes('companies_slug_key') ||
        result.error.includes('duplicate key')
      ) {
        setFieldErrors((prev) => ({
          ...prev,
          companySlug: 'This slug is already taken. Try a different one.',
        }));
        return;
      }

      if (
        result.error.toLowerCase().includes('already registered') ||
        result.error.toLowerCase().includes('already been registered')
      ) {
        setFieldErrors((prev) => ({
          ...prev,
          email: 'This email is already registered. Try logging in instead.',
        }));
        return;
      }
    }

    if (result?.needsConfirmation) {
      switchMode('login');
      setMessage('Check your email to confirm the account, then sign in.');
    } else if (result?.success) {
      navigate('/pathway');
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setFieldErrors((prev) => ({
        ...prev,
        email: 'Enter your email first.',
      }));
      setMessage(null);
      return;
    }

    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      setFieldErrors((prev) => ({
        ...prev,
        email: 'Enter a valid email first.',
      }));
      setMessage(null);
      return;
    }

    setMessage(null);

    const { error: resetErr } = await (
      await import('../../lib/supabase.js')
    ).supabase.auth.resetPasswordForEmail(normalizedEmail);

    if (resetErr) setMessage(resetErr.message);
    else {
      setResetSent(true);
      setMessage('Password reset email sent. Check your inbox.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-glow login-glow-a" />
      <div className="login-glow login-glow-b" />
      
      <button 
        className="login-back-btn" 
        onClick={() => navigate('/')}
        aria-label="Go back"
      >
        <i className="fa-solid fa-arrow-left" />
        <span>Back</span>
      </button>

      <div className="login-container">
        <div className="login-brand">
          <div className="login-brand-icon">
            <img src="/favicon.svg" alt="Stakd" width="28" height="28" />
          </div>
          <span className="login-brand-name">stakd</span>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <span className="login-eyebrow">{content.label}</span>
            <h1 className="login-title">{content.title}</h1>
            <p className="login-subtitle">{content.copy}</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className={`login-field${fieldErrors.email ? ' has-error' : ''}`}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setResetSent(false);
                  setFieldErrors((prev) => ({ ...prev, email: null }));
                }}
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                autoFocus
                placeholder="you@company.com"
                aria-invalid={fieldErrors.email ? 'true' : 'false'}
                aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
              />
              {fieldErrors.email && (
                <span className="login-field-error" id="login-email-error">
                  {fieldErrors.email}
                </span>
              )}
            </div>

            <div className={`login-field${fieldErrors.password ? ' has-error' : ''}`}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: null }));
                }}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                minLength={6}
                aria-invalid={fieldErrors.password ? 'true' : 'false'}
                aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
              />
              {fieldErrors.password && (
                <span className="login-field-error" id="login-password-error">
                  {fieldErrors.password}
                </span>
              )}
            </div>

            {mode === 'signup' && (
              <>
                <div className={`login-field${fieldErrors.companyName ? ' has-error' : ''}`}>
                  <label htmlFor="companyName">Company Name</label>
                  <input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(e) => {
                      const nextCompanyName = e.target.value;
                      const previousAutoSlug = slugify(companyName);
                      setCompanyName(nextCompanyName);
                      setFieldErrors((prev) => ({ ...prev, companyName: null }));
                      if (!companySlug || companySlug === previousAutoSlug) {
                        setCompanySlug(slugify(nextCompanyName));
                      }
                    }}
                    autoComplete="organization"
                    placeholder="Acme Coffee"
                    maxLength={100}
                    aria-invalid={fieldErrors.companyName ? 'true' : 'false'}
                    aria-describedby={fieldErrors.companyName ? 'login-company-name-error' : undefined}
                  />
                  {fieldErrors.companyName && (
                    <span className="login-field-error" id="login-company-name-error">
                      {fieldErrors.companyName}
                    </span>
                  )}
                </div>

                <div className={`login-field${fieldErrors.ownerPin ? ' has-error' : ''}`}>
                  <label htmlFor="ownerPin">Owner PIN</label>
                  <input
                    id="ownerPin"
                    type="password"
                    inputMode="numeric"
                    value={ownerPin}
                    onChange={(e) => {
                      setOwnerPin(e.target.value.replace(/\D/g, '').slice(0, 8));
                      setFieldErrors((prev) => ({ ...prev, ownerPin: null }));
                    }}
                    autoComplete="off"
                    placeholder="4 digits"
                    maxLength={8}
                    aria-invalid={fieldErrors.ownerPin ? 'true' : 'false'}
                    aria-describedby={fieldErrors.ownerPin ? 'login-owner-pin-error' : undefined}
                  />
                  {fieldErrors.ownerPin && (
                    <span className="login-field-error" id="login-owner-pin-error">
                      {fieldErrors.ownerPin}
                    </span>
                  )}
                </div>

                <div className={`login-field${fieldErrors.companySlug ? ' has-error' : ''}`}>
                  <label htmlFor="companySlug">Company Slug</label>
                  <div className="login-slug-wrap">
                    <span className="login-slug-prefix">stakd.cash/</span>
                    <input
                      id="companySlug"
                      type="text"
                      value={companySlug}
                      onChange={(e) => {
                        setCompanySlug(slugify(e.target.value));
                        setFieldErrors((prev) => ({ ...prev, companySlug: null }));
                      }}
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="acme-coffee"
                      maxLength={50}
                      aria-invalid={fieldErrors.companySlug ? 'true' : 'false'}
                      aria-describedby={fieldErrors.companySlug ? 'login-company-slug-error' : undefined}
                    />
                  </div>
                  {fieldErrors.companySlug && (
                    <span className="login-field-error" id="login-company-slug-error">
                      {fieldErrors.companySlug}
                    </span>
                  )}
                </div>
              </>
            )}

            {(error || message) && (
              <div className="login-feedback" aria-live="polite">
                {error && (
                  <div className="login-error" role="alert">
                    <i className="fa-solid fa-circle-exclamation" />
                    {error}
                  </div>
                )}
                {message && (
                  <div className="login-message" role="status">
                    <i className="fa-solid fa-circle-check" />
                    {message}
                  </div>
                )}
              </div>
            )}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
                <span className="login-loading">
                  <i className="fa-solid fa-circle-notch fa-spin" />
                  Please wait...
                </span>
              ) : (
                <>
                  <span>{content.submitLabel}</span>
                  <i className="fa-solid fa-arrow-right" />
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            {mode === 'login' && (
              <button
                type="button"
                className="login-text-btn"
                onClick={handlePasswordReset}
                disabled={resetSent || loading}
              >
                {resetSent ? 'Reset link sent' : 'Forgot password?'}
              </button>
            )}

            <p className="login-switch">
              <span>{content.switchPrompt}</span>
              <button
                type="button"
                className="login-link"
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              >
                {content.switchAction}
              </button>
            </p>
          </div>
        </div>

        <div className="login-proof">
          <div className="login-proof-pill">
            <strong>2 hrs</strong>
            <span>saved per week on drawer audits</span>
          </div>
          <div className="login-proof-pill">
            <strong>Real-time</strong>
            <span>alerts when cash goes missing</span>
          </div>
          <div className="login-proof-pill">
            <strong>Zero</strong>
            <span>disputes with timestamped proof</span>
          </div>
        </div>
      </div>
    </div>
  );
}
