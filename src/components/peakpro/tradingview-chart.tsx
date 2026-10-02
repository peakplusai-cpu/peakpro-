'use client';

import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import {
  canEmbedTradingViewSymbol,
  tradingviewChartUrl,
  tradingviewEmbedSrc,
} from '@/lib/peakpro/tradingview';

export function PeakProTradingViewChart({
  symbol,
  locale,
  timezone,
}: {
  symbol: string;
  locale: Locale;
  timezone: string;
}) {
  if (!symbol) return null;

  const href = tradingviewChartUrl(symbol, locale);

  if (!canEmbedTradingViewSymbol(symbol)) {
    return (
      <div className="flex h-[520px] min-h-[520px] w-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-md text-sm leading-relaxed text-zinc-400">{tPeakpro(locale, 'tvOpenHint')}</p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-gold px-6 py-2.5 text-sm text-black hover:bg-gold-antique"
        >
          {tPeakpro(locale, 'tvOpen')}
        </a>
      </div>
    );
  }

  return (
    <iframe
      key={symbol}
      title={symbol}
      src={tradingviewEmbedSrc(symbol, locale, timezone)}
      className="h-[520px] w-full min-h-[520px] border-0 bg-black"
      referrerPolicy="origin-when-cross-origin"
    />
  );
}
