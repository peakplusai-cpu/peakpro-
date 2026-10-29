import Link from 'next/link';

import { BitgetAuthorizedLockup, BitgetRegisterCta } from '@/components/peakpro/bitget-brand';
import { TradeShell } from '@/components/peakpro/trade-shell';
import type { Locale } from '@/i18n/locale';
import { TRADE_APP_PATH } from '@/lib/peakpro/constants';
import { tPeakpro } from '@/lib/peakpro/copy';
import type { PeakProSession } from '@/lib/peakpro/types';

export function TradeLanding({ locale, session }: { locale: Locale; session: PeakProSession | null }) {
  const signedIn = Boolean(session?.userId);
  return (
    <TradeShell locale={locale} session={session} register={false}>
      <section className="mx-auto max-w-3xl py-10 lg:py-20">
        <p className="peakpro-kicker">
          <span className="peakpro-live" />
          {tPeakpro(locale, 'hunterBull')} · {tPeakpro(locale, 'hunterBear')}
        </p>
        <h1 className="mt-6 font-peakpro text-6xl font-bold uppercase tracking-[-0.02em] text-ice sm:text-7xl">
          {tPeakpro(locale, 'tradeBrand')}
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-ice-dim sm:text-xl">{tPeakpro(locale, 'tradeTagline')}</p>
        <div className="mt-6">
          <BitgetAuthorizedLockup locale={locale} />
        </div>
        <div className="mt-10 flex flex-wrap items-end gap-4">
          <Link
            href={signedIn ? TRADE_APP_PATH : `/login?redirect=${encodeURIComponent(TRADE_APP_PATH)}`}
            className="peakpro-btn"
          >
            {tPeakpro(locale, 'tradeCta')}
          </Link>
          <BitgetRegisterCta locale={locale} />
        </div>
      </section>
    </TradeShell>
  );
}
