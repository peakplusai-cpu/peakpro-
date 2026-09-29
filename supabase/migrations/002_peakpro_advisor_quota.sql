-- PeakPro+ desk advisor daily quota (Taipei calendar day, enforced in app).
alter table public.peakpro_profiles
  add column if not exists advisor_quota_day date,
  add column if not exists advisor_quota_count integer not null default 0;
