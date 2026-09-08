-- Fantasy Bugg: användarförslag på nya parkonstellationer
create table if not exists public.fantasy_pair_requests (
  id uuid primary key default gen_random_uuid(),
  dancer_a text not null,
  dancer_b text not null,
  age_class text not null check (age_class in ('Junior','Vuxen','Senior')),
  proposed_price numeric not null,
  price numeric,
  pair_index integer unique,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_by uuid not null references auth.users(id) on delete cascade,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.fantasy_pair_requests enable row level security;

drop policy if exists "pair requests insert own" on public.fantasy_pair_requests;
create policy "pair requests insert own"
on public.fantasy_pair_requests
for insert
to authenticated
with check (
  submitted_by = auth.uid()
  and status = 'pending'
  and pair_index is null
  and price is null
);

drop policy if exists "pair requests read approved own admin" on public.fantasy_pair_requests;
create policy "pair requests read approved own admin"
on public.fantasy_pair_requests
for select
to anon, authenticated
using (
  status = 'approved'
  or submitted_by = auth.uid()
  or auth.uid() = '7408ec3a-29d1-4b48-8cd0-30d20b9155d7'::uuid
);

drop policy if exists "pair requests admin update" on public.fantasy_pair_requests;
create policy "pair requests admin update"
on public.fantasy_pair_requests
for update
to authenticated
using (
  auth.uid() = '7408ec3a-29d1-4b48-8cd0-30d20b9155d7'::uuid
)
with check (
  auth.uid() = '7408ec3a-29d1-4b48-8cd0-30d20b9155d7'::uuid
);

create index if not exists fantasy_pair_requests_status_idx
  on public.fantasy_pair_requests(status);
create index if not exists fantasy_pair_requests_pair_index_idx
  on public.fantasy_pair_requests(pair_index);
