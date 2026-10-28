'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

import { PeakProBarsBiasMeter } from '@/components/peakpro/bias-meter';
import { SparkCandles } from '@/components/peakpro/charts';
import { PeakProCryptoBitgetPanel } from '@/components/peakpro/crypto-bitget';
import { Delta } from '@/components/peakpro/delta';
import { PeakProProjectedCandles } from '@/components/peakpro/projected-candles';
import { PeakProTapeStrip } from '@/components/peakpro/tape-strip';
import { PeakProTradingViewChart } from '@/components/peakpro/tradingview-chart';
import type { Locale } from '@/i18n/locale';
import { canAccessEquity } from '@/lib/peakpro/access';
import { tPeakpro } from '@/lib/peakpro/copy';
import { PEAKPRO_DISCLAIMER_EN, PEAKPRO_DISCLAIMER_ZH } from '@/lib/peakpro/disclaimer';
import { usePeakPro } from '@/components/peakpro/provider';
import { displayCap, displayPx, formatPct, publicThesis } from '@/lib/peakpro/format';
import type { MarketDataRow, MarketTimeframe, PeakProTier } from '@/lib/peakpro/types';
import { conceptNameForSymbol } from '@/lib/peakpro/concepts';
import { toTradingViewSymbol, tradingviewTimezone, type ChartMarket } from '@/lib/peakpro/tradingview';
import { cn } from '@/lib/utils';

function LiveTape({
  locale,
  tier,
  market,
  symbol,
  exchange,
}: {
  locale: Locale;
  tier: PeakProTier;
  market: ChartMarket;
  symbol: string;
  exchange?: string;
}) {
  if (!symbol) {
    return <p className="text-xs text-zinc-500">{tPeakpro(locale, 'tvLocked')}</p>;
  }
  const tvSymbol = toTradingViewSymbol(market, symbol, exchange);
  return (
    <section className="peakpro-panel overflow-hidden">
      <div className="border-b border-signal/10 px-5 py-3">
        <p className="peakpro-kicker">{tPeakpro(locale, 'tvTitle')}</p>
        <p className="mt-1 font-mono text-[10px] tracking-wide text-zinc-600">{tvSymbol}</p>
      </div>
      <PeakProTradingViewChart
        symbol={tvSymbol}
        locale={locale}
        timezone={tradingviewTimezone(market)}
      />
    </section>
  );
}

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
  market: ChartMarket;
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
  const cap = displayCap(payload?.marketCap, payload?.currency ?? 'USD', locale, usdTwd);

  if (!payload) {
    const fallbackName = conceptNameForSymbol(symbol);
    const title = fallbackName ? (locale === 'zh' ? fallbackName.zh : fallbackName.en) : symbol;
    return (
      <div className="space-y-6">
        <Link href={`/app/${market}`} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-signal">
          <ArrowLeft className="h-4 w-4" />
          {tPeakpro(locale, 'backToDesk')}
        </Link>
        <header>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-signal/80">{symbol}</p>
          <h2 className="mt-2 font-peakpro text-3xl font-bold text-ice">{title}</h2>
          <p className="mt-3 text-sm text-zinc-500">{tPeakpro(locale, 'missingSymbol')}</p>
        </header>
        {market === 'crypto' ? (
          <div className="peakpro-panel px-5 py-4">
            <PeakProCryptoBitgetPanel locale={locale} symbol={symbol} />
          </div>
        ) : null}
        <LiveTape locale={locale} tier={tier} market={market} symbol={symbol} />
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
      <Link href={`/app/${market}`} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-signal">
        <ArrowLeft className="h-4 w-4" />
        {tPeakpro(locale, 'backToDesk')}
      </Link>

      <header className="flex flex-col gap-4 border-b border-signal/15 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-signal/80">{symbol}</p>
          <h1 className="mt-2 font-peakpro text-4xl font-bold tracking-tight text-ice">{payload.name}</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
            {payload.exchange ??
              (market === 'taiwan' ? 'TWSE' : market === 'crypto' ? tPeakpro(locale, 'bitgetVenue') : 'U.S.')}
          </p>
        </div>
        {market === 'crypto' ? null : (
          <div className="text-left md:text-right">
            <p className="font-mono text-4xl text-ice">{displayPx(payload.last, payload.currency, locale, usdTwd)}</p>
            <Delta value={payload.changePct} className="font-mono text-lg" />
          </div>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="peakpro-panel px-4 py-3">
            <dt className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</dt>
            <dd className="mt-1 text-sm text-zinc-200">{value}</dd>
          </div>
        ))}
      </dl>

      {market === 'crypto' ? (
        <div className="peakpro-panel px-5 py-4">
          <PeakProCryptoBitgetPanel locale={locale} symbol={symbol} />
        </div>
      ) : (
        <div className="peakpro-panel px-5 py-4">
          <PeakProBarsBiasMeter
            locale={locale}
            bars={payload.bars}
            context={{ changePct: payload.changePct }}
          />
        </div>
      )}

      {market !== 'crypto' ? (
        <Link
          href={tier === 'premium' ? `/app/forecast/${encodeURIComponent(symbol)}` : '/subscribe'}
          className="peakpro-panel block px-5 py-4 font-mono text-xs uppercase tracking-[0.16em] text-signal"
        >
          {tPeakpro(locale, 'nameOpen')}
        </Link>
      ) : null}

      {market !== 'crypto' ? <PeakProTapeStrip locale={locale} symbol={symbol} /> : null}

      <LiveTape locale={locale} tier={tier} market={market} symbol={symbol} exchange={payload.exchange} />

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
                'px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em]',
                tab === item.id || resolvedTab === item.id
                  ? 'bg-signal text-void'
                  : enabled
                    ? 'border border-signal/25 text-zinc-400 hover:text-signal'
                    : 'cursor-not-allowed border border-zinc-800 text-zinc-700',
              )}
            >
              {tPeakpro(locale, item.titleKey)}
            </button>
          );
        })}
      </div>
      <div className="peakpro-panel p-4 md:p-6">
        {tier === 'premium' ? (
          <PeakProProjectedCandles
            locale={locale}
            bars={payload.bars}
            timeframe={resolvedTab}
            currency={payload.currency}
            usdTwd={usdTwd}
            context={{ changePct: payload.changePct }}
          />
        ) : (
          <SparkCandles bars={payload.bars} width={960} height={360} className="h-64 w-full md:h-80" />
        )}
      </div>

      <section className="peakpro-panel p-6">
        <h2 className="peakpro-kicker">{tPeakpro(locale, 'tapeReadout')}</h2>
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
