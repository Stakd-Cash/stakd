# Stripe + Supabase Deployment Guide

This is a start-to-finish checklist for deploying the stakd billing backend. Nothing is set up yet — follow each section in order.

---

## 1. Install the Supabase CLI

```bash
npm install -g supabase
```

Verify it installed:

```bash
supabase --version
```

> [!TIP]
> If you already have it, make sure it's at least v1.100+. Run `supabase update` if needed.

---

## 2. Login & Link Your Project

```bash
supabase login
```

This opens a browser to generate an access token. Paste it back into the terminal.

Then link to your existing Supabase project:

```bash
cd c:\Users\asdae\Documents\stakd
supabase link --project-ref YOUR_PROJECT_REF
```

> [!IMPORTANT]
> Find your **Project Ref** in the Supabase Dashboard → **Settings → General → Reference ID** (looks like `abcdefghijklmnop`).

It will ask for your database password. Enter the one you set when creating the project.

---

## 3. Create Stripe Products & Prices

Go to the [Stripe Dashboard → Products](https://dashboard.stripe.com/test/products) (make sure you're in **Test Mode** — toggle in the top-right).

### Product 1: stakd Starter

1. Click **+ Add Product**
2. Fill in:
   - **Name:** `stakd Starter`
   - **Description:** `Best for single-location teams. Up to 5 staff seats.`
3. Under **Metadata**, add these two keys:
   - `plan` → `starter`
   - `seat_limit` → `5`
4. Under **Pricing**, add:
   - **Price:** `$9.00`
   - **Billing period:** `Monthly`
   - **Currency:** `USD`
5. Click **Save product**

### Product 2: stakd Pro

1. Click **+ Add Product**
2. Fill in:
   - **Name:** `stakd Pro`
   - **Description:** `Unlimited seats. Multi-location ready. Priority support.`
3. Under **Metadata**, add these two keys:
   - `plan` → `pro`
   - `seat_limit` → `-1`
4. Under **Pricing**, add:
   - **Price:** `$29.00`
   - **Billing period:** `Monthly`
   - **Currency:** `USD`
5. Click **Save product**

### Copy the Price IDs

After saving each product, click into it and find the **Price ID** (starts with `price_`). You'll need two:

| Label | Example |
|---|---|
| Starter Monthly | `price_1Qx...abc` |
| Pro Monthly | `price_1Qx...xyz` |

Keep these handy for the next step.

---

## 4. Set Supabase Edge Function Secrets

These are the environment variables your edge functions need at runtime.

```bash
supabase secrets set STRIPE_SECRET_KEY="sk_test_YOUR_KEY_HERE"
supabase secrets set STRIPE_STARTER_PRICE_ID="price_1Qx...abc"
supabase secrets set STRIPE_PRO_PRICE_ID="price_1Qx...xyz"
```

> [!IMPORTANT]
> Find your **Stripe Secret Key** at [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/test/apikeys). Use the **Secret key** (starts with `sk_test_`), not the publishable key.

The `STRIPE_WEBHOOK_SECRET` will be set in **Step 7** after you create the webhook endpoint. Skip it for now.

Your Supabase URL and Service Role Key are automatically available to edge functions — you don't need to set them manually.

---

## 5. Run the Database Migration

This adds the billing columns to your `companies` table and creates the seat-limit trigger.

```bash
supabase db push
```

This will apply [supabase/migrations/20260321_add_stripe_billing.sql](file:///c:/Users/asdae/Documents/stakd/supabase/migrations/20260321_add_stripe_billing.sql).

> [!CAUTION]
> If you already have data in the `companies` table, review the migration first — it uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, so it's safe to re-run, but double-check your data.

To verify the columns were added:

```bash
supabase db reset --dry-run
```

Or check in the Supabase Dashboard → **Table Editor → companies** — you should see new columns: `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `plan`, `seat_limit`, `current_period_end`.

---

## 6. Deploy the Edge Functions

Deploy all three functions at once:

```bash
supabase functions deploy create-checkout-session --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy create-portal-session --no-verify-jwt
```

> [!NOTE]
> We use `--no-verify-jwt` because each function handles its own auth internally (JWT verification for checkout/portal, Stripe signature verification for webhooks). Supabase's built-in JWT check would block the Stripe webhook calls.

To verify they deployed:

```bash
supabase functions list
```

You should see all three listed with status [Active](file:///c:/Users/asdae/Documents/stakd/src/components/admin/StaffPanel.jsx#216-224).

---

## 7. Create the Stripe Webhook Endpoint

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **+ Add endpoint**
3. Set the **Endpoint URL** to:

```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
```

Replace `YOUR_PROJECT_REF` with your actual project ref from Step 2.

4. Under **Events to send**, select these 4 events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

5. Click **Add endpoint**

6. After creation, click **Reveal** next to the **Signing secret** (starts with `whsec_`). Copy it.

7. Now set the webhook secret in Supabase:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_YOUR_SIGNING_SECRET"
```

---

## 8. Configure the Stripe Customer Portal

1. Go to [Stripe Dashboard → Settings → Billing → Customer Portal](https://dashboard.stripe.com/test/settings/billing/portal)
2. Toggle on the features you want customers to access:
   - ✅ **Update payment method**
   - ✅ **View invoices**
   - ✅ **Cancel subscription** (recommended)
   - ✅ **Switch plans** (if you want users to upgrade/downgrade themselves)
3. Click **Save changes**

---

## 9. Test End-to-End

### Quick smoke test:

1. **Sign up** at your app → create a workspace
2. You should land on the **Plan Selector** page (the paywall)
3. Click **Starter — $9 / month**
4. You'll be redirected to **Stripe Checkout** (test mode)
5. Use test card: `4242 4242 4242 4242`, any future expiry, any CVC, any zip
6. After payment, you'll be redirected back
7. The page should poll and then redirect to the **admin dashboard**

### Verify in your databases:

- **Stripe Dashboard → Customers**: You should see a new customer with an active subscription
- **Supabase Dashboard → Table Editor → companies**: The row should now have:
  - `stripe_customer_id` = `cus_...`
  - `stripe_subscription_id` = `sub_...`
  - `subscription_status` = `active`
  - `plan` = `starter`
  - `seat_limit` = `5`

### Test the seat limit:

1. Go to **Staff** tab in the admin dashboard
2. Add 5 staff members (should work)
3. Try adding a 6th → should see an upgrade prompt

### Test billing management:

1. Go to **Settings** tab → scroll to billing section
2. Click **Manage Billing** → should open the Stripe Customer Portal

---

## 10. Go Live (When Ready)

When you're ready to accept real payments:

1. **Activate your Stripe account** at [Stripe Dashboard → Settings](https://dashboard.stripe.com/settings)
2. **Re-create the products and prices** in **live mode** (or use `stripe fixtures`)
3. Update your secrets with **live keys**:

```bash
supabase secrets set STRIPE_SECRET_KEY="sk_live_YOUR_LIVE_KEY"
supabase secrets set STRIPE_STARTER_PRICE_ID="price_LIVE_STARTER"
supabase secrets set STRIPE_PRO_PRICE_ID="price_LIVE_PRO"
```

4. Create a **new webhook endpoint** in live mode (same URL, same events)
5. Update the webhook secret:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_LIVE_SECRET"
```

> [!CAUTION]
> Never use test keys in production. Double-check that all secrets are swapped to live values before accepting real payments.
