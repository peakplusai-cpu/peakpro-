import { LEARN_QUIZ_LIMIT } from '@/lib/peakpro/constants';
import { taipeiDay } from '@/lib/peakpro/advisor-quota';
import { createAdminClient } from '@/lib/supabase/admin';

function isMissingColumn(message: string | undefined) {
  return Boolean(
    message &&
      (/quiz_quota/i.test(message) || /column .* does not exist/i.test(message) || /schema cache/i.test(message)),
  );
}

export type QuizQuota = {
  used: number;
  remaining: number | null;
  limit: number;
  ready: boolean;
};

export async function readQuizQuota(userId: string): Promise<QuizQuota> {
  const limit = LEARN_QUIZ_LIMIT;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('peakpro_profiles')
      .select('quiz_quota_day, quiz_quota_count')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      if (isMissingColumn(error.message)) return { used: 0, remaining: null, limit, ready: false };
      console.warn('[peakpro/quiz] quota read failed', error.message);
      return { used: 0, remaining: null, limit, ready: false };
    }
    const today = taipeiDay();
    const used = data?.quiz_quota_day === today ? Number(data?.quiz_quota_count ?? 0) : 0;
    return { used, remaining: Math.max(0, limit - used), limit, ready: true };
  } catch (error) {
    console.warn('[peakpro/quiz] quota read exception', error);
    return { used: 0, remaining: null, limit, ready: false };
  }
}

export async function consumeQuizQuota(userId: string): Promise<QuizQuota & { ok: boolean }> {
  const current = await readQuizQuota(userId);
  if (!current.ready) return { ...current, ok: true };
  if ((current.remaining ?? 0) <= 0) return { ...current, remaining: 0, ok: false };
  const next = current.used + 1;
  const admin = createAdminClient();
  const { error } = await admin
    .from('peakpro_profiles')
    .update({
      quiz_quota_day: taipeiDay(),
      quiz_quota_count: next,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) {
    if (isMissingColumn(error.message)) return { ...current, ok: true, ready: false, remaining: null };
    console.warn('[peakpro/quiz] quota write failed', error.message);
    return { ...current, ok: true };
  }
  return { used: next, remaining: current.limit - next, limit: current.limit, ready: true, ok: true };
}
