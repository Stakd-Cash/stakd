-- ============================================================================
-- Stakd v1 Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- 1. COMPANIES
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  name text not null check (char_length(name) between 1 and 100),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kiosk_timeout_minutes integer not null default 10 check (kiosk_timeout_minutes between 1 and 480),
  created_at timestamptz not null default now()
);

comment on table public.companies is 'Each company is a single tenant with a unique slug.';
comment on column public.companies.kiosk_timeout_minutes is 'Session timeout for kiosk (PIN) mode, in minutes.';
comment on column public.companies.slug is 'URL-friendly identifier, e.g. acme-coffee';

-- 2. STAFF
create type public.staff_role as enum ('owner', 'manager', 'cashier');

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 1 and 100),
  pin_hash text not null,
  pin_salt text not null default '',
  role public.staff_role not null default 'cashier',
  permissions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.staff is 'Staff members within a company. user_id is set for owners/managers with Supabase Auth accounts.';
comment on column public.staff.permissions is 'JSON object of permission flags, e.g. {can_view_dashboard, can_edit_users, can_promote_managers}.';
comment on column public.staff.pin_hash is 'HMAC-SHA256 hash of the PIN with pin_salt. Never store raw PINs.';
comment on column public.staff.pin_salt is 'Random hex salt used as HMAC key for PIN hashing.';

-- 3. DROPS
create table public.drops (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  target_cents integer not null default 0 check (target_cents >= 0),
  drop_details jsonb not null default '[]'::jsonb,
  note text default null check (note is null or char_length(note) <= 500),
  shift_date date not null default current_date,
  created_at timestamptz not null default now()
);

comment on table public.drops is 'Individual cash drops recorded by staff.';
comment on column public.drops.note is 'Optional shift/drop note added by staff.';
comment on column public.drops.drop_details is 'JSON array of {label, value, count} for bill/coin breakdown.';

-- 4. INDEXES
create index idx_companies_owner on public.companies(owner_id);
create index idx_companies_slug on public.companies(slug);
create index idx_staff_company on public.staff(company_id);
create index idx_staff_user on public.staff(user_id);
create index idx_drops_company on public.drops(company_id);
create index idx_drops_staff on public.drops(staff_id);
create index idx_drops_shift on public.drops(company_id, shift_date);

-- 5. GRANTS
grant usage on schema public to anon, authenticated;
grant all on public.companies to authenticated;
grant all on public.staff to authenticated;
grant all on public.drops to authenticated;
grant select on public.companies to anon;

-- 6. ROW LEVEL SECURITY
alter table public.companies enable row level security;
alter table public.staff enable row level security;
alter table public.drops enable row level security;

-- Helper: get the company IDs the current auth user owns
create or replace function public.my_company_ids()
returns setof uuid
language sql
stable
security definer
as $$
  select id from public.companies where owner_id = auth.uid();
$$;

-- Helper: get staff record for current auth user in a given company
create or replace function public.my_staff_role(cid uuid)
returns public.staff_role
language sql
stable
security definer
as $$
  select role from public.staff
  where company_id = cid and user_id = auth.uid() and active = true
  limit 1;
$$;

-- --- COMPANIES policies ---

-- Owners can see their own companies
create policy "owners_select_own_companies"
  on public.companies for select
  using (owner_id = auth.uid());

-- Authenticated users can create a company (they become owner)
create policy "authenticated_insert_company"
  on public.companies for insert
  with check (auth.uid() = owner_id);

-- Owners can update their own company
create policy "owners_update_own_company"
  on public.companies for update
  using (owner_id = auth.uid());

-- Owners can delete their own company (cascades to staff, drops, audit_log)
create policy "owners_delete_own_company"
  on public.companies for delete
  using (owner_id = auth.uid());

-- Staff can view the company they belong to (for UI display)
create policy "staff_select_their_company"
  on public.companies for select
  using (
    id in (
      select company_id from public.staff
      where user_id = auth.uid() and active = true
    )
  );

-- Anyone can look up a company by slug (for join flow)
create policy "public_select_company_by_slug"
  on public.companies for select
  using (true);

-- --- STAFF policies ---

-- Owner/manager can see all staff in their company
create policy "company_admin_select_staff"
  on public.staff for select
  using (
    company_id in (select public.my_company_ids())
    or (user_id = auth.uid() and active = true)
    or public.my_staff_role(company_id) in ('owner', 'manager')
  );

-- Owner can insert staff
create policy "owner_insert_staff"
  on public.staff for insert
  with check (company_id in (select public.my_company_ids()));

-- Owner can update staff (change role, deactivate, etc.)
create policy "owner_update_staff"
  on public.staff for update
  using (company_id in (select public.my_company_ids()));

-- --- DROPS policies ---

-- Owner/manager can see all drops in their company
create policy "admin_select_drops"
  on public.drops for select
  using (
    public.my_staff_role(company_id) in ('owner', 'manager')
    or company_id in (select public.my_company_ids())
  );

-- Staff can see their own drops
create policy "staff_select_own_drops"
  on public.drops for select
  using (
    staff_id in (
      select id from public.staff where user_id = auth.uid()
    )
  );

-- Any active staff member of the company can insert a drop
create policy "staff_insert_drop"
  on public.drops for insert
  with check (
    staff_id in (
      select id from public.staff
      where company_id = drops.company_id
        and active = true
        and (
          user_id = auth.uid()
          or company_id in (select public.my_company_ids())
        )
    )
  );

-- Owner/manager can delete drops in their company
create policy "admin_delete_drops"
  on public.drops for delete
  using (
    public.my_staff_role(company_id) in ('owner', 'manager')
    or company_id in (select public.my_company_ids())
  );

-- --- STAFF insert policy for managers ---
-- Managers with can_edit_users permission can insert staff
create policy "manager_insert_staff"
  on public.staff for insert
  with check (
    public.my_staff_role(company_id) = 'manager'
    and (
      select (permissions->>'can_edit_users')::boolean
      from public.staff
      where company_id = staff.company_id and user_id = auth.uid() and active = true
      limit 1
    ) = true
  );

-- Managers with can_edit_users permission can update staff
create policy "manager_update_staff"
  on public.staff for update
  using (
    public.my_staff_role(company_id) = 'manager'
    and (
      select (permissions->>'can_edit_users')::boolean
      from public.staff
      where company_id = staff.company_id and user_id = auth.uid() and active = true
      limit 1
    ) = true
  );

-- 7. AUDIT LOG
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete set null,
  action text not null check (char_length(action) between 1 and 100),
  target_type text default null check (target_type is null or char_length(target_type) <= 50),
  target_id uuid default null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_log is 'Tracks admin actions: staff edits, settings changes, drop deletions, etc.';
comment on column public.audit_log.action is 'Action name, e.g. staff.create, staff.deactivate, drop.delete, settings.update';
comment on column public.audit_log.target_type is 'Entity type affected: staff, drop, company';
comment on column public.audit_log.target_id is 'UUID of the affected entity';

create index idx_audit_company on public.audit_log(company_id);
create index idx_audit_created on public.audit_log(company_id, created_at desc);

grant all on public.audit_log to authenticated;

alter table public.audit_log enable row level security;

-- Owner/manager can view audit log for their company
create policy "admin_select_audit_log"
  on public.audit_log for select
  using (
    public.my_staff_role(company_id) in ('owner', 'manager')
    or company_id in (select public.my_company_ids())
  );

-- Any authenticated user can insert audit entries for companies they belong to
create policy "staff_insert_audit_log"
  on public.audit_log for insert
  with check (
    company_id in (select public.my_company_ids())
    or public.my_staff_role(company_id) in ('owner', 'manager')
  );

-- 8. REALTIME — enable for drops so admin dashboard gets live updates
alter publication supabase_realtime add table public.drops;
