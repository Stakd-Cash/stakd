import {
  getOwnedCompany,
  requireAuthenticatedUser,
  stripe,
} from '../_shared/billing.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const RETURN_URL = 'https://stakd.cash/admin/settings';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const { companyId } = await req.json();

    if (!companyId) {
      return jsonResponse({ error: 'companyId is required.' }, 400);
    }

    const user = await requireAuthenticatedUser(req);
    const company = await getOwnedCompany(companyId, user.id);

    if (!company.stripe_customer_id) {
      return jsonResponse({ error: 'No Stripe customer is linked to this company yet.' }, 400);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: RETURN_URL,
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create billing portal session.';
    const status = message === 'Unauthorized.' ? 401 : 500;
    return jsonResponse({ error: message }, status);
  }
});
