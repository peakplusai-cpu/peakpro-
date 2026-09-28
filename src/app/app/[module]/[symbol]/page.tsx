import { notFound } from 'next/navigation';

import { PeakProAppShell } from '@/components/peakpro/app-shell';
import { PeakProEquityDetail } from '@/components/peakpro/equity-detail';
import { PeakProPaywall } from '@/components/peakpro/paywall';
import { getLocale } from '@/i18n/server';
import { canOpenEquity } from '@/lib/peakpro/access';
import { loadPeakProDesk } from '@/lib/peakpro/load-desk';
import { isTaiwanSymbol, normalizeEquityQuery, type EquityMarket } from '@/lib/peakpro/yahoo';

function isEquityMarket(value: string): value is EquityMarket {
  return value === 'taiwan' || value === 'us';
}

export default async function EquityDetailPage({
  params,
}: {
  params: Promise<{ module: string; symbol: string }>;
}) {
  const { module: moduleId, symbol: rawSymbol } = await params;
  if (!isEquityMarket(moduleId)) notFound();

  const parsed = normalizeEquityQuery(decodeURIComponent(rawSymbol), moduleId);
  if (parsed.error && parsed.error !== 'empty') notFound();
  const symbol = parsed.symbol;
  if (!symbol) notFound();
  if (moduleId === 'taiwan' ? !isTaiwanSymbol(symbol) : isTaiwanSymbol(symbol)) notFound();

  const locale = await getLocale();
  const { session, cache } = await loadPeakProDesk();
  const rows = cache.equities.filter((row) => row.symbol === symbol);

  return (
    <PeakProAppShell locale={locale} session={session} moduleId={moduleId} cache={cache}>
      {canOpenEquity(session.tier, symbol) ? (
        <PeakProEquityDetail
          locale={locale}
          tier={session.tier}
          market={moduleId}
          symbol={symbol}
          rows={rows}
        />
      ) : (
        <PeakProPaywall locale={locale} />
      )}
    </PeakProAppShell>
  );
}
