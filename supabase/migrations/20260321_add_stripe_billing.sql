-- ============================================================================
-- Stakd Stripe Billing
-- Adds subscription billing fields, protects billing writes, and enforces
-- seat limits for staff management.
-- ============================================================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS seat_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- Note: ADD COLUMN ... DEFAULT already backfills existing rows in Postgres 11+,
-- so no UPDATE statement is needed.

ALTER TABLE public.companies
  ALTER COLUMN subscription_status SET DEFAULT 'inactive',
  ALTER COLUMN plan SET DEFAULT 'none',
  ALTER COLUMN seat_limit SET DEFAULT 0,
  ALTER COLUMN subscription_status SET NOT NULL,
  ALTER COLUMN plan SET NOT NULL,
  ALTER COLUMN seat_limit SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.companies
    ADD CONSTRAINT companies_subscription_status_check
    CHECK (subscription_status IN ('inactive', 'trialing', 'active', 'past_due', 'canceled'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  -- Drop old constraint if it exists with stale plan values
  ALTER TABLE public.companies
    DROP CONSTRAINT IF EXISTS companies_plan_check;
  ALTER TABLE public.companies
    ADD CONSTRAINT companies_plan_check
    CHECK (plan IN ('none', 'solo', 'pro', 'business'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_stripe_customer_id
  ON public.companies(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_stripe_subscription_id
  ON public.companies(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.protect_company_billing_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role'
    AND (
      NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
      OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
      OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
      OR NEW.plan IS DISTINCT FROM OLD.plan
      OR NEW.seat_limit IS DISTINCT FROM OLD.seat_limit
      OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
    )
  THEN
    RAISE EXCEPTION 'Billing fields can only be updated by the service role.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_company_billing_fields ON public.companies;
CREATE TRIGGER protect_company_billing_fields
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_company_billing_fields();

CREATE OR REPLACE FUNCTION public.enforce_staff_seat_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seat_limit integer;
  v_plan text;
  v_active_count integer;
BEGIN
  -- Owners are created during workspace bootstrap before billing is completed.
  IF NEW.role = 'owner' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.active, true) IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Editing an already-active staff member in place does not consume a new seat.
  IF TG_OP = 'UPDATE'
    AND COALESCE(OLD.active, false) = true
    AND OLD.company_id = NEW.company_id
  THEN
    RETURN NEW;
  END IF;

  SELECT seat_limit, plan
    INTO v_seat_limit, v_plan
    FROM public.companies
   WHERE id = NEW.company_id;

  -- seat_limit = -1 means unlimited (Pro plan) — skip enforcement entirely
  IF COALESCE(v_seat_limit, 0) = -1 THEN
    RETURN NEW;
  END IF;

  IF COALESCE(v_seat_limit, 0) <= 0 THEN
    RAISE EXCEPTION 'Your workspace does not have any staff seats yet. Choose a billing plan to add staff.';
  END IF;

  SELECT count(*)
    INTO v_active_count
    FROM public.staff
   WHERE company_id = NEW.company_id
     AND active = true
     AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_active_count >= v_seat_limit THEN
    IF COALESCE(v_plan, 'none') = 'solo' THEN
      RAISE EXCEPTION 'Solo plan seat limit reached. Upgrade to Pro for more seats.';
    END IF;

    IF COALESCE(v_plan, 'none') = 'pro' THEN
      RAISE EXCEPTION 'Pro plan seat limit reached. Upgrade to Business for unlimited seats.';
    END IF;

    RAISE EXCEPTION 'Seat limit reached for this workspace.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_staff_seat_limit ON public.staff;
CREATE TRIGGER enforce_staff_seat_limit
  BEFORE INSERT OR UPDATE OF active, company_id
  ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_staff_seat_limit();
