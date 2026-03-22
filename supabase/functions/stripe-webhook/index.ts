import Stripe from 'npm:stripe';
import {
  buildSubscriptionUpdate,
  findCompanyForSubscriptionEvent,
  stripe,
  supabaseAdmin,
  toIsoFromUnix,
} from '../_shared/billing.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

async function updateCompany(companyId: string, updates: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from('companies')
    .update(updates)
    .eq('id', companyId);

  if (error) {
    throw new Error(error.message);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  if (!webhookSecret) {
    return jsonResponse({ error: 'Missing STRIPE_WEBHOOK_SECRET.' }, 500);
  }

  const signature = req.headers.get('Stripe-Signature');
  if (!signature) {
    return jsonResponse({ error: 'Missing Stripe-Signature header.' }, 400);
  }

  const bodyBuffer = await req.arrayBuffer();
  const rawBody = new TextDecoder().decode(bodyBuffer);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch {
    return jsonResponse({ error: 'Stripe signature verification failed.' }, 400);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId =
          session.metadata?.companyId ??
          (typeof session.client_reference_id === 'string' ? session.client_reference_id : null);
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null;

        if (!companyId || !subscriptionId) {
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const updates = buildSubscriptionUpdate(subscription);
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;

        await updateCompany(companyId, {
          ...updates,
          stripe_customer_id: updates.stripe_customer_id ?? customerId,
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id ?? null;
        const companyId = await findCompanyForSubscriptionEvent({
          companyId: subscription.metadata?.companyId ?? null,
          subscriptionId: subscription.id,
          customerId,
        });

        if (!companyId) {
          break;
        }

        await updateCompany(companyId, buildSubscriptionUpdate(subscription));
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id ?? null;
        const companyId = await findCompanyForSubscriptionEvent({
          companyId: subscription.metadata?.companyId ?? null,
          subscriptionId: subscription.id,
          customerId,
        });

        if (!companyId) {
          break;
        }

        await updateCompany(companyId, {
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          subscription_status: 'canceled',
          plan: 'none',
          seat_limit: 0,
          current_period_end: toIsoFromUnix(subscription.current_period_end ?? null),
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id ?? null;
        const customerId =
          typeof invoice.customer === 'string'
            ? invoice.customer
            : invoice.customer?.id ?? null;
        const companyId = await findCompanyForSubscriptionEvent({
          subscriptionId,
          customerId,
        });

        if (!companyId) {
          break;
        }

        await updateCompany(companyId, {
          subscription_status: 'past_due',
        });
        break;
      }

      default:
        break;
    }

    return jsonResponse({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed.';
    return jsonResponse({ error: message }, 500);
  }
});
