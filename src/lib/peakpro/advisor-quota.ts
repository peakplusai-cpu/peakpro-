import { ADVISOR_DAILY_LIMIT } from '@/lib/peakpro/constants';
import { createAdminClient } from '@/lib/supabase/admin';

export function taipeiDay(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
}

function isMissingColumn(message: string | undefined): boolean {
  return Boolean(
    message &&
      (/advisor_quota/i.test(message) || /column .* does not exist/i.test(message) || /schema cache/i.test(message)),
  );
}

export type AdvisorQuota = {
  used: number;
  remaining: number | null;
  limit: number;
  ready: boolean;
};

export async function readAdvisorQuota(userId: string): Promise<AdvisorQuota> {
  const limit = ADVISOR_DAILY_LIMIT;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('peakpro_profiles')
      .select('advisor_quota_day, advisor_quota_count')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      if (isMissingColumn(error.message)) return { used: 0, remaining: null, limit, ready: false };
      console.warn('[peakpro/advisor] quota read failed', error.message);
      return { used: 0, remaining: null, limit, ready: false };
    }
    const today = taipeiDay();
    const used = data?.advisor_quota_day === today ? Number(data?.advisor_quota_count ?? 0) : 0;
    return { used, remaining: Math.max(0, limit - used), limit, ready: true };
  } catch (error) {
    console.warn('[peakpro/advisor] quota read exception', error);
    return { used: 0, remaining: null, limit, ready: false };
  }
}

export async function consumeAdvisorQuota(userId: string): Promise<AdvisorQuota & { ok: boolean }> {
  const current = await readAdvisorQuota(userId);
  if (!current.ready) {
    return { ...current, ok: true };
  }
  if ((current.remaining ?? 0) <= 0) {
    return { ...current, remaining: 0, ok: false };
  }
  const next = current.used + 1;
  const admin = createAdminClient();
  const { error } = await admin
    .from('peakpro_profiles')
    .update({
      advisor_quota_day: taipeiDay(),
      advisor_quota_count: next,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) {
    if (isMissingColumn(error.message)) return { ...current, ok: true, ready: false, remaining: null };
    console.warn('[peakpro/advisor] quota write failed', error.message);
    return { ...current, ok: true };
  }
  return { used: next, remaining: current.limit - next, limit: current.limit, ready: true, ok: true };
}
