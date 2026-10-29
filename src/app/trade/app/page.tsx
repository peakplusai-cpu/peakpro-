import { PeakProCryptoDesk } from '@/components/peakpro/crypto-bitget';
import { TradeShell } from '@/components/peakpro/trade-shell';
import { getLocale } from '@/i18n/server';
import { requireTradeSession } from '@/lib/peakpro/trade-session';

export default async function TradeDeskPage() {
  const locale = await getLocale();
  const { session } = await requireTradeSession();
  return (
    <TradeShell locale={locale} session={session} register>
      <PeakProCryptoDesk locale={locale} rows={[]} />
    </TradeShell>
  );
}
