import { supabase } from './supabase.js';

/** Set after signup so PlanSelector redirects to Stripe without showing the billing gate again. */
export const POST_SIGNUP_CHECKOUT_PLAN_STORAGE_KEY = 'stakd_post_signup_checkout_plan';

// ---------------------------------------------------------------------------
// Plan definitions (Free → Solo → Pro → Business)
// ---------------------------------------------------------------------------

export const BILLING_PLANS = {
  free: {
    key: 'free',
    name: 'Free',
    priceLabel: '$0',
    seatLimit: 0,
    summary: 'Full counting calculator — no account required.',
    features: [
      'Full counting calculator',
      'Drop amount calculation',
      'Local history on your device',
      'Dark mode and haptics',
    ],
  },
  solo: {
    key: 'solo',
    name: 'Solo',
    priceLabel: '$9 / month',
    seatLimit: 3,
    summary: 'Cloud-synced drops with a small team.',
    features: [
      '1 manager + 2 cashier accounts',
      'Cloud-synced drops across devices',
      'Drop history and reporting',
      'Real-time variance alerts',
    ],
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    priceLabel: '$29 / month',
    seatLimit: 10,
    summary: 'Full reporting and room to grow.',
    features: [
      'Up to 10 staff members included',
      'Cloud-synced drops across devices',
      'Full history and reporting',
      'Real-time variance alerts',
      'Add-on seats $5/mo each (up to 20 total)',
    ],
  },
  business: {
    key: 'business',
    name: 'Business',
    priceLabel: '$79 / month',
    seatLimit: -1,
    summary: 'Unlimited staff. Multi-location ready.',
    features: [
      'Unlimited staff accounts',
      'Multi-location dashboard',
      'Cross-location cash analytics',
      'CSV and PDF exports',
      'Priority support',
    ],
  },
};

/** Plans that have a Stripe price (excludes Free) */
export const PAID_PLAN_KEYS = ['solo', 'pro', 'business'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRuntimeBillingConfig() {
  if (typeof window === 'undefined') {
    return {};
  }

  return window.STAKD_BILLING || {};
}

async function getFunctionErrorMessage(error, fallbackMessage) {
  if (error?.context?.json) {
    try {
      const payload = await error.context.json();
      if (payload?.error) {
        return payload.error;
      }
    } catch {
      // Ignore JSON parsing errors and fall back to the function error message.
    }
  }

  return error?.message || fallbackMessage;
}

export function hasActiveSubscription(company) {
  return (
    company?.subscription_status === 'active' ||
    company?.subscription_status === 'trialing'
  );
}

export function getPlanDetails(planKey) {
  return BILLING_PLANS[planKey] || null;
}

export function getPlanName(planKey) {
  return getPlanDetails(planKey)?.name || 'No Plan';
}

export function formatSubscriptionStatus(status) {
  if (!status) {
    return 'Inactive';
  }

  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatRenewalDate(dateString) {
  if (!dateString) {
    return 'Not scheduled';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function getPlanCheckoutPayload(planKey) {
  const config = getRuntimeBillingConfig();
  const priceIdMap = {
    solo: config.soloPriceId,
    pro: config.proPriceId,
    business: config.businessPriceId,
  };
  const publicPriceId = priceIdMap[planKey];

  return publicPriceId
    ? { plan: planKey, priceId: publicPriceId }
    : { plan: planKey };
}

export function getSeatLimitNotice(planKey) {
  if (planKey === 'solo') {
    return 'You\u2019ve hit your Solo plan seat limit. Upgrade to Pro for up to 10 seats.';
  }

  if (planKey === 'pro') {
    return 'You\u2019ve hit your Pro seat limit. Upgrade to Business for unlimited seats.';
  }

  if (planKey === 'business') {
    return 'You\u2019ve reached an unexpected limit on your Business plan. Contact support for help.';
  }

  return 'Choose a plan to unlock staff seats for this workspace.';
}

/**
 * Returns the next plan up for an upgrade prompt.
 */
export function getUpgradePlan(currentPlanKey) {
  const ladder = ['free', 'solo', 'pro', 'business'];
  const idx = ladder.indexOf(currentPlanKey);
  if (idx < 0 || idx >= ladder.length - 1) return null;
  return ladder[idx + 1];
}

// ---------------------------------------------------------------------------
// Edge function calls
// ---------------------------------------------------------------------------

export async function createCheckoutSession(input) {
  const { data, error } = await supabase.functions.invoke(
    'create-checkout-session',
    {
      body: input,
    }
  );

  if (error) {
    throw new Error(
      await getFunctionErrorMessage(error, 'Unable to start Stripe checkout.')
    );
  }

  if (!data?.url) {
    throw new Error('Stripe checkout did not return a redirect URL.');
  }

  return data.url;
}

export async function createPortalSession(input) {
  const { data, error } = await supabase.functions.invoke(
    'create-portal-session',
    {
      body: input,
    }
  );

  if (error) {
    throw new Error(
      await getFunctionErrorMessage(error, 'Unable to open the billing portal.')
    );
  }

  if (!data?.url) {
    throw new Error('Stripe billing portal did not return a redirect URL.');
  }

  return data.url;
}
