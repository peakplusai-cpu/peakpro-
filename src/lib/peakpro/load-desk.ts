import { after } from 'next/server';
import { redirect } from 'next/navigation';

import { requireAuthUser } from '@/lib/auth';
import {
  calendarCacheAgeMs,
  filingsCacheAgeMs,
  filterCacheForTier,
  newsCacheAgeMs,
  readPeakProCache,
  slimCacheForModule,
} from '@/lib/peakpro/cache';
import type { PeakProModule } from '@/lib/peakpro/constants';
import { calendarNeedsPrintRefresh, calendarNeedsReportFill } from '@/lib/peakpro/macro-calendar';
import { asEquityDesk, modulesForDesk, stripTaiwanCache } from '@/lib/peakpro/desk-region';
import { fillDeskPrintReports } from '@/lib/peakpro/print-report';
import { getDeskRegion } from '@/lib/peakpro/desk-region-server';
import { loadPeakProSession } from '@/lib/peakpro/profile';
import {
  CALENDAR_STALE_MS,
  FILINGS_STALE_MS,
  NEWS_STALE_MS,
  runPeakProCalendarScrape,
  runPeakProFilingsScrape,
  runPeakProNewsScrape,
} from '@/lib/peakpro/scraper';
import { isTaiwanSymbol } from '@/lib/peakpro/yahoo';

export async function loadPeakProDesk(options?: {
  allowRevoked?: boolean;
  moduleId?: PeakProModule;
}) {
  const { user } = await requireAuthUser();
  if (!user) redirect('/login?redirect=/app');

  const [session, raw, desk] = await Promise.all([
    loadPeakProSession(user.id, user.email ?? null),
    readPeakProCache(),
    getDeskRegion(),
  ]);
  if (desk === 'us' && options?.moduleId === 'taiwan') {
    redirect('/app/us');
  }
  if (
    desk === 'crypto' &&
    options?.moduleId &&
    options.moduleId !== 'overview' &&
    !modulesForDesk('crypto').includes(options.moduleId)
  ) {
    redirect('/app/crypto');
  }
  if (session.revoked && !options?.allowRevoked) {
    redirect('/subscribe?revoked=1');
  }

  const calendarAge = calendarCacheAgeMs(raw);
  if (calendarAge == null || calendarAge > CALENDAR_STALE_MS || calendarNeedsPrintRefresh(raw.calendar)) {
    after(() =>
      runPeakProCalendarScrape().catch((error) => {
        console.warn('[peakpro/desk] calendar refresh failed', error);
      }),
    );
  }

  if (session.tier === 'premium') {
    if (calendarNeedsReportFill(raw.calendar, asEquityDesk(desk))) {
      after(() =>
        fillDeskPrintReports(asEquityDesk(desk)).catch((error) => {
          console.warn('[peakpro/desk] print reports failed', error);
        }),
      );
    }
    const newsAge = newsCacheAgeMs(raw);
    if (newsAge == null || newsAge > NEWS_STALE_MS) {
      after(() =>
        runPeakProNewsScrape().catch((error) => {
          console.warn('[peakpro/desk] news refresh failed', error);
        }),
      );
    }
    const filingsAge = filingsCacheAgeMs(raw);
    if (filingsAge == null || filingsAge > FILINGS_STALE_MS) {
      after(() =>
        runPeakProFilingsScrape().catch((error) => {
          console.warn('[peakpro/desk] filings refresh failed', error);
        }),
      );
    }
  }

  let cache = stripTaiwanCache(filterCacheForTier(raw, session.tier), desk);
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

  return { session, cache, desk };
}
