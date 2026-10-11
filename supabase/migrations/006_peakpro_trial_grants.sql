-- Lifetime trial lock. Survives auth user deletion so the same mailbox cannot replay Premium.
create table if not exists public.peakpro_trial_grants (
  email_key text primary key,
  user_id uuid not null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create unique index if not exists peakpro_trial_grants_user_idx
  on public.peakpro_trial_grants (user_id);

alter table public.peakpro_trial_grants enable row level security;
