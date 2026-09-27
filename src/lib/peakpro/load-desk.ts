import { redirect } from 'next/navigation';

import { requireAuthUser } from '@/lib/auth';
import { filterCacheForTier } from '@/lib/peakpro/cache';
import { readPeakProCache } from '@/lib/peakpro/cache';
import { loadPeakProSession } from '@/lib/peakpro/profile';

export async function loadPeakProDesk(options?: {
  allowRevoked?: boolean;
  localizeNews?: boolean;
}) {
  const { user } = await requireAuthUser();
  if (!user) redirect('/login?redirect=/app');

  const session = await loadPeakProSession(user.id, user.email ?? null);
  if (session.revoked && !options?.allowRevoked) {
    redirect('/subscribe?revoked=1');
  }

  const raw = await readPeakProCache({ localizeNews: options?.localizeNews });
  return {
    session,
    cache: filterCacheForTier(raw, session.tier),
  };
}
