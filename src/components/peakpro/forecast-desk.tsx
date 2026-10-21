'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { SparkCandles } from '@/components/peakpro/charts';
import { Notice } from '@/components/peakpro/notice';
import { SymbolSearchField } from '@/components/peakpro/symbol-search-field';
import type { Locale } from '@/i18n/locale';
import { EQUITY_UNIVERSE } from '@/lib/peakpro/constants';
import { tPeakpro } from '@/lib/peakpro/copy';
import type { DeskRegion } from '@/lib/peakpro/desk-region';
import { projectBars } from '@/lib/peakpro/forecast';
import { displayPx, formatPct } from '@/lib/peakpro/format';
import type { MarketDataRow } from '@/lib/peakpro/types';
import { isTaiwanSymbol, type EquityMarket } from '@/lib/peakpro/yahoo';
import { cn } from '@/lib/utils';

function marketForQuery(raw: string, desk: DeskRegion): EquityMarket {
  if (desk === 'us') return 'us';
  const q = raw.trim();
  if (/[\u3400-\u9fff]/.test(q) || /^\d{4}/.test(q) || isTaiwanSymbol(q.toUpperCase())) return 'taiwan';
  return 'us';
}

function ForecastCard({
  locale,
  usdTwd,
  row,
}: {
  locale: Locale;
  usdTwd?: number | null;
  row: MarketDataRow;
}) {
  const projection = projectBars(row.payload.bars, row.timeframe);
  const arrow = projection?.direction === 'up' ? '▲' : projection?.direction === 'down' ? '▼' : '◆';
  const tone =
    projection?.direction === 'up'
      ? 'text-signal'
      : projection?.direction === 'down'
        ? 'text-plasma'
        : 'text-warn';

  return (
    <Link href={`/app/forecast/${encodeURIComponent(row.symbol)}`} className="peakpro-panel block p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-signal/80">{row.symbol}</p>
          <h3 className="mt-1 font-peakpro text-xl font-semibold text-ice">{row.payload.name}</h3>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl text-ice">
            {displayPx(row.payload.last, row.payload.currency, locale, usdTwd)}
          </p>
          {projection ? (
            <p className={cn('mt-1 font-mono text-xs uppercase tracking-[0.14em]', tone)}>
              {arrow} {tPeakpro(locale, `projDir_${projection.direction}`)} · {formatPct(projection.movePct)}
            </p>
          ) : null}
        </div>
      </div>
      {row.payload.bars.length >= 2 ? (
        <div className="mt-4">
          <SparkCandles
            bars={row.payload.bars}
            projection={projection?.bars}
            projectionLabel={tPeakpro(locale, 'projLabel')}
            height={148}
            className="h-32 w-full"
          />
        </div>
      ) : null}
    </Link>
  );
}

export function PeakProForecastDesk({
  locale,
  desk,
  rows,
  usdTwd,
}: {
  locale: Locale;
  desk: DeskRegion;
  rows: MarketDataRow[];
  usdTwd?: number | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const market = marketForQuery(query, desk);
  const featured = EQUITY_UNIVERSE.filter((item) => desk !== 'us' || item.region !== 'Taiwan')
    .map((item) => {
      const matches = rows.filter((row) => row.symbol === item.symbol);
      return (
        matches.find((row) => row.timeframe === 'daily') ??
        matches.find((row) => row.timeframe === 'monthly') ??
        matches[0]
      );
    })
    .filter((row): row is MarketDataRow => Boolean(row));

  async function openSymbol(raw: string) {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch('/api/equities/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ query: raw, market: marketForQuery(raw, desk) }),
      });
      const json = (await response.json().catch(() => null)) as { error?: string; symbol?: string } | null;
      if (response.status === 401) {
        router.push('/login?redirect=/app/forecast');
        return;
      }
      if (!response.ok || !json?.symbol) {
        const key =
          json?.error === 'premium'
            ? 'searchPremiumOnly'
            : json?.error === 'wrong_market'
              ? desk === 'us'
                ? 'searchNotFound'
                : 'searchWrongMarketUs'
              : json?.error === 'ambiguous'
                ? 'searchPick'
                : json?.error === 'not_found'
                  ? 'searchNotFound'
                  : 'searchInvalid';
        setMessage(tPeakpro(locale, key));
        return;
      }
      router.push(`/app/forecast/${encodeURIComponent(json.symbol)}`);
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await openSymbol(query);
  }

  return (
    <section className="space-y-8">
      <header>
        <h2 className="font-peakpro text-3xl font-bold tracking-tight text-ice sm:text-4xl">
          {tPeakpro(locale, 'nameTitle')}
        </h2>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <SymbolSearchField
          locale={locale}
          market={market}
          value={query}
          onChange={setQuery}
          onPick={(hit) => {
            setQuery(hit.symbol);
            void openSymbol(hit.symbol);
          }}
          placeholder={tPeakpro(locale, market === 'taiwan' ? 'searchPlaceholderTw' : 'searchPlaceholderUs')}
          disabled={pending}
        />
        <button type="submit" disabled={pending} className="peakpro-btn">
          {tPeakpro(locale, 'nameCta')}
        </button>
      </form>
      {message ? (
        <Notice tone="ok" role="status">
          {message}
        </Notice>
      ) : null}

      {featured.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {featured.map((row) => (
            <ForecastCard key={row.id} locale={locale} usdTwd={usdTwd} row={row} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
