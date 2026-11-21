-- ============================================================
-- Urban Home Care: database schema, RLS and starting totals
-- Run this whole file once in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ---------- Founders (the only accounts allowed in) ----------
create table if not exists public.founders (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  label      text not null,
  created_at timestamptz not null default now()
);

-- Security-definer helper: true when the current JWT user is a founder.
-- search_path is empty so it cannot be hijacked by objects in other schemas.
create or replace function public.is_founder()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.founders f
    where f.user_id = (select auth.uid())
  );
$$;

-- ---------- Bookings ----------
create table if not exists public.bookings (
  id             uuid primary key default gen_random_uuid(),
  customer_name  text not null check (length(trim(customer_name)) > 0),
  phone          text not null check (length(regexp_replace(phone, '\D', '', 'g')) >= 10),
  area           text not null check (area in ('Anand','VV Nagar','Karamsad','Bakrol','Mogri','Nadiad','Other')),
  address        text not null,
  sofa_size      text not null check (sofa_size in ('3 Seater','4 Seater','5 Seater','6 Seater','7 Seater','L-Shape','Other')),
  service        text not null default 'Sofa deep cleaning',
  booking_date   date not null,
  preferred_time text not null,
  price          numeric(10,2) not null default 0 check (price >= 0),
  notes          text,
  status         text not null default 'New'
                 check (status in ('New','Confirmed','In Progress','Completed','Cancelled')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists bookings_booking_date_idx on public.bookings (booking_date);
create index if not exists bookings_status_idx on public.bookings (status);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bookings_touch_updated_at on public.bookings;
create trigger bookings_touch_updated_at
  before update on public.bookings
  for each row execute function public.touch_updated_at();

-- ---------- Payments (money actually received is status = 'Paid') ----------
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings (id) on delete restrict,
  amount       numeric(10,2) not null check (amount > 0),
  method       text not null check (method in ('Cash','UPI','Bank Transfer')),
  payment_date date not null,
  status       text not null default 'Paid' check (status in ('Paid','Unpaid')),
  created_at   timestamptz not null default now()
);

create index if not exists payments_booking_idx on public.payments (booking_id);

-- ---------- Expenses (Equipment is a capital asset, not an operating expense) ----------
create table if not exists public.expenses (
  id              uuid primary key default gen_random_uuid(),
  expense_date    date not null,
  category        text not null check (category in ('Meta Ads','Fuel','Chemicals','Equipment','Other')),
  amount          numeric(10,2) not null check (amount > 0),
  paid_by         text not null check (paid_by in ('Founder 1','Founder 2','Business')),
  notes           text,
  is_capital_asset boolean generated always as (category = 'Equipment') stored,
  created_at      timestamptz not null default now()
);

create index if not exists expenses_date_idx on public.expenses (expense_date);

-- ---------- Opening balances (starting reference totals, NOT customer transactions) ----------
create table if not exists public.opening_balances (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  category   text check (category in ('Meta Ads','Fuel','Chemicals','Equipment','Other')),
  kind       text not null check (kind in ('jobs','revenue','expense','asset')),
  amount     numeric(10,2) not null check (amount >= 0),
  note       text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security: only founders can read or write anything
-- ============================================================
alter table public.founders         enable row level security;
alter table public.bookings         enable row level security;
alter table public.payments         enable row level security;
alter table public.expenses         enable row level security;
alter table public.opening_balances enable row level security;

-- A founder may see their own founders row (used by the app to confirm access).
-- No insert/update/delete policy on founders: founders are added only via SQL.
drop policy if exists "founder reads own row" on public.founders;
create policy "founder reads own row"
  on public.founders for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "founders manage bookings" on public.bookings;
create policy "founders manage bookings"
  on public.bookings for all to authenticated
  using ((select public.is_founder()))
  with check ((select public.is_founder()));

drop policy if exists "founders manage payments" on public.payments;
create policy "founders manage payments"
  on public.payments for all to authenticated
  using ((select public.is_founder()))
  with check ((select public.is_founder()));

drop policy if exists "founders manage expenses" on public.expenses;
create policy "founders manage expenses"
  on public.expenses for all to authenticated
  using ((select public.is_founder()))
  with check ((select public.is_founder()));

drop policy if exists "founders manage opening balances" on public.opening_balances;
create policy "founders manage opening balances"
  on public.opening_balances for all to authenticated
  using ((select public.is_founder()))
  with check ((select public.is_founder()));

-- Defense in depth: anonymous (logged-out) visitors get nothing at all.
revoke all on public.founders, public.bookings, public.payments,
              public.expenses, public.opening_balances from anon;

-- ============================================================
-- STEP A: Add the two founders AFTER creating their accounts
-- (Supabase Dashboard > Authentication > Users > Add user, with
--  "Auto Confirm User" ticked and password set by you.)
-- Replace the two example emails below, then run this block.
-- ============================================================
insert into public.founders (user_id, label)
select id, 'Founder 1' from auth.users where email = 'founder1@example.com'
union all
select id, 'Founder 2' from auth.users where email = 'founder2@example.com'
on conflict (user_id) do nothing;

-- ============================================================
-- STEP B: Starting reference totals (run ONCE).
-- These are aggregate opening figures, not customer bookings or payments.
-- Fuel (Rs 200-300) is intentionally NOT seeded because the exact amount
-- was not given; add it through the Expenses page once you know it.
-- ============================================================
insert into public.opening_balances (label, category, kind, amount, note) values
  ('Completed jobs before app',       null,        'jobs',    10,      'Starting reference count'),
  ('Revenue collected before app',    null,        'revenue', 10000,   'Starting reference total, not individual payments'),
  ('Meta advertising before app',     'Meta Ads',  'expense', 847.46,  'Starting reference total'),
  ('Cleaning machine (capital asset)','Equipment', 'asset',   4000,    'Capital asset'),
  ('Initial chemical purchase',       'Chemicals', 'expense', 260,     'Starting reference total');
