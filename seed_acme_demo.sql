-- ============================================================================
-- Stakd Demo Seed — "Acme Co" (acme-co)
-- Generates 1 month of realistic data for screenshots & investor demos
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New Query
-- ============================================================================
--
-- ⚠️  BEFORE RUNNING: Replace the owner UUID on line 25 with YOUR auth user ID.
--     Find it at: Dashboard → Authentication → Users → copy the UUID
--
-- 🔑 PIN codes for kiosk login:
--   Jordan Rivera (owner)    → 1234
--   Sam Chen (manager)       → 2345
--   Alex Thompson (manager)  → 3456
--   Maria Garcia (cashier)   → 1111
--   Tyler Brooks (cashier)   → 2222
--   Jasmine Lee (cashier)    → 3333
--   David Kim (cashier)      → 4444
--   Nicole Foster (inactive) → 5555
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  -- ╔═══════════════════════════════════════════════════════════════╗
  -- ║  REPLACE THIS with your Supabase Auth user UUID              ║
  v_owner_id uuid := 'f8c93a5a-e0d2-4271-a449-f9714e622920';
  -- ╚═══════════════════════════════════════════════════════════════╝

  v_co      uuid;
  v_jordan  uuid;
  v_sam     uuid;
  v_alex    uuid;
  v_maria   uuid;
  v_tyler   uuid;
  v_jasmine uuid;
  v_david   uuid;
  v_nicole  uuid;

  v_salt text;

  -- Drop generation
  v_day          date;
  v_drops_count  int;
  v_staff        uuid;
  v_target       int;
  v_amount       int;
  v_details      jsonb;
  v_ts           timestamptz;
  v_note         text;
  v_hour         int;
  v_min          int;

  v_pool    uuid[];
  v_targets int[] := ARRAY[20000, 25000, 30000, 30000, 35000, 40000, 50000];
  v_notes   text[] := ARRAY[
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    'Busy lunch rush', 'End of shift', 'Slow morning', 'Register 2',
    'After dinner rush', 'Short on 5s', 'Lots of small bills today',
    'Weekend crew', 'Training shift', 'Double checked count'
  ];

  -- Bill decomposition
  v_dollars   int;
  v_hundreds  int;
  v_fifties   int;
  v_twenties  int;
  v_tens      int;
  v_fives     int;

  v_audit_ts timestamptz;

BEGIN
  -- Safety check
  IF v_owner_id = '00000000-0000-0000-0000-000000000000' THEN
    RAISE EXCEPTION '⛔ Replace v_owner_id on line 28 with your actual Supabase Auth user UUID before running.';
  END IF;

  -- ── Cleanup existing acme-co data (cascades to staff → drops, audit_log) ──
  DELETE FROM public.companies WHERE slug = 'acme-co';

  -- ── Disable audit triggers (auth.uid() is NULL in SQL Editor) ──
  ALTER TABLE public.staff DISABLE TRIGGER audit_staff_changes;
  ALTER TABLE public.companies DISABLE TRIGGER audit_company_changes;

  -- ════════════════════════════════════════════════════════════════════════════
  -- 1. COMPANY
  -- ════════════════════════════════════════════════════════════════════════════
  INSERT INTO public.companies (slug, name, owner_id)
  VALUES ('acme-co', 'Acme Co', v_owner_id)
  RETURNING id INTO v_co;

  -- ════════════════════════════════════════════════════════════════════════════
  -- 2. STAFF — PINs are hashed with pgcrypto hmac() to match client-side algo
  -- ════════════════════════════════════════════════════════════════════════════

  -- Jordan Rivera — Owner (PIN: 1234)
  v_salt := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.staff (company_id, user_id, name, pin_hash, pin_salt, role, permissions, active)
  VALUES (
    v_co, v_owner_id, 'Jordan Rivera',
    encode(hmac('1234', v_salt, 'sha256'), 'hex'), v_salt,
    'owner',
    '{"can_view_dashboard":true,"can_edit_users":true,"can_promote_managers":true}'::jsonb,
    true
  ) RETURNING id INTO v_jordan;

  -- Sam Chen — Manager (PIN: 2345)
  v_salt := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.staff (company_id, name, pin_hash, pin_salt, role, permissions, active)
  VALUES (
    v_co, 'Sam Chen',
    encode(hmac('2345', v_salt, 'sha256'), 'hex'), v_salt,
    'manager',
    '{"can_view_dashboard":true,"can_edit_users":true}'::jsonb,
    true
  ) RETURNING id INTO v_sam;

  -- Alex Thompson — Manager (PIN: 3456)
  v_salt := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.staff (company_id, name, pin_hash, pin_salt, role, permissions, active)
  VALUES (
    v_co, 'Alex Thompson',
    encode(hmac('3456', v_salt, 'sha256'), 'hex'), v_salt,
    'manager',
    '{"can_view_dashboard":true}'::jsonb,
    true
  ) RETURNING id INTO v_alex;

  -- Maria Garcia — Cashier (PIN: 1111)
  v_salt := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.staff (company_id, name, pin_hash, pin_salt, role, permissions, active)
  VALUES (
    v_co, 'Maria Garcia',
    encode(hmac('1111', v_salt, 'sha256'), 'hex'), v_salt,
    'cashier', '{}'::jsonb, true
  ) RETURNING id INTO v_maria;

  -- Tyler Brooks — Cashier (PIN: 2222)
  v_salt := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.staff (company_id, name, pin_hash, pin_salt, role, permissions, active)
  VALUES (
    v_co, 'Tyler Brooks',
    encode(hmac('2222', v_salt, 'sha256'), 'hex'), v_salt,
    'cashier', '{}'::jsonb, true
  ) RETURNING id INTO v_tyler;

  -- Jasmine Lee — Cashier (PIN: 3333)
  v_salt := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.staff (company_id, name, pin_hash, pin_salt, role, permissions, active)
  VALUES (
    v_co, 'Jasmine Lee',
    encode(hmac('3333', v_salt, 'sha256'), 'hex'), v_salt,
    'cashier', '{}'::jsonb, true
  ) RETURNING id INTO v_jasmine;

  -- David Kim — Cashier (PIN: 4444)
  v_salt := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.staff (company_id, name, pin_hash, pin_salt, role, permissions, active)
  VALUES (
    v_co, 'David Kim',
    encode(hmac('4444', v_salt, 'sha256'), 'hex'), v_salt,
    'cashier', '{}'::jsonb, true
  ) RETURNING id INTO v_david;

  -- Nicole Foster — Cashier, INACTIVE (PIN: 5555)
  v_salt := encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.staff (company_id, name, pin_hash, pin_salt, role, permissions, active)
  VALUES (
    v_co, 'Nicole Foster',
    encode(hmac('5555', v_salt, 'sha256'), 'hex'), v_salt,
    'cashier', '{}'::jsonb, false
  ) RETURNING id INTO v_nicole;

  -- ════════════════════════════════════════════════════════════════════════════
  -- 3. DROPS — 30 days of realistic register drops
  -- ════════════════════════════════════════════════════════════════════════════

  FOR v_day IN
    SELECT d::date FROM generate_series(
      current_date - interval '30 days',
      current_date - interval '1 day',
      '1 day'
    ) AS d
  LOOP
    -- Nicole was active until 10 days ago → include her in pool before that
    IF v_day < current_date - interval '10 days' THEN
      v_pool := ARRAY[
        v_maria, v_maria, v_maria,
        v_tyler, v_tyler, v_tyler,
        v_jasmine, v_jasmine,
        v_david, v_david,
        v_nicole, v_nicole,
        v_sam
      ];
    ELSE
      v_pool := ARRAY[
        v_maria, v_maria, v_maria, v_maria,
        v_tyler, v_tyler, v_tyler, v_tyler,
        v_jasmine, v_jasmine,
        v_david, v_david,
        v_sam
      ];
    END IF;

    -- Weekends: 2–4 drops; Weekdays: 4–7 drops
    IF extract(dow FROM v_day) IN (0, 6) THEN
      v_drops_count := 2 + floor(random() * 3)::int;
    ELSE
      v_drops_count := 4 + floor(random() * 4)::int;
    END IF;

    FOR i IN 1..v_drops_count LOOP
      -- Pick random staff from weighted pool
      v_staff := v_pool[1 + floor(random() * array_length(v_pool, 1))::int];

      -- Pick random target
      v_target := v_targets[1 + floor(random() * array_length(v_targets, 1))::int];

      -- Amount: target ± variance in $5 increments
      IF random() < 0.05 THEN
        -- 5%: big overage (+$60 to +$120)
        v_amount := v_target + (12 + floor(random() * 13)::int) * 500;
      ELSIF random() < 0.053 THEN
        -- ~5%: significant shortage (−$60 to −$100)
        v_amount := v_target - (12 + floor(random() * 9)::int) * 500;
      ELSE
        -- ~90%: normal variance ±$50
        v_amount := v_target + (floor(random() * 21)::int - 10) * 500;
      END IF;
      IF v_amount < 5000 THEN v_amount := 5000; END IF;

      -- ── Decompose dollars into bills ──
      v_dollars  := v_amount / 100;
      v_hundreds := 0;
      v_fifties  := 0;
      v_twenties := 0;
      v_tens     := 0;
      v_fives    := 0;

      IF v_dollars >= 300 AND random() < 0.25 THEN
        v_hundreds := LEAST(v_dollars / 100, 1 + floor(random() * 2)::int);
        v_dollars  := v_dollars - v_hundreds * 100;
      END IF;

      IF v_dollars >= 100 AND random() < 0.20 THEN
        v_fifties := LEAST(v_dollars / 50, 1 + floor(random() * 2)::int);
        v_dollars := v_dollars - v_fifties * 50;
      END IF;

      v_twenties := v_dollars / 20;
      v_dollars  := v_dollars - v_twenties * 20;

      v_tens    := v_dollars / 10;
      v_dollars := v_dollars - v_tens * 10;

      v_fives   := v_dollars / 5;

      -- Build drop_details JSON array (matches client format)
      v_details := '[]'::jsonb;
      IF v_hundreds > 0 THEN
        v_details := v_details || jsonb_build_array(jsonb_build_object(
          'label', '$100', 'count', v_hundreds, 'value', v_hundreds * 100, 'denom', 100));
      END IF;
      IF v_fifties > 0 THEN
        v_details := v_details || jsonb_build_array(jsonb_build_object(
          'label', '$50', 'count', v_fifties, 'value', v_fifties * 50, 'denom', 50));
      END IF;
      IF v_twenties > 0 THEN
        v_details := v_details || jsonb_build_array(jsonb_build_object(
          'label', '$20', 'count', v_twenties, 'value', v_twenties * 20, 'denom', 20));
      END IF;
      IF v_tens > 0 THEN
        v_details := v_details || jsonb_build_array(jsonb_build_object(
          'label', '$10', 'count', v_tens, 'value', v_tens * 10, 'denom', 10));
      END IF;
      IF v_fives > 0 THEN
        v_details := v_details || jsonb_build_array(jsonb_build_object(
          'label', '$5', 'count', v_fives, 'value', v_fives * 5, 'denom', 5));
      END IF;

      -- Recalculate amount_cents from bills to ensure consistency
      v_amount := (v_hundreds*100 + v_fifties*50 + v_twenties*20 + v_tens*10 + v_fives*5) * 100;

      -- Random time of day (8 AM – 9 PM)
      v_hour := 8 + floor(random() * 13)::int;
      v_min  := floor(random() * 60)::int;
      v_ts   := v_day
                + make_interval(hours => v_hour)
                + make_interval(mins  => v_min)
                + make_interval(secs  => floor(random() * 60)::int);

      -- Random note (mostly NULL — ~50% chance)
      v_note := v_notes[1 + floor(random() * array_length(v_notes, 1))::int];

      INSERT INTO public.drops (
        company_id, staff_id, amount_cents, target_cents,
        drop_details, shift_date, created_at
      ) VALUES (
        v_co, v_staff, v_amount, v_target,
        v_details, v_day, v_ts
      );
    END LOOP;
  END LOOP;

  -- ════════════════════════════════════════════════════════════════════════════
  -- 4. AUDIT LOG — realistic admin activity trail
  -- ════════════════════════════════════════════════════════════════════════════

  v_audit_ts := current_date - interval '29 days' + interval '9 hours 15 minutes';

  -- Day 1: owner created all staff
  INSERT INTO public.audit_log
    (company_id, staff_id, action, target_type, target_id, details, created_at)
  VALUES
    (v_co, v_jordan, 'staff.create', 'staff', v_sam,
     '{"target_name":"Sam Chen","role":"manager"}'::jsonb,
     v_audit_ts),
    (v_co, v_jordan, 'staff.create', 'staff', v_alex,
     '{"target_name":"Alex Thompson","role":"manager"}'::jsonb,
     v_audit_ts + interval '2 minutes'),
    (v_co, v_jordan, 'staff.create', 'staff', v_maria,
     '{"target_name":"Maria Garcia","role":"cashier"}'::jsonb,
     v_audit_ts + interval '5 minutes'),
    (v_co, v_jordan, 'staff.create', 'staff', v_tyler,
     '{"target_name":"Tyler Brooks","role":"cashier"}'::jsonb,
     v_audit_ts + interval '7 minutes'),
    (v_co, v_jordan, 'staff.create', 'staff', v_jasmine,
     '{"target_name":"Jasmine Lee","role":"cashier"}'::jsonb,
     v_audit_ts + interval '9 minutes'),
    (v_co, v_jordan, 'staff.create', 'staff', v_david,
     '{"target_name":"David Kim","role":"cashier"}'::jsonb,
     v_audit_ts + interval '11 minutes'),
    (v_co, v_jordan, 'staff.create', 'staff', v_nicole,
     '{"target_name":"Nicole Foster","role":"cashier"}'::jsonb,
     v_audit_ts + interval '13 minutes');

  -- Day 20: owner deactivated Nicole
  INSERT INTO public.audit_log
    (company_id, staff_id, action, target_type, target_id, details, created_at)
  VALUES
    (v_co, v_jordan, 'staff.deactivate', 'staff', v_nicole,
     '{"target_name":"Nicole Foster"}'::jsonb,
     current_date - interval '10 days' + interval '14 hours 22 minutes');

  -- Day 22: manager reset David's PIN
  INSERT INTO public.audit_log
    (company_id, staff_id, action, target_type, target_id, details, created_at)
  VALUES
    (v_co, v_sam, 'staff.pin_change', 'staff', v_david,
     '{"target_name":"David Kim"}'::jsonb,
     current_date - interval '8 days' + interval '11 hours 5 minutes');

  -- Day 25: manager deleted duplicate drops
  INSERT INTO public.audit_log
    (company_id, staff_id, action, target_type, target_id, details, created_at)
  VALUES
    (v_co, v_sam, 'drop.delete', 'drop', gen_random_uuid(),
     '{"target_name":"Tyler Brooks","amount_cents":32000}'::jsonb,
     current_date - interval '5 days' + interval '16 hours 45 minutes'),
    (v_co, v_sam, 'drop.delete', 'drop', gen_random_uuid(),
     '{"target_name":"Tyler Brooks","amount_cents":28500}'::jsonb,
     current_date - interval '5 days' + interval '16 hours 47 minutes');

  -- ── Re-enable audit triggers ──
  ALTER TABLE public.staff ENABLE TRIGGER audit_staff_changes;
  ALTER TABLE public.companies ENABLE TRIGGER audit_company_changes;

  -- ── Summary ──
  RAISE NOTICE '';
  RAISE NOTICE '✅  Acme Co demo seed complete!';
  RAISE NOTICE '    Company: acme-co  (id: %)', v_co;
  RAISE NOTICE '    Staff:   8 members (7 active, 1 inactive)';
  RAISE NOTICE '    Drops:   ~150 over 30 days';
  RAISE NOTICE '    Audit:   12 log entries';
  RAISE NOTICE '';
  RAISE NOTICE '🔑  Kiosk PINs: Jordan=1234  Sam=2345  Alex=3456';
  RAISE NOTICE '                 Maria=1111   Tyler=2222  Jasmine=3333  David=4444';
END;
$$;

-- ── Verification queries (run individually after seeding) ──
-- SELECT id, slug, name FROM companies WHERE slug = 'acme-co';
-- SELECT name, role, active FROM staff WHERE company_id = (SELECT id FROM companies WHERE slug = 'acme-co');
-- SELECT count(*), sum(amount_cents)/100 AS total_dollars FROM drops WHERE company_id = (SELECT id FROM companies WHERE slug = 'acme-co');
-- SELECT action, count(*) FROM audit_log WHERE company_id = (SELECT id FROM companies WHERE slug = 'acme-co') GROUP BY action ORDER BY count DESC;
