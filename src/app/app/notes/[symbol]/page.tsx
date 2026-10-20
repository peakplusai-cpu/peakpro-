import { after } from 'next/server';

import { PeakProAppShell } from '@/components/peakpro/app-shell';
import { PeakProNameNote } from '@/components/peakpro/name-note';
import { PeakProPaywall } from '@/components/peakpro/paywall';
import { getLocale } from '@/i18n/server';
import { tPeakpro } from '@/lib/peakpro/copy';
import { eventsForDesk } from '@/lib/peakpro/macro-calendar';
import { loadPeakProDesk } from '@/lib/peakpro/load-desk';
import {
  buildFallbackNameNote,
  ensureNameDeskNote,
  nameFiguresHash,
  newsForName,
  noteFits,
  readStoredNameNote,
} from '@/lib/peakpro/name-note';
import { ingestEquitySymbol } from '@/lib/peakpro/scraper';
import { readEquityRows } from '@/lib/peakpro/cache';
import { isTaiwanSymbol } from '@/lib/peakpro/yahoo';

export default async function NameNotePage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = await params;
  const locale = await getLocale();
  const { session, cache, desk } = await loadPeakProDesk({ moduleId: 'overview' });
  const symbol = decodeURIComponent(raw).trim().toUpperCase();
  const blocked = !symbol || (desk === 'us' && isTaiwanSymbol(symbol));

  let rows = blocked ? [] : cache.equities.filter((row) => row.symbol === symbol);
  if (!blocked && rows.length === 0 && session.tier === 'premium') {
    await ingestEquitySymbol(symbol);
    rows = await readEquityRows(symbol);
  }

  const snapshot = rows.length
    ? { ...cache, equities: [...cache.equities.filter((row) => row.symbol !== symbol), ...rows] }
    : cache;
  const daily =
    snapshot.equities.find((row) => row.symbol === symbol && row.timeframe === 'daily') ??
    snapshot.equities.find((row) => row.symbol === symbol) ??
    null;
  const name = daily?.payload.name ?? symbol;
  let note = null;
  if (!blocked && session.tier === 'premium') {
    const hash = nameFiguresHash(snapshot, desk, symbol);
    const stored = await readStoredNameNote(symbol);
    note = stored && noteFits(stored, hash) ? stored : buildFallbackNameNote(snapshot, desk, symbol);
    after(() =>
      ensureNameDeskNote(snapshot, desk, symbol, { upgradeTemplate: true }).catch((error) => {
        console.warn('[peakpro/notes] fill failed', error);
      }),
    );
  }

  return (
    <PeakProAppShell locale={locale} session={session} moduleId="overview" cache={cache}>
      {session.tier === 'premium' ? (
        <PeakProNameNote
          locale={locale}
          usdTwd={desk === 'us' ? null : cache.usdTwd}
          symbol={symbol}
          row={blocked ? null : daily}
          note={blocked ? null : note}
          prints={blocked ? [] : eventsForDesk(cache.calendar, desk)}
          news={blocked ? [] : newsForName(snapshot, symbol, name)}
        />
      ) : (
        <PeakProPaywall locale={locale} body={tPeakpro(locale, 'nameLocked')} />
      )}
    </PeakProAppShell>
  );
}
