import React, { useState, useEffect } from 'react';
import './LoginPage.css';
import { useAuthStore } from '../../store/useAuthStore.js';
import {
  BILLING_PLANS,
  PAID_PLAN_KEYS,
  POST_SIGNUP_CHECKOUT_PLAN_STORAGE_KEY,
} from '../../lib/billing.js';

const SIGNUP_PLAN_ICONS = {
  solo: 'fa-seedling',
  pro: 'fa-briefcase',
  business: 'fa-building',
};

const SIGNUP_STEPS = [
  {
    title: 'Create your account',
    sub: 'Use your work email and a password you will remember.',
  },
  {
    title: 'Set up your workspace',
    sub: 'Name your company and set the owner PIN for manager access.',
  },
  {
    title: 'Choose your plan',
    sub: 'Pick a plan now — checkout through Stripe opens right after you create the workspace.',
  },
];

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
  const [signupStep, setSignupStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [ownerPin, setOwnerPin] = useState('');
  const [selectedPlanKey, setSelectedPlanKey] = useState('pro');
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
    if (nextMode === 'signup') {
      setSignupStep(1);
      setSelectedPlanKey('pro');
    }
    resetFeedback();
  };

  const validateSignupStep1 = () => {
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

    setFieldErrors((prev) => ({
      ...prev,
      email: errs.email ?? null,
      password: errs.password ?? null,
    }));
    return Object.keys(errs).length === 0;
  };

  const validateSignupStep2 = () => {
    const errs = {};
    if (!companyName.trim()) errs.companyName = 'Company name is required.';
    if (!companySlug.trim()) errs.companySlug = 'Slug is required.';
    else if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(companySlug)) {
      errs.companySlug = '3-50 chars: lowercase letters, numbers, hyphens.';
    }
    if (!ownerPin || ownerPin.length < 4) {
      errs.ownerPin = 'PIN must be at least 4 digits.';
    }

    setFieldErrors((prev) => ({
      ...prev,
      companyName: errs.companyName ?? null,
      companySlug: errs.companySlug ?? null,
      ownerPin: errs.ownerPin ?? null,
    }));
    return Object.keys(errs).length === 0;
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

  const goSignupNext = () => {
    if (signupStep === 1) {
      if (!validateSignupStep1()) return;
    } else if (signupStep === 2) {
      if (!validateSignupStep2()) return;
    }
    setSignupStep((s) => Math.min(3, s + 1));
  };

  const goSignupBack = () => {
    setSignupStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setMessage(null);

    if (mode === 'signup' && signupStep < 3) {
      goSignupNext();
      return;
    }

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
      sessionStorage.setItem(
        POST_SIGNUP_CHECKOUT_PLAN_STORAGE_KEY,
        selectedPlanKey
      );
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
    helper = null,
    inputProps,
  }) => {
    const hintId = helper ? `${id}-hint` : null;
    const describedBy =
      [error ? errorId : null, hintId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={`sk-field${error ? ' has-error' : ''}`}>
        <label htmlFor={id}>{label}</label>
        {prefix ? (
          <div className="login-slug-wrap">
            <span className="login-slug-prefix">{prefix}</span>
            <input
              id={id}
              {...inputProps}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={describedBy}
            />
          </div>
        ) : (
          <input
            id={id}
            className="sk-input"
            {...inputProps}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={describedBy}
          />
        )}
        {helper && !error && (
          <p className="sk-field-hint" id={hintId}>
            {helper}
          </p>
        )}
        {error && (
          <span className="sk-field-error" id={errorId}>
            {error}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="login-page sk-page-full stakd-pattern-bg">
      <button
        type="button"
        className="sk-back-btn sk-back-btn--fixed"
        onClick={() => navigate('/')}
        aria-label="Go back"
      >
        <i className="fa-solid fa-arrow-left" />
        <span>Back</span>
      </button>

      <div className="sk-auth-container">
        <div className="sk-auth-logo">
          <img src="/src/stakd-logo-text.svg" alt="stakd" height="35" />
        </div>

        <div className="sk-auth-card">
          {mode === 'signup' ? (
            <>
              <div className="sk-stepper" aria-label="Sign up progress">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className={`sk-stepper-step${
                      signupStep === n ? ' is-active' : ''
                    }${signupStep > n ? ' is-complete' : ''}`}
                    aria-current={signupStep === n ? 'step' : undefined}
                  >
                    <span className="sk-stepper-dot" aria-hidden="true">
                      {signupStep > n ? (
                        <i className="fa-solid fa-check" />
                      ) : (
                        n
                      )}
                    </span>
                    <span className="sk-stepper-label">Step {n}</span>
                  </div>
                ))}
              </div>
              <div className="sk-auth-card-header">
                <span className="sk-company-label">Step {signupStep} of 3</span>
                <h1 className="sk-auth-heading">
                  {SIGNUP_STEPS[signupStep - 1].title}
                </h1>
                <p className="sk-auth-subtext">
                  {SIGNUP_STEPS[signupStep - 1].sub}
                </p>
              </div>
            </>
          ) : (
            <div className="sk-auth-card-header">
              <span className="sk-company-label">{content.label}</span>
              <h1 className="sk-auth-heading">{content.title}</h1>
              <p className="sk-auth-subtext">{content.copy}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="sk-auth-form" noValidate>
            {mode === 'login' && (
              <>
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
                    autoComplete: 'current-password',
                    placeholder: 'Enter password',
                    minLength: 6,
                  },
                })}

                {(error || message) && (
                  <div className="sk-alert-stack" aria-live="polite">
                    {error && (
                      <div className="sk-error" role="alert">
                        <i className="fa-solid fa-circle-exclamation" />
                        {error}
                      </div>
                    )}
                    {message && (
                      <div className="sk-success" role="status">
                        <i className="fa-solid fa-circle-check" />
                        {message}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="sk-btn sk-btn-primary sk-btn-lg login-submit"
                  disabled={loading}
                >
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
              </>
            )}

            {mode === 'signup' && (
              <div className="sk-step-panel is-active" key={signupStep}>
                {signupStep === 1 && (
                  <>
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
                        autoComplete: 'new-password',
                        placeholder: 'Enter password',
                        minLength: 6,
                      },
                    })}
                  </>
                )}

                {signupStep === 2 && (
                  <>
                    {renderField({
                      id: 'companyName',
                      label: 'Company name',
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
                        autoFocus: true,
                      },
                    })}

                    <div
                      className={`sk-field signup-slug-preview${
                        fieldErrors.companySlug ? ' has-error' : ''
                      }`}
                    >
                      <span className="signup-slug-preview-label">Workspace URL</span>
                      <div
                        className="signup-slug-preview-box"
                        aria-live="polite"
                        id="signup-slug-preview"
                      >
                        <span className="signup-slug-prefix">stakd.cash/</span>
                        <span
                          className={
                            companySlug ? 'signup-slug-value' : 'signup-slug-placeholder'
                          }
                        >
                          {companySlug || 'your-workspace'}
                        </span>
                      </div>
                      {fieldErrors.companySlug && (
                        <span
                          className="sk-field-error"
                          id="login-company-slug-error"
                        >
                          {fieldErrors.companySlug}
                        </span>
                      )}
                    </div>

                    {renderField({
                      id: 'ownerPin',
                      label: 'Owner PIN',
                      errorId: 'login-owner-pin-error',
                      error: fieldErrors.ownerPin,
                      helper:
                        'This 4-digit PIN gives you manager access on any device.',
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
                  </>
                )}

                {signupStep === 3 && (
                  <>
                    <div
                      className="signup-plan-list"
                      role="radiogroup"
                      aria-label="Choose a plan"
                    >
                      {PAID_PLAN_KEYS.map((planKey) => {
                        const plan = BILLING_PLANS[planKey];
                        const selected = selectedPlanKey === planKey;
                        const isPrimary = planKey === 'pro';
                        return (
                          <button
                            key={planKey}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            className={`signup-plan-option${
                              selected ? ' is-selected' : ''
                            }${isPrimary ? ' is-primary' : ''}`}
                            onClick={() => setSelectedPlanKey(planKey)}
                          >
                            <div className="signup-plan-option-icon">
                              <i
                                className={`fa-solid ${
                                  SIGNUP_PLAN_ICONS[planKey] || 'fa-star'
                                }`}
                              />
                            </div>
                            <div className="signup-plan-option-text">
                              <span className="signup-plan-option-title">
                                {plan.name} — {plan.priceLabel}
                              </span>
                              <span className="signup-plan-option-sub">
                                {plan.seatLimit === -1
                                  ? 'Unlimited seats'
                                  : `Up to ${plan.seatLimit} seats`}
                                {' · '}
                                {plan.summary}
                              </span>
                            </div>
                            <span
                              className={`signup-plan-check${
                                selected ? ' is-on' : ''
                              }`}
                              aria-hidden="true"
                            >
                              <i className="fa-solid fa-circle-check" />
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="sk-callout-note">
                      <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                      Payment is processed securely through Stripe after your workspace is
                      created.
                    </p>
                  </>
                )}
              </div>
            )}

            {mode === 'signup' && (error || message) && (
              <div className="sk-alert-stack" aria-live="polite">
                {error && (
                  <div className="sk-error" role="alert">
                    <i className="fa-solid fa-circle-exclamation" />
                    {error}
                  </div>
                )}
                {message && (
                  <div className="sk-success" role="status">
                    <i className="fa-solid fa-circle-check" />
                    {message}
                  </div>
                )}
              </div>
            )}

            {mode === 'signup' && signupStep === 1 && (
              <button
                type="submit"
                className="sk-btn sk-btn-primary sk-btn-lg login-submit"
                disabled={loading}
              >
                <span>Next</span>
                <i className="fa-solid fa-arrow-right" />
              </button>
            )}

            {mode === 'signup' && signupStep === 2 && (
              <div className="sk-nav-actions">
                <button
                  type="button"
                  className="sk-btn sk-btn-secondary sk-btn-lg signup-btn-secondary"
                  onClick={goSignupBack}
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="sk-btn sk-btn-primary sk-btn-lg login-submit signup-nav-primary"
                  disabled={loading}
                >
                  <span>Next</span>
                  <i className="fa-solid fa-arrow-right" />
                </button>
              </div>
            )}

            {mode === 'signup' && signupStep === 3 && (
              <div className="sk-nav-actions">
                <button
                  type="button"
                  className="sk-btn sk-btn-secondary sk-btn-lg signup-btn-secondary"
                  onClick={goSignupBack}
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="sk-btn sk-btn-primary sk-btn-lg login-submit signup-nav-primary"
                  disabled={loading}
                >
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
              </div>
            )}
          </form>

          <div className="sk-auth-footer">
            {mode === 'login' && (
              <button
                type="button"
                className="sk-text-btn"
                onClick={handlePasswordReset}
                disabled={resetSent || loading}
              >
                {resetSent ? 'Reset link sent' : 'Forgot password?'}
              </button>
            )}

            <p className="sk-link-row">
              <span>{content.switchPrompt}</span>
              <button
                type="button"
                className="sk-text-link"
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
