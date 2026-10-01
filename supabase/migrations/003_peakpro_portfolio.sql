-- Personal lots for the PeakPro+ book. Users CRUD only their own rows.
create table if not exists public.peakpro_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book text not null check (book in ('taiwan', 'us', 'crypto', 'gold')),
  symbol text not null,
  quantity numeric not null check (quantity > 0 and quantity < 1000000000),
  cost numeric not null check (cost >= 0 and cost < 1000000000),
  currency text not null check (currency in ('TWD', 'USD')),
  bought_on date,
  created_at timestamptz not null default now()
);

create index if not exists peakpro_lots_user_created_idx
  on public.peakpro_lots (user_id, created_at desc);

alter table public.peakpro_lots enable row level security;

drop policy if exists peakpro_lots_select_own on public.peakpro_lots;
create policy peakpro_lots_select_own
  on public.peakpro_lots for select to authenticated
  using (user_id = auth.uid());

drop policy if exists peakpro_lots_insert_own on public.peakpro_lots;
create policy peakpro_lots_insert_own
  on public.peakpro_lots for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists peakpro_lots_update_own on public.peakpro_lots;
create policy peakpro_lots_update_own
  on public.peakpro_lots for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists peakpro_lots_delete_own on public.peakpro_lots;
create policy peakpro_lots_delete_own
  on public.peakpro_lots for delete to authenticated
  using (user_id = auth.uid());
