import { previousCalendarDates, taipeiCalendarDate } from '@/lib/peakpro/session-clock';
import type { TrendingItem, TrendingPayload } from '@/lib/peakpro/types';
import { fetchYahooQuotes, isTaiwanSymbol } from '@/lib/peakpro/yahoo';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const SKIP = /^(?:\^|BRK\.B$)/i;

type Seed = {
  symbol: string;
  why: 'volume' | 'gainer' | 'trending';
};

async function fetchJson(url: string, referer?: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json,text/plain,*/*',
        'User-Agent': UA,
        ...(referer ? { Referer: referer } : {}),
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn('[peakpro/trending] fetch failed', url, error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function asSymbol(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

async function yahooTrending(region: 'US' | 'TW'): Promise<string[]> {
  const json = (await fetchJson(`https://query1.finance.yahoo.com/v1/finance/trending/${region}`)) as {
    finance?: { result?: Array<{ quotes?: Array<{ symbol?: string }> }> };
  } | null;
  return (json?.finance?.result?.[0]?.quotes ?? [])
    .map((row) => asSymbol(row.symbol))
    .filter(Boolean);
}

async function yahooScreener(scrId: string): Promise<string[]> {
  const json = (await fetchJson(
    `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=${encodeURIComponent(scrId)}&count=25`,
  )) as {
    finance?: { result?: Array<{ quotes?: Array<{ symbol?: string }> }> };
  } | null;
  return (json?.finance?.result?.[0]?.quotes ?? [])
    .map((row) => asSymbol(row.symbol))
    .filter(Boolean);
}

async function twseVolumeLeaders(): Promise<string[]> {
  const dates = previousCalendarDates(taipeiCalendarDate(), 8);
  for (const iso of dates) {
    const json = (await fetchJson(
      `https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX20?date=${iso.replace(/-/g, '')}&response=json`,
      'https://www.twse.com.tw/',
    )) as { stat?: string; fields?: string[]; data?: unknown[][] } | null;
    if (!json || (json.stat && json.stat !== 'OK') || !Array.isArray(json.data)) continue;
    const codeIdx = (json.fields ?? []).findIndex((field) => field.includes('證券代號') || field.includes('代號'));
    const symbols = json.data
      .map((line) => {
        const code = String(line[codeIdx >= 0 ? codeIdx : 1] ?? '').trim();
        return /^\d{4}$/.test(code) ? `${code}.TW` : '';
      })
      .filter(Boolean);
    if (symbols.length > 0) return symbols;
  }
  return [];
}

function normalize(symbol: string, market: 'taiwan' | 'us') {
  if (market === 'taiwan') {
    if (/^\d{4}$/.test(symbol)) return `${symbol}.TW`;
    if (/\.(TW|TWO)$/i.test(symbol)) return symbol.replace(/\.tw$/i, '.TW').replace(/\.two$/i, '.TWO');
    return '';
  }
  if (isTaiwanSymbol(symbol) || /^\d{4}$/.test(symbol)) return '';
  if (SKIP.test(symbol) || symbol.includes('=')) return '';
  return symbol;
}

function whyCopy(why: Seed['why']): Pick<TrendingItem, 'catalyst' | 'catalystZh'> {
  if (why === 'volume') {
    return { catalyst: 'Market-wide volume leader', catalystZh: '全市場成交量領先' };
  }
  if (why === 'gainer') {
    return { catalyst: 'Market-wide session gainer', catalystZh: '全市場漲幅領先' };
  }
  return { catalyst: 'Market-wide trending tape', catalystZh: '全市場熱門走勢' };
}

function rankSide(seeds: Seed[], quotes: Array<{ symbol: string; shortName?: string; longName?: string; regularMarketPrice?: number; regularMarketChangePercent?: number; currency?: string }>, market: 'taiwan' | 'us'): TrendingItem[] {
  const quoteBy = new Map(quotes.map((row) => [row.symbol.toUpperCase(), row]));
  const seen = new Set<string>();
  const rows: TrendingItem[] = [];
  for (const seed of seeds) {
    const symbol = normalize(seed.symbol, market);
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    const quote = quoteBy.get(symbol);
    const copy = whyCopy(seed.why);
    rows.push({
      rank: 0,
      symbol,
      name: quote?.shortName ?? quote?.longName ?? symbol,
      assetClass: 'equity',
      market,
      changePct: quote?.regularMarketChangePercent ?? 0,
      last: quote?.regularMarketPrice,
      currency: quote?.currency ?? (market === 'taiwan' ? 'TWD' : 'USD'),
      catalyst: copy.catalyst,
      catalystZh: copy.catalystZh,
    });
  }
  return rows
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 15)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export async function fetchMarketWideTrending(): Promise<TrendingPayload> {
  const [twTrend, usTrend, actives, gainers, twVolume] = await Promise.all([
    yahooTrending('TW'),
    yahooTrending('US'),
    yahooScreener('most_actives'),
    yahooScreener('day_gainers'),
    twseVolumeLeaders(),
  ]);

  const taiwanSeeds: Seed[] = [
    ...twVolume.map((symbol) => ({ symbol, why: 'volume' as const })),
    ...twTrend.map((symbol) => ({ symbol, why: 'trending' as const })),
  ];
  const usSeeds: Seed[] = [
    ...actives.map((symbol) => ({ symbol, why: 'volume' as const })),
    ...gainers.map((symbol) => ({ symbol, why: 'gainer' as const })),
    ...usTrend.map((symbol) => ({ symbol, why: 'trending' as const })),
  ];

  const taiwanSymbols = [...new Set(taiwanSeeds.map((row) => normalize(row.symbol, 'taiwan')).filter(Boolean))];
  const usSymbols = [...new Set(usSeeds.map((row) => normalize(row.symbol, 'us')).filter(Boolean))];
  const quotes = await fetchYahooQuotes([...taiwanSymbols, ...usSymbols], 40);
  const taiwan = rankSide(taiwanSeeds, quotes, 'taiwan');
  const us = rankSide(usSeeds, quotes, 'us');

  return {
    taiwan,
    us,
    items: [...taiwan, ...us],
  };
}
