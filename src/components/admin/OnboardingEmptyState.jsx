import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase.js';
import { hashPin, generateSalt } from '../../store/useAuthStore.js';
import './LoginPage.css';
import './PathwayPage.css';
import './OnboardingEmptyState.css';

const PIN_DIGITS = 4;

function isValidOnboardingPin(pin) {
  return /^\d{4}$/.test(pin);
}

/** DropsPanel unmounts when switching tabs; persist step so "Add cashier" → Staff doesn't reset the flow. */
function onboardingStepKey(companyId) {
  return companyId ? `stakd_onboarding_step:${companyId}` : null;
}

function readStoredStep(companyId) {
  if (typeof sessionStorage === 'undefined' || !companyId) return null;
  try {
    const raw = sessionStorage.getItem(onboardingStepKey(companyId));
    if (raw == null) return null;
    const n = Number.parseInt(raw, 10);
    return n >= 1 && n <= 3 ? n : null;
  } catch {
    return null;
  }
}

function writeStoredStep(companyId, step) {
  const key = onboardingStepKey(companyId);
  if (!key || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(key, String(step));
  } catch {}
}

function clearStoredStep(companyId) {
  const key = onboardingStepKey(companyId);
  if (!key || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

/**
 * Props:
 * - company: company object (for staff creation)
 * - navigate: navigation function
 * - onSkipTutorial: called when tutorial is dismissed (skip setup)
 * - onStaffAdded: called when staff is successfully added (parent can refresh)
 */
export function OnboardingEmptyState({
  company,
  navigate,
  onSkipTutorial,
  onStaffAdded,
}) {
  const [step, setStep] = useState(() => readStoredStep(company?.id) ?? 1); // 1–3; restored after tab changes
  const [cashierName, setCashierName] = useState('');
  const [cashierPin, setCashierPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const nameInputRef = useRef(null);

  // Sync when company loads or changes (other workspace)
  useEffect(() => {
    if (!company?.id) return;
    const stored = readStoredStep(company.id);
    if (stored != null) setStep(stored);
  }, [company?.id]);

  // Persist across tab switches (DropsPanel unmounts when leaving Drops tab)
  useEffect(() => {
    if (!company?.id) return;
    writeStoredStep(company.id, step);
  }, [company?.id, step]);

  const handleSkipSetup = useCallback(() => {
    clearStoredStep(company?.id);
    onSkipTutorial?.();
    navigate('/admin');
  }, [company?.id, onSkipTutorial, navigate]);

  const handleLetsGo = useCallback(() => {
    setCashierPin('');
    setError(null);
    setStep(2);
  }, []);

  const handleSkipStep = useCallback(() => {
    setCashierPin('');
    setStep(3);
  }, []);

  const handleAddCashier = useCallback(
    async (e) => {
      e.preventDefault();
      const name = cashierName.trim();
      if (!name || !isValidOnboardingPin(cashierPin)) return;
      setError(null);
      setLoading(true);

      try {
        const salt = generateSalt();
        const pinHash = await hashPin(cashierPin, salt);

        const { error: insertError } = await supabase.from('staff').insert({
          company_id: company.id,
          name,
          pin_hash: pinHash,
          pin_salt: salt,
          role: 'cashier',
        });

        if (insertError) throw insertError;

        onStaffAdded?.();
        setCashierName('');
        setCashierPin('');
        setStep(3);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [cashierName, cashierPin, company?.id, onStaffAdded]
  );

  const handleGoToKiosk = useCallback(() => {
    clearStoredStep(company?.id);
    onSkipTutorial?.(); // Mark tutorial done so it doesn't show again
    navigate('/kiosk');
  }, [company?.id, navigate, onSkipTutorial]);

  const handleGoToDashboard = useCallback(() => {
    clearStoredStep(company?.id);
    onSkipTutorial?.(); // mark as done so we don't show onboarding again
    navigate('/admin');
  }, [company?.id, onSkipTutorial, navigate]);

  // Auto-focus name when step 2 appears
  useEffect(() => {
    if (step === 2) {
      const t = requestAnimationFrame(() => {
        nameInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(t);
    }
  }, [step]);

  const canSubmitCashier =
    cashierName.trim().length > 0 && isValidOnboardingPin(cashierPin);
  const addButtonLabel = 'Add cashier →';

  const setupProgressLabel =
    step === 2 ? 'Setup step 1 of 2' : step === 3 ? 'Setup step 2 of 2' : undefined;

  const shell = (
    <div
      className="login-page sk-page-full"
      role="dialog"
      aria-modal="true"
      aria-label="First-run setup"
      aria-live="polite"
    >
      <div className="sk-auth-container">
        <div className="sk-auth-logo">
          <img src="/src/stakd-logo-text.svg" alt="stakd" height="35" />
        </div>

        <div className="sk-auth-card">
          {step === 1 ? (
            <>
              <div className="sk-auth-card-header">
                <h1 className="sk-auth-heading">Your first count takes 60 seconds.</h1>
                <p className="sk-auth-subtext">
                  We&apos;ll add one cashier, then walk you through a live drop. You&apos;ll have
                  everything running before you leave this screen.
                </p>
              </div>
              <div className="stakd-onboarding-actions">
                <button type="button" className="sk-btn sk-btn-primary sk-btn-lg stakd-onboarding-primary" onClick={handleLetsGo}>
                  Let&apos;s go →
                </button>
                <button
                  type="button"
                  className="sk-text-btn stakd-onboarding-skip"
                  onClick={handleSkipSetup}
                >
                  Skip setup — I&apos;ll figure it out
                </button>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="sk-auth-card-header">
                {company?.name ? (
                  <span className="sk-company-label">{company.name}</span>
                ) : null}
                <h1 className="sk-auth-heading">Add your first cashier.</h1>
                <p className="sk-auth-subtext">
                  They&apos;ll use a 4-digit PIN to start counting. You can add more from the Staff
                  tab anytime.
                </p>
              </div>
              <form onSubmit={handleAddCashier} className="stakd-onboarding-form">
                <label className="stakd-onboarding-field">
                  <span>Name</span>
                  <input
                    ref={nameInputRef}
                    type="text"
                    placeholder="Cashier name"
                    value={cashierName}
                    onChange={(e) => {
                      setCashierName(e.target.value);
                      setError(null);
                    }}
                    maxLength={100}
                    disabled={loading}
                    autoComplete="name"
                    aria-invalid={!!error}
                    aria-describedby={error ? 'onboarding-add-error' : undefined}
                  />
                </label>
                <label className="stakd-onboarding-field">
                  <span>PIN</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    pattern="[0-9]*"
                    placeholder="4-digit PIN"
                    value={cashierPin}
                    onChange={(e) => {
                      setCashierPin(e.target.value.replace(/\D/g, '').slice(0, PIN_DIGITS));
                      setError(null);
                    }}
                    maxLength={PIN_DIGITS}
                    disabled={loading}
                  />
                </label>
                {error && (
                  <div id="onboarding-add-error" className="admin-error" role="alert">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  className="sk-btn sk-btn-primary sk-btn-lg stakd-onboarding-primary"
                  disabled={!canSubmitCashier || loading}
                >
                  {loading ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    addButtonLabel
                  )}
                </button>
                <button
                  type="button"
                  className="sk-text-btn stakd-onboarding-skip"
                  onClick={handleSkipStep}
                  disabled={loading}
                >
                  Skip — I&apos;ll add staff later
                </button>
              </form>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div className="sk-auth-card-header">
                {company?.name ? (
                  <span className="sk-company-label">{company.name}</span>
                ) : null}
                <h1 className="sk-auth-heading">You&apos;re all set.</h1>
                <p className="sk-auth-subtext">
                  Hand them the phone and they can start counting. Drops will appear in your dashboard
                  the moment they confirm.
                </p>
              </div>
              <div className="pathway-options">
                <button
                  type="button"
                  className="pathway-option pathway-option-primary"
                  onClick={handleGoToKiosk}
                >
                  <div className="pathway-option-icon">
                    <i className="fa-solid fa-mobile-screen" />
                  </div>
                  <div className="pathway-option-text">
                    <span className="pathway-option-title">Go to kiosk mode</span>
                    <span className="pathway-option-sub">
                      Let your cashier count their first drawer now
                    </span>
                  </div>
                  <i className="fa-solid fa-arrow-right pathway-option-arrow" />
                </button>
                <button
                  type="button"
                  className="pathway-option"
                  onClick={handleGoToDashboard}
                >
                  <div className="pathway-option-icon">
                    <i className="fa-solid fa-chart-line" />
                  </div>
                  <div className="pathway-option-text">
                    <span className="pathway-option-title">Go to dashboard</span>
                    <span className="pathway-option-sub">
                      I&apos;ll send them the link separately
                    </span>
                  </div>
                  <i className="fa-solid fa-arrow-right pathway-option-arrow" />
                </button>
              </div>
            </>
          ) : null}
        </div>

        {step === 2 || step === 3 ? (
          <div
            className="stakd-onboarding-dots"
            aria-label={setupProgressLabel}
            role="group"
          >
            <span aria-current={step === 2 ? 'step' : undefined} />
            <span aria-current={step === 3 ? 'step' : undefined} />
          </div>
        ) : null}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(shell, document.body)
    : null;
}
