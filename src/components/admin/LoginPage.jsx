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

  useEffect(() => {
    const params = new window.URLSearchParams(window.location.search);
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
      navigate('/onboarding?step=plan');
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

  const renderField = ({
    id,
    label,
    errorId,
    error,
    prefix = null,
    inputProps,
  }) => (
    <div className={`login-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {prefix ? (
        <div className="login-slug-wrap">
          <span className="login-slug-prefix">{prefix}</span>
          <input
            id={id}
            {...inputProps}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
      ) : (
        <input
          id={id}
          {...inputProps}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : undefined}
        />
      )}
      {error && (
        <span className="login-field-error" id={errorId}>
          {error}
        </span>
      )}
    </div>
  );

  return (
    <div className="login-page">
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
            {renderField({
              id: 'email',
              label: 'Email',
              errorId: 'login-email-error',
              error: fieldErrors.email,
              inputProps: {
                type: 'email',
                value: email,
                onChange: (e) => {
                  setEmail(e.target.value);
                  setResetSent(false);
                  setFieldErrors((prev) => ({ ...prev, email: null }));
                },
                autoComplete: 'email',
                autoCapitalize: 'none',
                autoCorrect: 'off',
                spellCheck: false,
                inputMode: 'email',
                autoFocus: true,
                placeholder: 'you@company.com',
              },
            })}

            {renderField({
              id: 'password',
              label: 'Password',
              errorId: 'login-password-error',
              error: fieldErrors.password,
              inputProps: {
                type: 'password',
                value: password,
                onChange: (e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: null }));
                },
                autoComplete: mode === 'login' ? 'current-password' : 'new-password',
                placeholder: 'Enter password',
                minLength: 6,
              },
            })}

            {mode === 'signup' && (
              <>
                {renderField({
                  id: 'companyName',
                  label: 'Company Name',
                  errorId: 'login-company-name-error',
                  error: fieldErrors.companyName,
                  inputProps: {
                    type: 'text',
                    value: companyName,
                    onChange: (e) => {
                      const nextCompanyName = e.target.value;
                      const previousAutoSlug = slugify(companyName);
                      setCompanyName(nextCompanyName);
                      setFieldErrors((prev) => ({ ...prev, companyName: null }));
                      if (!companySlug || companySlug === previousAutoSlug) {
                        setCompanySlug(slugify(nextCompanyName));
                      }
                    },
                    autoComplete: 'organization',
                    placeholder: 'Acme Coffee',
                    maxLength: 100,
                  },
                })}

                {renderField({
                  id: 'ownerPin',
                  label: 'Owner PIN',
                  errorId: 'login-owner-pin-error',
                  error: fieldErrors.ownerPin,
                  inputProps: {
                    type: 'password',
                    inputMode: 'numeric',
                    value: ownerPin,
                    onChange: (e) => {
                      setOwnerPin(e.target.value.replace(/\D/g, '').slice(0, 8));
                      setFieldErrors((prev) => ({ ...prev, ownerPin: null }));
                    },
                    autoComplete: 'off',
                    placeholder: '4 digits',
                    maxLength: 8,
                  },
                })}

                {renderField({
                  id: 'companySlug',
                  label: 'Company Slug',
                  errorId: 'login-company-slug-error',
                  error: fieldErrors.companySlug,
                  prefix: 'stakd.cash/',
                  inputProps: {
                    type: 'text',
                    value: companySlug,
                    onChange: (e) => {
                      setCompanySlug(slugify(e.target.value));
                      setFieldErrors((prev) => ({ ...prev, companySlug: null }));
                    },
                    autoComplete: 'off',
                    autoCapitalize: 'none',
                    autoCorrect: 'off',
                    spellCheck: false,
                    placeholder: 'acme-coffee',
                    maxLength: 50,
                  },
                })}
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
      </div>
    </div>
  );
}
