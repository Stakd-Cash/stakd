import {
  getOwnedCompany,
  requireAuthenticatedUser,
  resolveCheckoutPlan,
  stripe,
  supabaseAdmin,
} from '../_shared/billing.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const SUCCESS_URL = 'https://stakd.cash/admin?session_id={CHECKOUT_SESSION_ID}';
const CANCEL_URL = 'https://stakd.cash/onboarding?step=plan';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const { companyId, priceId, plan, userEmail } = await req.json();

    if (!companyId) {
      return jsonResponse({ error: 'companyId is required.' }, 400);
    }

    const selectedPlan = resolveCheckoutPlan({ priceId, plan });
    if (!selectedPlan) {
      return jsonResponse({ error: 'Invalid billing plan selection.' }, 400);
    }

    const user = await requireAuthenticatedUser(req);
    const company = await getOwnedCompany(companyId, user.id);

    if (company.subscription_status === 'active' || company.subscription_status === 'trialing') {
      return jsonResponse(
        { error: 'This workspace already has an active subscription. Use the billing portal instead.' },
        409
      );
    }

    let customerId = company.stripe_customer_id;

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail || user.email || undefined,
        name: company.name,
        metadata: {
          companyId: company.id,
        },
      });

      customerId = customer.id;

      const { error } = await supabaseAdmin
        .from('companies')
        .update({ stripe_customer_id: customerId })
        .eq('id', company.id);

      if (error) {
        throw new Error(error.message);
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: company.id,
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        companyId: company.id,
      },
      subscription_data: {
        metadata: {
          companyId: company.id,
          plan: selectedPlan.key,
        },
      },
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
    });

    if (!session.url) {
      throw new Error('Stripe checkout session did not return a URL.');
    }

    return jsonResponse({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create checkout session.';
    const status = message === 'Unauthorized.' ? 401 : 500;
    return jsonResponse({ error: message }, status);
  }
});
