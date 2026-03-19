-- ============================================================================
-- Stakd v2 Migration
-- Run this in Supabase SQL Editor to upgrade from v1 schema
-- ============================================================================

-- 1. Add kiosk_timeout_minutes to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS kiosk_timeout_minutes integer NOT NULL DEFAULT 10
  CHECK (kiosk_timeout_minutes BETWEEN 1 AND 480);

COMMENT ON COLUMN public.companies.kiosk_timeout_minutes IS 'Session timeout for kiosk (PIN) mode, in minutes.';

-- 2. Add permissions jsonb to staff
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.staff.permissions IS 'JSON object of permission flags, e.g. {can_view_dashboard, can_edit_users, can_promote_managers}.';

-- 3. Add note column to drops
ALTER TABLE public.drops
  ADD COLUMN IF NOT EXISTS note text DEFAULT NULL;

ALTER TABLE public.drops
  ADD CONSTRAINT drops_note_length CHECK (note IS NULL OR char_length(note) <= 500);

COMMENT ON COLUMN public.drops.note IS 'Optional shift/drop note added by staff.';

-- 4. Admin delete drops policy
CREATE POLICY "admin_delete_drops"
  ON public.drops FOR DELETE
  USING (
    public.my_staff_role(company_id) IN ('owner', 'manager')
    OR company_id IN (SELECT public.my_company_ids())
  );

-- 5. Manager insert staff policy (requires can_edit_users permission)
CREATE POLICY "manager_insert_staff"
  ON public.staff FOR INSERT
  WITH CHECK (
    public.my_staff_role(company_id) = 'manager'
    AND (
      SELECT (permissions->>'can_edit_users')::boolean
      FROM public.staff
      WHERE company_id = staff.company_id AND user_id = auth.uid() AND active = true
      LIMIT 1
    ) = true
  );

-- 6. Manager update staff policy (requires can_edit_users permission)
CREATE POLICY "manager_update_staff"
  ON public.staff FOR UPDATE
  USING (
    public.my_staff_role(company_id) = 'manager'
    AND (
      SELECT (permissions->>'can_edit_users')::boolean
      FROM public.staff
      WHERE company_id = staff.company_id AND user_id = auth.uid() AND active = true
      LIMIT 1
    ) = true
  );

-- 7. Enable realtime for drops table
ALTER PUBLICATION supabase_realtime ADD TABLE public.drops;
