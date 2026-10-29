import { notFound } from 'next/navigation';

import { PeakProEquityDetail } from '@/components/peakpro/equity-detail';
import { TradeShell } from '@/components/peakpro/trade-shell';
import { getLocale } from '@/i18n/server';
import { normalizeCryptoSymbol } from '@/lib/peakpro/constants';
import { requireTradeSession } from '@/lib/peakpro/trade-session';

export default async function TradeNamePage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = await params;
  const parsed = normalizeCryptoSymbol(decodeURIComponent(raw));
  if (parsed.error) notFound();
  const locale = await getLocale();
  const { session } = await requireTradeSession();
  return (
    <TradeShell locale={locale} session={session} register>
      <PeakProEquityDetail locale={locale} tier={session.tier} market="crypto" symbol={parsed.symbol} rows={[]} />
    </TradeShell>
  );
}
