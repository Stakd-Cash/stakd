import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';
import { hashPin, generateSalt } from '../../store/useAuthStore.js';
import { launchConfetti } from '../../utils/confetti.js';
import './PathwayPage.css';

const TRANSITION_DURATION = 300;
const TRANSITION_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * Generate a random 4-digit PIN for new cashiers.
 * stakd generates it automatically; cashier sets their own on first login.
 */
function generateTempPin() {
  return String(1000 + Math.floor(Math.random() * 9000));
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
  const [step, setStep] = useState(1); // 1 = hook, 2 = add cashier, 3 = success
  const [cashierName, setCashierName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addedName, setAddedName] = useState(null); // name of cashier added, or null if skipped
  const inputRef = useRef(null);

  const handleSkipSetup = useCallback(() => {
    onSkipTutorial?.();
    navigate('/admin');
  }, [onSkipTutorial, navigate]);

  const handleLetsGo = useCallback(() => setStep(2), []);

  const handleSkipStep = useCallback(() => {
    setAddedName(null);
    setStep(3);
  }, []);

  const handleAddCashier = useCallback(
    async (e) => {
      e.preventDefault();
      const name = cashierName.trim();
      if (!name) return;
      setError(null);
      setLoading(true);

      try {
        const tempPin = generateTempPin();
        const salt = generateSalt();
        const pinHash = await hashPin(tempPin, salt);

        const { error: insertError } = await supabase.from('staff').insert({
          company_id: company.id,
          name,
          pin_hash: pinHash,
          pin_salt: salt,
          role: 'cashier',
        });

        if (insertError) throw insertError;

        setAddedName(name);
        onStaffAdded?.();
        setStep(3);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [cashierName, company?.id, onStaffAdded]
  );

  const handleGoToKiosk = useCallback(() => {
    onSkipTutorial?.(); // Mark tutorial done so it doesn't show again
    navigate('/kiosk');
  }, [navigate, onSkipTutorial]);

  const handleGoToDashboard = useCallback(() => {
    onSkipTutorial?.(); // mark as done so we don't show onboarding again
    navigate('/admin');
  }, [onSkipTutorial, navigate]);

  // Auto-focus input when step 2 appears
  useEffect(() => {
    if (step === 2) {
      const t = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(t);
    }
  }, [step]);

  // Confetti on arrival at step 3
  useEffect(() => {
    if (step === 3) {
      launchConfetti({ reduceMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches });
    }
  }, [step]);

  const addButtonLabel = cashierName.trim()
    ? `Add ${cashierName.trim()} →`
    : 'Add cashier →';

  return (
    <div
      className="stakd-onboarding-overlay"
      role="dialog"
      aria-label="First-run setup"
      aria-live="polite"
    >
      <style>{`
        .stakd-onboarding-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: var(--pw-bg, var(--s-base));
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 24px 16px;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .stakd-onboarding-wrapper {
          width: 100%;
          max-width: 460px;
          margin: auto;
          position: relative;
          overflow: hidden;
        }

        .stakd-onboarding-slider {
          display: flex;
          width: 300%;
          transition: transform ${TRANSITION_DURATION}ms ${TRANSITION_EASING};
        }

        .stakd-onboarding-slider.step-1 { transform: translateX(0); }
        .stakd-onboarding-slider.step-2 { transform: translateX(-33.333%); }
        .stakd-onboarding-slider.step-3 { transform: translateX(-66.666%); }

        .stakd-onboarding-screen {
          flex: 0 0 33.333%;
          width: 33.333%;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stakd-onboarding-card {
          width: 100%;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
          border: 1px solid var(--pw-border, rgba(255, 255, 255, 0.08));
          border-radius: 24px;
          padding: clamp(26px, 4vw, 36px) clamp(24px, 4vw, 32px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          backdrop-filter: blur(10px);
        }

        .stakd-onboarding-eyebrow {
          display: block;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--pw-muted, #858585);
          margin-bottom: 12px;
        }

        .stakd-onboarding-title {
          font-family: var(--pw-display, var(--font-display));
          font-size: clamp(1.5rem, 5vw, 2rem);
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.02em;
          color: var(--pw-copy, #e0e0e0);
          margin: 0 0 10px;
        }

        .stakd-onboarding-subtitle {
          font-size: 0.95rem;
          color: var(--pw-muted, #858585);
          line-height: 1.55;
          margin: 0 0 24px;
        }

        .stakd-onboarding-actions {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 14px;
        }

        .stakd-onboarding-skip-btn {
          background: transparent;
          border: none;
          color: var(--pw-muted, #858585);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          padding: 6px 0;
          transition: color 0.2s ease;
        }

        .stakd-onboarding-skip-btn:hover {
          color: var(--pw-copy, #ccc);
        }

        .stakd-onboarding-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .stakd-onboarding-input {
          min-height: 52px;
          width: 100%;
          box-sizing: border-box;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--pw-border, rgba(255, 255, 255, 0.08));
          border-radius: 14px;
          padding: 14px 18px;
          font-size: 1rem;
          color: var(--pw-copy, #e0e0e0);
          transition: border-color 0.2s ease, background 0.2s ease;
        }

        .stakd-onboarding-input::placeholder {
          color: var(--pw-muted, #858585);
          opacity: 0.7;
        }

        .stakd-onboarding-input:focus {
          outline: none;
          border-color: var(--pw-accent, #de7356);
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 0 0 3px rgba(222, 115, 86, 0.15);
        }

        .stakd-onboarding-error {
          font-size: 0.85rem;
          color: var(--status-danger, #f44747);
          margin-top: -4px;
        }

        .stakd-onboarding-submit {
          height: 52px;
          background: var(--pw-accent, #de7356);
          border: none;
          border-radius: 14px;
          color: #fff;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: transform 0.2s ease, opacity 0.2s ease;
          width: 100%;
        }

        .stakd-onboarding-submit:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .stakd-onboarding-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .stakd-onboarding-step-indicator {
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--pw-muted, #858585);
          margin-bottom: 18px;
        }

        .stakd-onboarding-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 8px;
        }

        .stakd-onboarding-option {
          width: 100%;
          min-height: 72px;
          padding: 18px 20px;
          border: 1px solid var(--pw-border, rgba(255, 255, 255, 0.08));
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          color: var(--pw-copy, #e0e0e0);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 16px;
          text-align: left;
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .stakd-onboarding-option:hover {
          border-color: rgba(222, 115, 86, 0.35);
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-2px);
        }

        .stakd-onboarding-option-primary {
          border-color: rgba(222, 115, 86, 0.3);
          background: var(--pw-accent-soft, rgba(222, 115, 86, 0.12));
        }

        .stakd-onboarding-option-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: var(--pw-accent, #de7356);
          flex-shrink: 0;
        }

        .stakd-onboarding-option-primary .stakd-onboarding-option-icon {
          background: var(--pw-accent, #de7356);
          color: #fff;
        }

        .stakd-onboarding-option-text {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
        }

        .stakd-onboarding-option-title {
          font-size: 1rem;
          font-weight: 700;
        }

        .stakd-onboarding-option-sub {
          font-size: 0.8rem;
          color: var(--pw-muted, #858585);
          font-weight: 500;
        }

        html[data-theme='light'] .stakd-onboarding-card {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08);
        }

        html[data-theme='light'] .stakd-onboarding-input {
          background: rgba(0, 0, 0, 0.04);
        }

        html[data-theme='light'] .stakd-onboarding-option {
          background: rgba(255, 255, 255, 0.6);
        }

        @media (prefers-reduced-motion: reduce) {
          .stakd-onboarding-slider {
            transition: none;
          }
        }
      `}</style>

      <div className="stakd-onboarding-wrapper">
        <div className={`stakd-onboarding-slider step-${step}`}>
          {/* Screen 1 — Hook */}
          <div className="stakd-onboarding-screen">
            <div className="stakd-onboarding-card">
              <h2 className="stakd-onboarding-title">
                Your first count takes 60 seconds.
              </h2>
              <p className="stakd-onboarding-subtitle">
                We'll add one cashier, then walk you through a live drop. You'll have everything
                running before you leave this screen.
              </p>
              <div className="stakd-onboarding-actions">
                <button
                  type="button"
                  className="pathway-submit"
                  onClick={handleLetsGo}
                >
                  Let's go →
                </button>
                <button
                  type="button"
                  className="stakd-onboarding-skip-btn"
                  onClick={handleSkipSetup}
                >
                  Skip setup — I'll figure it out
                </button>
              </div>
            </div>
          </div>

          {/* Screen 2 — Add cashier */}
          <div className="stakd-onboarding-screen">
            <div className="stakd-onboarding-card">
              <div className="stakd-onboarding-step-indicator" aria-hidden="true">
                1 / 2
              </div>
              <span className="stakd-onboarding-eyebrow">STEP 1 OF 2</span>
              <h2 className="stakd-onboarding-title">Add your first cashier.</h2>
              <p className="stakd-onboarding-subtitle">
                Just a name. stakd generates their PIN automatically — they'll set it on first login.
              </p>
              <form onSubmit={handleAddCashier} className="stakd-onboarding-form">
                <input
                  ref={inputRef}
                  type="text"
                  className="stakd-onboarding-input"
                  placeholder="Cashier's name"
                  value={cashierName}
                  onChange={(e) => {
                    setCashierName(e.target.value);
                    setError(null);
                  }}
                  maxLength={100}
                  disabled={loading}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'onboarding-add-error' : undefined}
                />
                {error && (
                  <p id="onboarding-add-error" className="stakd-onboarding-error" role="alert">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  className="stakd-onboarding-submit"
                  disabled={!cashierName.trim() || loading}
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
                  className="stakd-onboarding-skip-btn"
                  onClick={handleSkipStep}
                  disabled={loading}
                >
                  Skip this step
                </button>
              </form>
            </div>
          </div>

          {/* Screen 3 — Success + orientation */}
          <div className="stakd-onboarding-screen">
            <div className="stakd-onboarding-card">
              <div className="stakd-onboarding-step-indicator" aria-hidden="true">
                2 / 2
              </div>
              <span className="stakd-onboarding-eyebrow">STEP 2 OF 2</span>
              <h2 className="stakd-onboarding-title">
                {addedName ? `${addedName} is ready.` : "You're all set."}
              </h2>
              <p className="stakd-onboarding-subtitle">
                Hand them the phone and they can start counting. Drops will appear in your
                dashboard the moment they confirm.
              </p>
              <div className="stakd-onboarding-options">
                <button
                  type="button"
                  className="stakd-onboarding-option stakd-onboarding-option-primary"
                  onClick={handleGoToKiosk}
                >
                  <div className="stakd-onboarding-option-icon">
                    <i className="fa-solid fa-mobile-screen" />
                  </div>
                  <div className="stakd-onboarding-option-text">
                    <span className="stakd-onboarding-option-title">Go to kiosk mode</span>
                    <span className="stakd-onboarding-option-sub">
                      Let your cashier count their first drawer now
                    </span>
                  </div>
                  <i className="fa-solid fa-arrow-right pathway-option-arrow" />
                </button>
                <button
                  type="button"
                  className="stakd-onboarding-option"
                  onClick={handleGoToDashboard}
                >
                  <div className="stakd-onboarding-option-icon">
                    <i className="fa-solid fa-chart-line" />
                  </div>
                  <div className="stakd-onboarding-option-text">
                    <span className="stakd-onboarding-option-title">Go to dashboard</span>
                    <span className="stakd-onboarding-option-sub">
                      I'll send them the link separately
                    </span>
                  </div>
                  <i className="fa-solid fa-arrow-right pathway-option-arrow" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
