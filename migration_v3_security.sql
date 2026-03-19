-- ============================================================================
-- Stakd v3 Security Hardening Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- ============================================================================
-- C1 + C2: Server-side PIN verification — never expose pin_hash/pin_salt
-- ============================================================================

-- Server-side PIN verification function (security definer = runs as owner, bypasses RLS)
-- Returns a JSON object: { success, staff_id, name, role, permissions, error }
CREATE OR REPLACE FUNCTION public.verify_pin(p_staff_id uuid, p_pin_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff record;
  v_attempts int;
  v_locked_until timestamptz;
BEGIN
  -- Look up the staff member
  SELECT id, name, role, permissions, pin_hash, pin_salt, active, company_id
    INTO v_staff
    FROM public.staff
   WHERE id = p_staff_id;

  IF v_staff IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff not found.');
  END IF;

  IF NOT v_staff.active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account is deactivated.');
  END IF;

  -- Check server-side rate limiting
  SELECT attempts, locked_until INTO v_attempts, v_locked_until
    FROM public.pin_rate_limits
   WHERE staff_id = p_staff_id;

  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Too many attempts. Try again in ' || CEIL(EXTRACT(EPOCH FROM (v_locked_until - now()))) || 's.'
    );
  END IF;

  -- Compare the hash (client sends pre-hashed value using the salt from a separate RPC)
  IF v_staff.pin_hash = p_pin_hash THEN
    -- Success: reset attempts
    DELETE FROM public.pin_rate_limits WHERE staff_id = p_staff_id;
    RETURN jsonb_build_object(
      'success', true,
      'staff_id', v_staff.id,
      'name', v_staff.name,
      'role', v_staff.role,
      'permissions', v_staff.permissions,
      'company_id', v_staff.company_id
    );
  ELSE
    -- Failed: increment attempts
    INSERT INTO public.pin_rate_limits (staff_id, attempts, locked_until)
    VALUES (p_staff_id, 1, NULL)
    ON CONFLICT (staff_id) DO UPDATE
      SET attempts = public.pin_rate_limits.attempts + 1,
          locked_until = CASE
            WHEN public.pin_rate_limits.attempts + 1 >= 5
            THEN now() + interval '60 seconds'
            ELSE NULL
          END,
          updated_at = now();

    SELECT attempts INTO v_attempts
      FROM public.pin_rate_limits
     WHERE staff_id = p_staff_id;

    IF v_attempts >= 5 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Locked for 60s.');
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Incorrect PIN. ' || (5 - v_attempts) || ' attempts left.');
    END IF;
  END IF;
END;
$$;

-- Server-side PIN salt retrieval — only returns the salt, never the hash
CREATE OR REPLACE FUNCTION public.get_pin_salt(p_staff_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pin_salt FROM public.staff WHERE id = p_staff_id AND active = true;
$$;

-- Server-side PIN change with current-PIN verification (fixes M1 too)
CREATE OR REPLACE FUNCTION public.change_pin(
  p_staff_id uuid,
  p_current_pin_hash text,
  p_new_pin_hash text,
  p_new_pin_salt text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff record;
  v_caller_staff record;
BEGIN
  -- Look up target staff
  SELECT id, pin_hash, company_id, active
    INTO v_staff
    FROM public.staff
   WHERE id = p_staff_id;

  IF v_staff IS NULL OR NOT v_staff.active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff not found or inactive.');
  END IF;

  -- Verify the caller is changing their own PIN or is an owner/manager of the company
  SELECT id, role, permissions, company_id
    INTO v_caller_staff
    FROM public.staff
   WHERE company_id = v_staff.company_id
     AND user_id = auth.uid()
     AND active = true
   LIMIT 1;

  -- Self-service: must verify current PIN
  IF v_caller_staff.id = p_staff_id THEN
    IF v_staff.pin_hash != p_current_pin_hash THEN
      RETURN jsonb_build_object('success', false, 'error', 'Current PIN is incorrect.');
    END IF;
  -- Admin override: owner can change anyone's PIN without current PIN
  ELSIF v_caller_staff.role = 'owner' THEN
    -- OK, no current PIN needed
  -- Manager with can_edit_users: can change PINs without current PIN
  ELSIF v_caller_staff.role = 'manager'
    AND (v_caller_staff.permissions->>'can_edit_users')::boolean = true THEN
    -- OK
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to change this PIN.');
  END IF;

  -- Update the PIN
  UPDATE public.staff
     SET pin_hash = p_new_pin_hash,
         pin_salt = p_new_pin_salt
   WHERE id = p_staff_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Rate limit tracking table
CREATE TABLE IF NOT EXISTS public.pin_rate_limits (
  staff_id uuid PRIMARY KEY REFERENCES public.staff(id) ON DELETE CASCADE,
  attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pin_rate_limits ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies — only accessible via security definer functions

-- Grant execute on RPCs to authenticated users
GRANT EXECUTE ON FUNCTION public.verify_pin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pin_salt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_pin(uuid, text, text, text) TO authenticated;

-- ============================================================================
-- C2: Create a safe staff view that excludes pin_hash and pin_salt
-- ============================================================================

CREATE OR REPLACE VIEW public.staff_safe AS
SELECT
  id, company_id, user_id, name, role, permissions, active, created_at
FROM public.staff;

GRANT SELECT ON public.staff_safe TO authenticated;

-- ============================================================================
-- H1 + H4: Server-side audit logging via triggers
-- ============================================================================

-- Trigger function: log staff changes
CREATE OR REPLACE FUNCTION public.trg_audit_staff()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_details jsonb;
  v_actor_staff_id uuid;
BEGIN
  -- Find the acting staff member
  SELECT id INTO v_actor_staff_id
    FROM public.staff
   WHERE user_id = auth.uid() AND active = true
   LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    v_action := 'staff.create';
    v_details := jsonb_build_object('target_name', NEW.name, 'role', NEW.role);
    INSERT INTO public.audit_log (company_id, staff_id, action, target_type, target_id, details)
    VALUES (NEW.company_id, v_actor_staff_id, v_action, 'staff', NEW.id, v_details);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_details := '{}'::jsonb;

    IF OLD.active AND NOT NEW.active THEN
      v_action := 'staff.deactivate';
      v_details := jsonb_build_object('target_name', OLD.name);
    ELSIF NOT OLD.active AND NEW.active THEN
      v_action := 'staff.activate';
      v_details := jsonb_build_object('target_name', OLD.name);
    ELSIF OLD.pin_hash != NEW.pin_hash THEN
      v_action := 'staff.pin_change';
      v_details := jsonb_build_object('target_name', OLD.name);
    ELSE
      v_action := 'staff.update';
      v_details := jsonb_build_object(
        'target_name', NEW.name,
        'changes', jsonb_build_object(
          'name', CASE WHEN OLD.name != NEW.name THEN NEW.name ELSE null END,
          'role', CASE WHEN OLD.role != NEW.role THEN NEW.role::text ELSE null END
        )
      );
    END IF;

    INSERT INTO public.audit_log (company_id, staff_id, action, target_type, target_id, details)
    VALUES (NEW.company_id, v_actor_staff_id, v_action, 'staff', NEW.id, v_details);
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Trigger function: log drop deletes
CREATE OR REPLACE FUNCTION public.trg_audit_drop_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_staff_id uuid;
  v_staff_name text;
BEGIN
  SELECT id INTO v_actor_staff_id
    FROM public.staff
   WHERE user_id = auth.uid() AND active = true
   LIMIT 1;

  SELECT name INTO v_staff_name
    FROM public.staff
   WHERE id = OLD.staff_id;

  INSERT INTO public.audit_log (company_id, staff_id, action, target_type, target_id, details)
  VALUES (
    OLD.company_id,
    v_actor_staff_id,
    'drop.delete',
    'drop',
    OLD.id,
    jsonb_build_object('target_name', COALESCE(v_staff_name, 'Unknown'), 'amount_cents', OLD.amount_cents)
  );
  RETURN OLD;
END;
$$;

-- Trigger function: log company updates
CREATE OR REPLACE FUNCTION public.trg_audit_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_staff_id uuid;
  v_details jsonb;
BEGIN
  SELECT id INTO v_actor_staff_id
    FROM public.staff
   WHERE user_id = auth.uid() AND active = true
   LIMIT 1;

  IF TG_OP = 'UPDATE' THEN
    v_details := '{}'::jsonb;
    IF OLD.name != NEW.name THEN
      v_details := jsonb_build_object('changes', jsonb_build_object('name', NEW.name));
      INSERT INTO public.audit_log (company_id, staff_id, action, target_type, target_id, details)
      VALUES (NEW.id, v_actor_staff_id, 'company.name_change', 'company', NEW.id, v_details);
    END IF;
    IF OLD.kiosk_timeout_minutes != NEW.kiosk_timeout_minutes THEN
      v_details := jsonb_build_object('changes', jsonb_build_object('kiosk_timeout_minutes', NEW.kiosk_timeout_minutes));
      INSERT INTO public.audit_log (company_id, staff_id, action, target_type, target_id, details)
      VALUES (NEW.id, v_actor_staff_id, 'settings.update', 'company', NEW.id, v_details);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the triggers (drop first if they exist from a prior run)
DROP TRIGGER IF EXISTS audit_staff_changes ON public.staff;
CREATE TRIGGER audit_staff_changes
  AFTER INSERT OR UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_staff();

DROP TRIGGER IF EXISTS audit_drop_deletes ON public.drops;
CREATE TRIGGER audit_drop_deletes
  BEFORE DELETE ON public.drops
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_drop_delete();

DROP TRIGGER IF EXISTS audit_company_changes ON public.companies;
CREATE TRIGGER audit_company_changes
  AFTER UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_company();

-- ============================================================================
-- H2: Tighten public_select_company_by_slug — only expose slug + name to anon
-- ============================================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "public_select_company_by_slug" ON public.companies;

-- Replace with a lookup function that returns only slug + name + id (needed for join flow)
CREATE OR REPLACE FUNCTION public.lookup_company_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object('id', id, 'slug', slug, 'name', name)
    FROM public.companies
   WHERE slug = p_slug;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_company_by_slug(text) TO anon, authenticated;

-- Revoke anon SELECT on companies entirely
REVOKE SELECT ON public.companies FROM anon;

-- ============================================================================
-- H3: Narrow GRANT permissions to least privilege
-- ============================================================================

-- Revoke ALL first, then grant only what's needed
REVOKE ALL ON public.companies FROM authenticated;
REVOKE ALL ON public.staff FROM authenticated;
REVOKE ALL ON public.drops FROM authenticated;
REVOKE ALL ON public.audit_log FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.staff TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.drops TO authenticated;
GRANT SELECT ON public.audit_log TO authenticated;
-- audit_log INSERT is now handled by triggers (security definer), not client

-- ============================================================================
-- L1: Company creation rate limit
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_company_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
    FROM public.companies
   WHERE owner_id = auth.uid();

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'Company limit reached. Maximum 3 companies per account.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_company_limit ON public.companies;
CREATE TRIGGER enforce_company_limit
  BEFORE INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.check_company_limit();

-- ============================================================================
-- Remove client INSERT on audit_log (now trigger-only)
-- ============================================================================

DROP POLICY IF EXISTS "staff_insert_audit_log" ON public.audit_log;

-- ============================================================================
-- Done — verify by checking:
--   SELECT * FROM pg_policies WHERE tablename IN ('companies','staff','drops','audit_log');
-- ============================================================================
