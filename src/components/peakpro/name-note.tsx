import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import { PEAKPRO_DISCLAIMER_EN, PEAKPRO_DISCLAIMER_ZH } from '@/lib/peakpro/disclaimer';
import { Delta } from '@/components/peakpro/delta';
import { PeakProProjectedCandles } from '@/components/peakpro/projected-candles';
import { displayPx } from '@/lib/peakpro/format';
import { formatEventStamp } from '@/lib/peakpro/macro-calendar';
import type { MacroEvent, MarketDataRow, NameDeskNote, NewsCacheRow } from '@/lib/peakpro/types';
import { isTaiwanSymbol } from '@/lib/peakpro/yahoo';
import { cn } from '@/lib/utils';

function leanLabel(locale: Locale, lean: NameDeskNote['lean']) {
  if (lean === 'add') return tPeakpro(locale, 'nameLeanAdd');
  if (lean === 'trim') return tPeakpro(locale, 'nameLeanTrim');
  return tPeakpro(locale, 'nameLeanWait');
}

export function PeakProNameNote({
  locale,
  usdTwd,
  symbol,
  row,
  note,
  prints,
  news,
}: {
  locale: Locale;
  usdTwd?: number | null;
  symbol: string;
  row: MarketDataRow | null;
  note: NameDeskNote | null;
  prints: MacroEvent[];
  news: NewsCacheRow[];
}) {
  const market = isTaiwanSymbol(symbol) ? 'taiwan' : 'us';
  const name = row?.payload.name ?? symbol;
  const title = locale === 'zh' ? note?.title.zh ?? name : note?.title.en ?? name;
  const body = locale === 'zh' ? note?.body.zh : note?.body.en;

  if (!row && !note) {
    return (
      <div className="space-y-6">
        <Link href="/app/forecast" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-signal">
          <ArrowLeft className="h-4 w-4" />
          {tPeakpro(locale, 'nameTitle')}
        </Link>
        <div className="peakpro-panel px-6 py-16 text-center text-sm text-zinc-500">
          {tPeakpro(locale, 'nameMissing')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link href="/app/forecast" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-signal">
        <ArrowLeft className="h-4 w-4" />
        {tPeakpro(locale, 'nameTitle')}
      </Link>

      <article className="peakpro-panel peakpro-frame p-6 md:p-8">
        <p className="peakpro-kicker">{tPeakpro(locale, 'projLabel')} · {symbol}</p>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h1 className="font-peakpro text-3xl font-bold leading-snug text-ice md:text-4xl">{title}</h1>
          {row ? (
            <div className="md:text-right">
              <p className="font-mono text-2xl text-ice">
                {displayPx(row.payload.last, row.payload.currency, locale, usdTwd)}
              </p>
              <Delta value={row.payload.changePct} className="font-mono text-base" />
            </div>
          ) : null}
        </div>

        {row && row.payload.bars.length >= 20 ? (
          <div className="mt-8">
            <PeakProProjectedCandles
              locale={locale}
              bars={row.payload.bars}
              timeframe={row.timeframe}
              currency={row.payload.currency}
              usdTwd={usdTwd}
            />
          </div>
        ) : null}

        {note ? (
          <p
            className={cn(
              'mt-6 inline-flex border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em]',
              note.lean === 'add'
                ? 'border-signal/50 bg-signal/10 text-signal'
                : note.lean === 'trim'
                  ? 'border-plasma/50 bg-plasma/10 text-plasma'
                  : 'border-warn/50 bg-warn/10 text-warn',
            )}
          >
            {tPeakpro(locale, 'nameLeanLabel')} · {leanLabel(locale, note.lean)}
          </p>
        ) : null}

        {body ? (
          <div className="mt-8 max-w-none whitespace-pre-wrap text-sm leading-7 text-zinc-300">
            {body}
          </div>
        ) : null}

        {prints.length > 0 ? (
          <section className="mt-10">
            <h2 className="peakpro-kicker">{tPeakpro(locale, 'nameHits')}</h2>
            <ul className="mt-4 space-y-2 text-sm text-zinc-400">
              {prints.map((event) => (
                <li key={event.id}>
                  <Link href={`/app/prints/${encodeURIComponent(event.id)}`} className="hover:text-signal">
                    {formatEventStamp(locale, event)} · {locale === 'zh' ? event.title.zh : event.title.en}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {news.length > 0 ? (
          <section className="mt-8">
            <h2 className="peakpro-kicker">{tPeakpro(locale, 'nameNews')}</h2>
            <ul className="mt-4 space-y-2 text-sm text-zinc-400">
              {news.map((item) => (
                <li key={item.id}>
                  {item.source}: {locale === 'zh' && item.title_zh ? item.title_zh : item.title}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <Link href={`/app/${market}/${encodeURIComponent(symbol)}`} className="mt-8 inline-block font-mono text-xs uppercase tracking-[0.16em] text-signal hover:underline">
          {tPeakpro(locale, 'nameChart')}
        </Link>
        <p className="mt-8 text-[11px] leading-relaxed text-zinc-600">
          {locale === 'zh' ? PEAKPRO_DISCLAIMER_ZH : PEAKPRO_DISCLAIMER_EN}
        </p>
      </article>
    </div>
  );
}
