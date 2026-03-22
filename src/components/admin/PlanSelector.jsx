import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import {
  BILLING_PLANS,
  PAID_PLAN_KEYS,
  createCheckoutSession,
  getPlanCheckoutPayload,
  hasActiveSubscription,
} from '../../lib/billing.js';

const PLAN_ICONS = {
  solo: 'fa-seedling',
  pro: 'fa-briefcase',
  business: 'fa-building',
};

export function PlanSelector({ company, navigate, replaceNavigate, checkoutSessionId = null }) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const loadCompanyContext = useAuthStore((s) => s.loadCompanyContext);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [syncingCheckout, setSyncingCheckout] = useState(Boolean(checkoutSessionId));
  const [error, setError] = useState(null);

  const isOwner = company?.owner_id && user?.id === company.owner_id;

  useEffect(() => {
    if (!checkoutSessionId) {
      setSyncingCheckout(false);
      return undefined;
    }

    let cancelled = false;
    let timeoutId = null;
    let attempts = 0;

    const pollForSubscription = async () => {
      if (cancelled) {
        return;
      }

      attempts += 1;
      setSyncingCheckout(true);
      setError(null);

      await loadCompanyContext();
      const nextCompany = useAuthStore.getState().company;

      if (hasActiveSubscription(nextCompany)) {
        replaceNavigate('/admin');
        return;
      }

      if (attempts >= 6) {
        setSyncingCheckout(false);
        setError('Payment was received, but billing is still syncing. Refresh in a moment if this screen does not update.');
        return;
      }

      timeoutId = window.setTimeout(pollForSubscription, 2000);
    };

    pollForSubscription();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [checkoutSessionId, loadCompanyContext, replaceNavigate]);

  const handlePlanCheckout = async (planKey) => {
    if (!company?.id || syncingCheckout || !isOwner) {
      return;
    }

    setLoadingPlan(planKey);
    setError(null);

    try {
      const url = await createCheckoutSession({
        companyId: company.id,
        userEmail: user?.email || '',
        ...getPlanCheckoutPayload(planKey),
      });

      window.location.assign(url);
    } catch (checkoutError) {
      setError(checkoutError.message);
      setLoadingPlan(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    replaceNavigate('/login');
  };

  return (
    <div className="pathway-page">
      <div className="pathway-container" style={{ maxWidth: 460 }}>
        <div className="pathway-brand">
          <div className="pathway-brand-icon">
            <img src="/favicon.svg" alt="Stakd" width="24" height="24" />
          </div>
          <span className="pathway-brand-name">stakd</span>
        </div>

        <div className="pathway-card">
          <div className="pathway-card-header">
            <span className="pathway-eyebrow">{company?.name || 'Workspace billing'}</span>
            <h1 className="pathway-title">Pick a plan to unlock the dashboard.</h1>
            <p className="pathway-subtitle">
              Checkout runs through Stripe. Your workspace opens the moment payment clears.
            </p>
          </div>

          {syncingCheckout && (
            <div className="plan-sync-banner" aria-live="polite">
              <i className="fa-solid fa-circle-notch fa-spin" />
              <div>
                <strong>Finalizing your subscription</strong>
                <p>Waiting for Stripe to sync your workspace.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="plan-error" role="alert">
              <i className="fa-solid fa-circle-exclamation" />
              {error}
            </div>
          )}

          {!isOwner && (
            <div className="plan-notice">
              <i className="fa-solid fa-lock" />
              <span>Only the workspace owner can activate billing.</span>
            </div>
          )}

          <div className="plan-options">
            {PAID_PLAN_KEYS.map((planKey) => {
              const plan = BILLING_PLANS[planKey];
              const isPrimary = planKey === 'pro';
              const isLoading = loadingPlan === planKey;
              const disabled = !isOwner || syncingCheckout || Boolean(loadingPlan);

              return (
                <button
                  key={plan.key}
                  className={`pathway-option plan-option${isPrimary ? ' pathway-option-primary' : ''}`}
                  onClick={() => handlePlanCheckout(plan.key)}
                  disabled={disabled}
                >
                  <div className="pathway-option-icon">
                    <i className={`fa-solid ${PLAN_ICONS[planKey] || 'fa-star'}`} />
                  </div>
                  <div className="pathway-option-text">
                    <span className="pathway-option-title">
                      {plan.name} — {plan.priceLabel}
                    </span>
                    <span className="pathway-option-sub">
                      {plan.seatLimit === -1 ? 'Unlimited seats' : `Up to ${plan.seatLimit} seats`}
                      {' · '}{plan.summary}
                    </span>
                  </div>
                  <i className={`fa-solid ${isLoading ? 'fa-circle-notch fa-spin' : 'fa-arrow-right'} pathway-option-arrow`} />
                </button>
              );
            })}
          </div>

          <div className="plan-features">
            {PAID_PLAN_KEYS.map((planKey) => {
              const plan = BILLING_PLANS[planKey];
              return (
                <div key={plan.key} className="plan-features-col">
                  <span className="plan-features-label">{plan.name}</span>
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={`${plan.key}-${feature}`}>
                        <i className="fa-solid fa-check" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="plan-footer">
            <div className="plan-trust">
              <i className="fa-solid fa-shield-halved" />
              <span>Billing, upgrades and cancellation all run through Stripe.</span>
            </div>
          </div>
        </div>

        <div className="pathway-footer" style={{ width: '100%', display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="pathway-signout" onClick={() => navigate('/')} type="button">
            <i className="fa-solid fa-arrow-left" />
            <span>Back to Site</span>
          </button>
          <button className="pathway-signout" onClick={handleSignOut} type="button">
            <i className="fa-solid fa-right-from-bracket" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
