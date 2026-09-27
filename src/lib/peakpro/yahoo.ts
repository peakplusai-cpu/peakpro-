import type { OhlcBar } from '@/lib/peakpro/types';

export type EquityMarket = 'taiwan' | 'us';

export type YahooQuote = {
  shortName?: string;
  longName?: string;
  currency?: string;
  fullExchangeName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  marketCap?: number;
  trailingPE?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
};

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: {
        shortName?: string;
        regularMarketPrice?: number;
        currency?: string;
        exchangeName?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
};

const YAHOO_RANGE: Record<'daily' | 'monthly' | 'annual', { range: string; interval: string }> = {
  daily: { range: '3mo', interval: '1d' },
  monthly: { range: '2y', interval: '1mo' },
  annual: { range: '10y', interval: '1mo' },
};

export function isTaiwanSymbol(symbol: string): boolean {
  return /\.(TW|TWO)$/i.test(symbol);
}

export function normalizeEquityQuery(
  query: string,
  market: EquityMarket,
): { symbol: string; error?: 'empty' | 'wrong_market' | 'invalid' } {
  const raw = query.trim().toUpperCase().replace(/\s+/g, '');
  if (!raw) return { symbol: '', error: 'empty' };

  if (market === 'taiwan') {
    if (/^\d{4}$/.test(raw)) return { symbol: `${raw}.TW` };
    if (/^\d{4}\.(TW|TWO)$/.test(raw)) {
      return { symbol: raw.replace(/\.tw$/i, '.TW').replace(/\.two$/i, '.TWO') };
    }
    if (!isTaiwanSymbol(raw)) return { symbol: raw, error: 'wrong_market' };
    return { symbol: raw };
  }

  if (/^\d{4}$/.test(raw) || isTaiwanSymbol(raw)) return { symbol: raw, error: 'wrong_market' };
  if (!/^[A-Z][A-Z0-9.\-]{0,11}$/.test(raw)) return { symbol: raw, error: 'invalid' };
  return { symbol: raw };
}

async function fetchYahooJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PeakProPlus-CacheDesk/1.0',
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.warn('[peakpro/yahoo] fetch failed', url, error);
    return null;
  }
}

export function yahooToBars(payload: YahooChart): OhlcBar[] {
  const result = payload.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const stamps = result?.timestamp ?? [];
  if (!result || !quote) return [];
  const bars: OhlcBar[] = [];
  for (let i = 0; i < stamps.length; i += 1) {
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const c = quote.close?.[i];
    if (o == null || h == null || l == null || c == null) continue;
    bars.push({
      t: new Date(stamps[i] * 1000).toISOString().slice(0, 10),
      o,
      h,
      l,
      c,
      v: quote.volume?.[i] ?? undefined,
    });
  }
  return bars;
}

export async function fetchYahooChart(symbol: string, timeframe: 'daily' | 'monthly' | 'annual') {
  const spec = YAHOO_RANGE[timeframe];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${spec.range}&interval=${spec.interval}`;
  return fetchYahooJson<YahooChart>(url);
}

export async function fetchYahooQuote(symbol: string): Promise<YahooQuote | null> {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const json = await fetchYahooJson<{
    quoteResponse?: { result?: YahooQuote[] };
  }>(url);
  return json?.quoteResponse?.result?.[0] ?? null;
}

export function chartMeta(payload: YahooChart | null) {
  return payload?.chart?.result?.[0]?.meta ?? null;
}
