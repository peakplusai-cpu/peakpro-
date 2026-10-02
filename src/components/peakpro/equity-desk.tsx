'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { SparkCandles } from '@/components/peakpro/charts';
import { PeakProPaywall } from '@/components/peakpro/paywall';
import { usePeakPro } from '@/components/peakpro/provider';
import type { Locale } from '@/i18n/locale';
import { canAccessEquity } from '@/lib/peakpro/access';
import { tPeakpro } from '@/lib/peakpro/copy';
import { displayCap, displayPx, formatPct, publicThesis } from '@/lib/peakpro/format';
import type { MarketDataRow, PeakProTier } from '@/lib/peakpro/types';
import type { EquityMarket } from '@/lib/peakpro/yahoo';
import { cn } from '@/lib/utils';

function SeriesCard({
  locale,
  market,
  row,
  highlight,
}: {
  locale: Locale;
  market: EquityMarket;
  row: MarketDataRow;
  highlight?: boolean;
}) {
  const { usdTwd } = usePeakPro();
  const payload = row.payload;
  const up = payload.changePct >= 0;
  const cap = displayCap(payload.marketCap, payload.currency, locale, usdTwd);
  return (
    <Link
      href={`/app/${market}/${encodeURIComponent(row.symbol)}`}
      className={cn(
        'block rounded-2xl border bg-black/60 p-5 transition-colors hover:border-gold/50',
        highlight ? 'border-gold' : 'border-gold/15',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-gold-antique">{row.symbol}</p>
          <h3 className="mt-1 font-peakpro text-xl text-white">{payload.name}</h3>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            {payload.exchange ? `${payload.exchange} · ` : ''}
            {row.timeframe}
          </p>
        </div>
        <div className="text-right">
          <p className="font-peakpro text-2xl text-gold">{displayPx(payload.last, payload.currency, locale, usdTwd)}</p>
          <p className={up ? 'text-sm text-emerald-400' : 'text-sm text-red-400'}>{formatPct(payload.changePct)}</p>
        </div>
      </div>
      {(cap || payload.pe) && (
        <p className="mt-2 text-[11px] tracking-wide text-zinc-500">
          {cap ? `${tPeakpro(locale, 'mktCap')} ${cap}` : null}
          {cap && payload.pe ? ' · ' : null}
          {payload.pe ? `${tPeakpro(locale, 'peLabel')} ${payload.pe.toFixed(1)}` : null}
        </p>
      )}
      <div className="mt-4">
        <SparkCandles bars={payload.bars} />
      </div>
      {publicThesis(locale === 'zh' ? payload.thesisZh : payload.thesis) ? (
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          {publicThesis(locale === 'zh' ? payload.thesisZh : payload.thesis)}
        </p>
      ) : null}
    </Link>
  );
}

function TimeframeBlock({
  locale,
  market,
  titleKey,
  rows,
  highlight,
}: {
  locale: Locale;
  market: EquityMarket;
  titleKey: string;
  rows: MarketDataRow[];
  highlight?: string;
}) {
  return (
    <section>
      <h3 className="mb-4 text-xs uppercase tracking-[0.32em] text-gold">{tPeakpro(locale, titleKey)}</h3>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-gold/15 px-6 py-16 text-center text-sm text-zinc-500">
          {tPeakpro(locale, 'emptyCache')}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((row) => (
            <SeriesCard
              key={row.id}
              locale={locale}
              market={market}
              row={row}
              highlight={highlight === row.symbol}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function PeakProEquityDesk({
  locale,
  tier,
  market,
  rows,
  highlight,
}: {
  locale: Locale;
  tier: PeakProTier;
  market: EquityMarket;
  rows: MarketDataRow[];
  highlight?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(highlight ?? '');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toUpperCase();
    const scoped = needle
      ? rows.filter(
          (row) =>
            row.symbol.toUpperCase().includes(needle) ||
            row.payload.name.toUpperCase().includes(needle),
        )
      : rows;
    return scoped.filter((row) => canAccessEquity(tier, row.symbol, row.timeframe));
  }, [query, rows, tier]);

  const daily = visible
    .filter((row) => row.timeframe === 'daily')
    .sort((a, b) => Math.abs(b.payload.changePct) - Math.abs(a.payload.changePct));
  const monthly = visible.filter((row) => row.timeframe === 'monthly');
  const annual = visible.filter((row) => row.timeframe === 'annual');

  async function onLookup(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch('/api/equities/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ query, market }),
      });
      const json = (await response.json().catch(() => null)) as { error?: string; symbol?: string } | null;
      if (response.status === 401) {
        router.push('/login?redirect=/app/' + market);
        return;
      }
      if (!response.ok) {
        const key =
          json?.error === 'wrong_market'
            ? market === 'taiwan'
              ? 'searchWrongMarketTw'
              : 'searchWrongMarketUs'
            : json?.error === 'premium'
              ? 'searchPremiumOnly'
              : json?.error === 'not_found'
                ? 'searchNotFound'
                : 'searchInvalid';
        setMessage(tPeakpro(locale, key));
        return;
      }
      setMessage(tPeakpro(locale, 'searchOk'));
      router.push(`/app/${market}/${encodeURIComponent(json?.symbol ?? query)}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-peakpro text-3xl text-gold">
          {tPeakpro(locale, market === 'taiwan' ? 'taiwanTitle' : 'usTitle')}
        </h2>
        <form onSubmit={onLookup} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tPeakpro(locale, market === 'taiwan' ? 'searchPlaceholderTw' : 'searchPlaceholderUs')}
            className="h-11 flex-1 rounded-full border border-gold/25 bg-black px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-gold"
          />
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-full bg-gold px-6 text-sm font-semibold text-black disabled:opacity-60"
          >
            {tPeakpro(locale, 'searchCta')}
          </button>
        </form>
        <p className="mt-2 text-xs text-zinc-500">{tPeakpro(locale, 'searchHint')}</p>
        {message ? <p className="mt-2 text-sm text-gold">{message}</p> : null}
      </div>
      {tier === 'premium' ? (
        <>
          <TimeframeBlock locale={locale} market={market} titleKey="dailyTrends" rows={daily} highlight={highlight} />
          <TimeframeBlock locale={locale} market={market} titleKey="monthlyTrends" rows={monthly} highlight={highlight} />
          <TimeframeBlock locale={locale} market={market} titleKey="annualOutlook" rows={annual} highlight={highlight} />
        </>
      ) : (
        <>
          <TimeframeBlock locale={locale} market={market} titleKey="monthlyTrends" rows={monthly} highlight={highlight} />
          <PeakProPaywall locale={locale} />
        </>
      )}
    </div>
  );
}
