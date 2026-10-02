'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

import { SparkCandles } from '@/components/peakpro/charts';
import { PeakProTapeStrip } from '@/components/peakpro/tape-strip';
import type { Locale } from '@/i18n/locale';
import { canAccessEquity } from '@/lib/peakpro/access';
import { tPeakpro } from '@/lib/peakpro/copy';
import { PEAKPRO_DISCLAIMER_EN, PEAKPRO_DISCLAIMER_ZH } from '@/lib/peakpro/disclaimer';
import { usePeakPro } from '@/components/peakpro/provider';
import { displayCap, displayPx, formatPct, publicThesis } from '@/lib/peakpro/format';
import type { MarketDataRow, MarketTimeframe, PeakProTier } from '@/lib/peakpro/types';
import type { EquityMarket } from '@/lib/peakpro/yahoo';
import { cn } from '@/lib/utils';

const TABS: Array<{ id: 'daily' | 'monthly' | 'annual'; titleKey: string }> = [
  { id: 'daily', titleKey: 'dailyTrends' },
  { id: 'monthly', titleKey: 'monthlyTrends' },
  { id: 'annual', titleKey: 'annualOutlook' },
];

function lastBar(row: MarketDataRow | undefined) {
  const bars = row?.payload.bars ?? [];
  return bars[bars.length - 1];
}

export function PeakProEquityDetail({
  locale,
  tier,
  market,
  symbol,
  rows,
}: {
  locale: Locale;
  tier: PeakProTier;
  market: EquityMarket;
  symbol: string;
  rows: MarketDataRow[];
}) {
  const available = useMemo(
    () =>
      TABS.filter((tab) =>
        rows.some((row) => row.timeframe === tab.id && canAccessEquity(tier, symbol, tab.id)),
      ),
    [rows, tier, symbol],
  );
  const { usdTwd } = usePeakPro();
  const defaultTab = available.find((tab) => tab.id === 'daily')?.id ?? available[0]?.id ?? 'monthly';
  const [tab, setTab] = useState<MarketTimeframe>(defaultTab);
  const resolvedTab = available.some((item) => item.id === tab) ? tab : defaultTab;
  const active = rows.find((row) => row.timeframe === resolvedTab) ?? rows[0];
  const payload = active?.payload;
  const bar = lastBar(active);
  const up = (payload?.changePct ?? 0) >= 0;
  const cap = displayCap(payload?.marketCap, payload?.currency ?? 'USD', locale, usdTwd);

  if (!payload) {
    return (
      <div className="space-y-6">
        <Link href={`/app/${market}`} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-gold">
          <ArrowLeft className="h-4 w-4" />
          {tPeakpro(locale, 'backToDesk')}
        </Link>
        <div className="rounded-2xl border border-gold/15 px-6 py-16 text-center text-sm text-zinc-500">
          {tPeakpro(locale, 'missingSymbol')}
        </div>
      </div>
    );
  }

  const readout =
    locale === 'zh'
      ? `最新價 ${displayPx(payload.last, payload.currency, locale, usdTwd)}，漲跌 ${formatPct(payload.changePct)}。區間高 ${displayPx(payload.high, payload.currency, locale, usdTwd)}、低 ${displayPx(payload.low, payload.currency, locale, usdTwd)}。${cap ? `市值 ${cap}。` : ''}${payload.pe ? `本益比 ${payload.pe.toFixed(1)}。` : ''}`
      : `Last ${displayPx(payload.last, payload.currency, locale, usdTwd)}, change ${formatPct(payload.changePct)}. Range high ${displayPx(payload.high, payload.currency, locale, usdTwd)} / low ${displayPx(payload.low, payload.currency, locale, usdTwd)}.${cap ? ` Market cap ${cap}.` : ''}${payload.pe ? ` P/E ${payload.pe.toFixed(1)}.` : ''}`;

  const stats: Array<[string, string]> = [];
  if (cap) stats.push([tPeakpro(locale, 'mktCap'), cap]);
  if (payload.pe) stats.push([tPeakpro(locale, 'peLabel'), payload.pe.toFixed(1)]);
  stats.push([
    tPeakpro(locale, 'weekRange'),
    `${displayPx(payload.low, payload.currency, locale, usdTwd)} – ${displayPx(payload.high, payload.currency, locale, usdTwd)}`,
  ]);
  if (bar) {
    stats.push([
      `${tPeakpro(locale, 'open')} / ${tPeakpro(locale, 'close')}`,
      `${displayPx(bar.o, payload.currency, locale, usdTwd)} / ${displayPx(bar.c, payload.currency, locale, usdTwd)}`,
    ]);
  }

  return (
    <div className="space-y-8">
      <Link href={`/app/${market}`} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-gold">
        <ArrowLeft className="h-4 w-4" />
        {tPeakpro(locale, 'backToDesk')}
      </Link>

      <header className="flex flex-col gap-4 border-b border-gold/15 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-gold-antique">{symbol}</p>
          <h1 className="mt-2 font-peakpro text-4xl text-gold">{payload.name}</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
            {payload.exchange ?? (market === 'taiwan' ? 'TWSE' : 'U.S.')}
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="font-peakpro text-4xl text-white">{displayPx(payload.last, payload.currency, locale, usdTwd)}</p>
          <p className={up ? 'text-lg text-emerald-400' : 'text-lg text-red-400'}>{formatPct(payload.changePct)}</p>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-gold/10 bg-black/40 px-4 py-3">
            <dt className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</dt>
            <dd className="mt-1 text-sm text-zinc-200">{value}</dd>
          </div>
        ))}
      </dl>

      {tier === 'premium' ? <PeakProTapeStrip locale={locale} symbol={symbol} /> : null}

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => {
          const enabled = available.some((tabItem) => tabItem.id === item.id);
          return (
            <button
              key={item.id}
              type="button"
              disabled={!enabled}
              onClick={() => enabled && setTab(item.id)}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs tracking-wide',
                tab === item.id || resolvedTab === item.id
                  ? 'bg-gold text-black'
                  : enabled
                    ? 'border border-gold/25 text-zinc-400 hover:text-gold'
                    : 'cursor-not-allowed border border-zinc-800 text-zinc-700',
              )}
            >
              {tPeakpro(locale, item.titleKey)}
            </button>
          );
        })}
      </div>
      {tier === 'free' ? (
        <p className="text-xs text-zinc-500">{tPeakpro(locale, 'monthlyOnlyChart')}</p>
      ) : null}

      <div className="rounded-3xl border border-gold/15 bg-black/60 p-4 md:p-6">
        <SparkCandles bars={payload.bars} width={960} height={360} className="h-64 w-full md:h-80" />
      </div>

      <section className="rounded-3xl border border-gold/15 bg-black/60 p-6">
        <h2 className="text-xs uppercase tracking-[0.32em] text-gold">{tPeakpro(locale, 'tapeReadout')}</h2>
        <p className="mt-4 text-sm leading-relaxed text-zinc-300">{readout}</p>
        {publicThesis(locale === 'zh' ? payload.thesisZh : payload.thesis) ? (
          <p className="mt-4 text-sm leading-relaxed text-zinc-500">
            {publicThesis(locale === 'zh' ? payload.thesisZh : payload.thesis)}
          </p>
        ) : null}
        <p className="mt-6 text-[11px] leading-relaxed text-zinc-600">
          {locale === 'zh' ? PEAKPRO_DISCLAIMER_ZH : PEAKPRO_DISCLAIMER_EN}
        </p>
      </section>
    </div>
  );
}
