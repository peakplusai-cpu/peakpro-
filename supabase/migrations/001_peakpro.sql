-- PeakPro+ market intelligence warehouse + freemium subscription profiles.
-- Client sessions read only these tables. External vendors are scraped by cron.

create table if not exists public.peakpro_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  tier text not null default 'free' check (tier in ('free', 'premium')),
  expires_at timestamptz,
  creem_customer_id text,
  creem_subscription_id text,
  creem_last_transaction_id text,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists peakpro_profiles_customer_idx
  on public.peakpro_profiles (creem_customer_id);
create index if not exists peakpro_profiles_subscription_idx
  on public.peakpro_profiles (creem_subscription_id);

create table if not exists public.market_data (
  id uuid primary key default gen_random_uuid(),
  asset_class text not null check (asset_class in ('equity', 'crypto', 'gold', 'index', 'ranking')),
  symbol text not null,
  timeframe text not null check (timeframe in ('daily', 'monthly', 'annual', 'spot', 'weekly')),
  payload jsonb not null default '{}'::jsonb,
  last_updated timestamptz not null default now(),
  unique (asset_class, symbol, timeframe)
);

create index if not exists market_data_class_symbol_idx
  on public.market_data (asset_class, symbol);

create table if not exists public.news_cache (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'geopolitics',
  title text not null,
  title_zh text not null default '',
  summary text not null default '',
  summary_zh text not null default '',
  source text not null default '',
  url text not null default '',
  published_at timestamptz,
  last_updated timestamptz not null default now()
);

create index if not exists news_cache_published_idx
  on public.news_cache (published_at desc);

create table if not exists public.ai_summaries (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'weekly_market',
  locale text not null check (locale in ('en', 'zh')),
  title text not null,
  content text not null,
  period_start date not null,
  period_end date not null,
  last_updated timestamptz not null default now(),
  unique (kind, locale, period_start)
);

alter table public.peakpro_profiles enable row level security;
alter table public.market_data enable row level security;
alter table public.news_cache enable row level security;
alter table public.ai_summaries enable row level security;

drop policy if exists peakpro_profiles_select_own on public.peakpro_profiles;
create policy peakpro_profiles_select_own
  on public.peakpro_profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists market_data_authenticated_read on public.market_data;
create policy market_data_authenticated_read
  on public.market_data
  for select
  to authenticated
  using (true);

drop policy if exists news_cache_authenticated_read on public.news_cache;
create policy news_cache_authenticated_read
  on public.news_cache
  for select
  to authenticated
  using (true);

drop policy if exists ai_summaries_authenticated_read on public.ai_summaries;
create policy ai_summaries_authenticated_read
  on public.ai_summaries
  for select
  to authenticated
  using (true);

create or replace function public.peakpro_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.peakpro_profiles (id, email, tier)
  values (new.id, new.email, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists peakpro_on_auth_user_created on auth.users;
create trigger peakpro_on_auth_user_created
  after insert on auth.users
  for each row execute function public.peakpro_handle_new_user();
