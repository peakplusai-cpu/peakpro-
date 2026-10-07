-- Beginner primer quiz: five attempts per Taipei calendar day.
alter table public.peakpro_profiles
  add column if not exists quiz_quota_day date,
  add column if not exists quiz_quota_count integer not null default 0;
