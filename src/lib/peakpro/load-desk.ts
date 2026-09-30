import { redirect } from 'next/navigation';

import { requireAuthUser } from '@/lib/auth';
import { filterCacheForTier, readPeakProCache, slimCacheForModule } from '@/lib/peakpro/cache';
import type { PeakProModule } from '@/lib/peakpro/constants';
import { loadPeakProSession } from '@/lib/peakpro/profile';
import { isTaiwanSymbol } from '@/lib/peakpro/yahoo';

export async function loadPeakProDesk(options?: {
  allowRevoked?: boolean;
  moduleId?: PeakProModule;
}) {
  const { user } = await requireAuthUser();
  if (!user) redirect('/login?redirect=/app');

  const [session, raw] = await Promise.all([
    loadPeakProSession(user.id, user.email ?? null),
    readPeakProCache(),
  ]);
  if (session.revoked && !options?.allowRevoked) {
    redirect('/subscribe?revoked=1');
  }

  let cache = filterCacheForTier(raw, session.tier);
  const moduleId = options?.moduleId;
  if (moduleId === 'taiwan' || moduleId === 'us') {
    cache = {
      ...cache,
      equities: cache.equities.filter((row) =>
        moduleId === 'taiwan' ? isTaiwanSymbol(row.symbol) : !isTaiwanSymbol(row.symbol),
      ),
    };
  }
  if (moduleId) cache = slimCacheForModule(cache, moduleId);

  return { session, cache };
}
