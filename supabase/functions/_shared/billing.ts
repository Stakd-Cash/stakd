import Stripe from 'npm:stripe';
import { createClient } from 'npm:@supabase/supabase-js@2.99.2';

export type BillingPlan = 'solo' | 'pro' | 'business';

type PlanConfig = {
  key: BillingPlan;
  priceId: string;
  seatLimit: number;
};

type SubscriptionLike = {
  id: string;
  status: string;
  customer: string | { id?: string } | null;
  current_period_end?: number | null;
  items?: {
    data?: Array<{
      price?: {
        id?: string | null;
      } | null;
    }>;
  } | null;
  metadata?: Record<string, string> | null;
};

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const planConfigs: PlanConfig[] = [
  {
    key: 'solo',
    priceId: requireEnv('STRIPE_SOLO_PRICE_ID'),
    seatLimit: 3,
  },
  {
    key: 'pro',
    priceId: requireEnv('STRIPE_PRO_PRICE_ID'),
    seatLimit: 10,
  },
  {
    key: 'business',
    priceId: requireEnv('STRIPE_BUSINESS_PRICE_ID'),
    seatLimit: -1,
  },
];

export const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
  httpClient: Stripe.createFetchHttpClient(),
});

export const supabaseAdmin = createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export function getPlanConfigByKey(planKey: string | null | undefined) {
  return planConfigs.find((plan) => plan.key === planKey) ?? null;
}

export function getPlanConfigByPriceId(priceId: string | null | undefined) {
  return planConfigs.find((plan) => plan.priceId === priceId) ?? null;
}

export function resolveCheckoutPlan(input: { priceId?: string | null; plan?: string | null }) {
  if (input.priceId) {
    return getPlanConfigByPriceId(input.priceId);
  }

  if (input.plan) {
    return getPlanConfigByKey(input.plan);
  }

  return null;
}

export async function requireAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    throw new Error('Missing authorization token.');
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    throw new Error('Unauthorized.');
  }

  return data.user;
}

export async function getOwnedCompany(companyId: string, ownerId: string) {
  const { data, error } = await supabaseAdmin
    .from('companies')
    .select(`
      id,
      name,
      owner_id,
      stripe_customer_id,
      stripe_subscription_id,
      subscription_status,
      plan,
      seat_limit,
      current_period_end
    `)
    .eq('id', companyId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Company not found.');
  }

  return data;
}

export function toIsoFromUnix(timestamp?: number | null) {
  if (!timestamp) {
    return null;
  }

  return new Date(timestamp * 1000).toISOString();
}

export function buildSubscriptionUpdate(subscription: SubscriptionLike) {
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const plan = getPlanConfigByPriceId(priceId);
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id ?? null;

  return {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status ?? 'inactive',
    plan: plan?.key ?? 'none',
    seat_limit: plan?.seatLimit ?? 0,
    current_period_end: toIsoFromUnix(subscription.current_period_end ?? null),
  };
}

export async function findCompanyForSubscriptionEvent(input: {
  companyId?: string | null;
  subscriptionId?: string | null;
  customerId?: string | null;
}) {
  const queries = [
    input.companyId
      ? supabaseAdmin
          .from('companies')
          .select('id')
          .eq('id', input.companyId)
          .maybeSingle()
      : null,
    input.subscriptionId
      ? supabaseAdmin
          .from('companies')
          .select('id')
          .eq('stripe_subscription_id', input.subscriptionId)
          .maybeSingle()
      : null,
    input.customerId
      ? supabaseAdmin
          .from('companies')
          .select('id')
          .eq('stripe_customer_id', input.customerId)
          .maybeSingle()
      : null,
  ].filter(Boolean);

  for (const query of queries) {
    const { data, error } = await query!;
    if (error) {
      throw new Error(error.message);
    }

    if (data?.id) {
      return data.id as string;
    }
  }

  return null;
}
