import { after } from 'next/server';
import { redirect } from 'next/navigation';

import { requireAuthUser } from '@/lib/auth';
import { filterCacheForTier, newsCacheAgeMs, readPeakProCache, slimCacheForModule } from '@/lib/peakpro/cache';
import type { PeakProModule } from '@/lib/peakpro/constants';
import { loadPeakProSession } from '@/lib/peakpro/profile';
import { NEWS_STALE_MS, runPeakProNewsScrape } from '@/lib/peakpro/scraper';
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

  const newsAge = newsCacheAgeMs(raw);
  if (session.tier === 'premium' && (newsAge == null || newsAge > NEWS_STALE_MS)) {
    after(() =>
      runPeakProNewsScrape().catch((error) => {
        console.warn('[peakpro/desk] news refresh failed', error);
      }),
    );
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
