-- Session prints (3-hour snapshots) + official TWSE/TPEX institutional net buys.
-- Authenticated clients may read. Only the service-role scraper writes.

create table if not exists public.peakpro_session_prints (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  name text not null default '',
  market text not null check (market in ('taiwan', 'us')),
  session_date date not null,
  scraped_at timestamptz not null default now(),
  price numeric,
  change_pct numeric,
  volume numeric,
  day_open numeric,
  day_high numeric,
  day_low numeric,
  prev_close numeric,
  currency text not null check (currency in ('TWD', 'USD'))
);

create index if not exists peakpro_session_prints_lookup_idx
  on public.peakpro_session_prints (symbol, session_date, scraped_at desc);

create index if not exists peakpro_session_prints_date_idx
  on public.peakpro_session_prints (session_date desc, scraped_at desc);

create table if not exists public.peakpro_institutional (
  trade_date date not null,
  symbol text not null,
  name text not null default '',
  foreign_net bigint not null default 0,
  trust_net bigint not null default 0,
  dealer_net bigint not null default 0,
  total_net bigint not null default 0,
  source text not null default 'twse',
  last_updated timestamptz not null default now(),
  primary key (trade_date, symbol)
);

create index if not exists peakpro_institutional_symbol_idx
  on public.peakpro_institutional (symbol, trade_date desc);

alter table public.peakpro_session_prints enable row level security;
alter table public.peakpro_institutional enable row level security;

drop policy if exists peakpro_session_prints_read on public.peakpro_session_prints;
create policy peakpro_session_prints_read
  on public.peakpro_session_prints for select to authenticated
  using (true);

drop policy if exists peakpro_institutional_read on public.peakpro_institutional;
create policy peakpro_institutional_read
  on public.peakpro_institutional for select to authenticated
  using (true);
