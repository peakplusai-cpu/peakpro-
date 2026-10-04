import { CRYPTO_UNIVERSE, EQUITY_UNIVERSE, TAPE_TW_BENCH, TAPE_US_BENCH, USDTWD_SYMBOL, USDTWD_YAHOO } from '@/lib/peakpro/constants';
import { collectMarketNews, newsCategory, type RssItem } from '@/lib/peakpro/news-scrape';
import { peakproAdmin } from '@/lib/peakpro/db';
import { harvestPublicFilings } from '@/lib/peakpro/filings';
import { harvestTaiwanMarket, harvestUsLeaders, itemsFromPrints, pricedTrending, rerankTrending } from '@/lib/peakpro/market-trending';
import { insertSessionPrints, persistTapeFromScrape, printFromOfficial, printFromQuote, printFromTrendingItem } from '@/lib/peakpro/tape-store';
import { buildSeedSnapshot } from '@/lib/peakpro/seed-data';
import { biasFromChanges, deskBiasGauges } from '@/lib/peakpro/sentiment';
import type { MarketSeriesPayload, OhlcBar, TrendingItem, TrendingPayload } from '@/lib/peakpro/types';
import {
  chartMeta,
  fetchYahooChart,
  fetchYahooQuote,
  isTaiwanSymbol,
  yahooToBars,
  type YahooQuote,
} from '@/lib/peakpro/yahoo';
import type { SessionPrint } from '@/lib/peakpro/tape';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PeakProPlus-CacheDesk/1.0',
        ...init?.headers,
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.warn('[peakpro/scraper] fetch failed', url, error);
    return null;
  }
}

function toSeries(
  name: string,
  bars: OhlcBar[],
  thesis: string,
  thesisZh: string,
  currency: string,
  quote?: YahooQuote | null,
  exchange?: string,
): MarketSeriesPayload {
  const last = quote?.regularMarketPrice ?? bars[bars.length - 1]?.c ?? 0;
  const prev = bars[bars.length - 2]?.c ?? last;
  return {
    name,
    currency,
    last,
    changePct: quote?.regularMarketChangePercent ?? (prev ? ((last - prev) / prev) * 100 : 0),
    high: quote?.fiftyTwoWeekHigh ?? Math.max(...bars.map((b) => b.h), last),
    low: quote?.fiftyTwoWeekLow ?? Math.min(...bars.map((b) => b.l), last),
    thesis,
    thesisZh,
    bars,
    exchange: quote?.fullExchangeName ?? exchange,
    marketCap: quote?.marketCap,
    pe: quote?.trailingPE,
  };
}

function seriesFromLeader(input: {
  name: string;
  last: number;
  changePct: number;
  currency: string;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  date: string;
}): MarketSeriesPayload {
  const prev = input.changePct !== 0 ? input.last / (1 + input.changePct / 100) : input.last;
  const o = input.open ?? prev;
  const h = input.high ?? Math.max(o, input.last);
  const l = input.low ?? Math.min(o, input.last);
  return {
    name: input.name,
    currency: input.currency,
    last: input.last,
    changePct: input.changePct,
    high: h,
    low: l,
    thesis: '',
    thesisZh: '',
    bars: [{ t: input.date, o, h, l, c: input.last, v: input.volume }],
    source: 'market-wide',
  };
}

async function upsertMarket(rows: Array<{
  asset_class: string;
  symbol: string;
  timeframe: string;
  payload: unknown;
}>) {
  const admin = peakproAdmin();
  const now = new Date().toISOString();
  for (const row of rows) {
    const { error } = await admin.from('market_data').upsert(
      {
        asset_class: row.asset_class,
        symbol: row.symbol,
        timeframe: row.timeframe,
        payload: row.payload,
        last_updated: now,
      },
      { onConflict: 'asset_class,symbol,timeframe' },
    );
    if (error) console.warn('[peakpro/scraper] market upsert failed', row.symbol, error.message);
  }
}

async function extraEquitySymbols(): Promise<string[]> {
  try {
    const admin = peakproAdmin();
    const { data } = await admin.from('market_data').select('symbol, payload').eq('asset_class', 'equity');
    const desk = new Set<string>(EQUITY_UNIVERSE.map((row) => row.symbol));
    const rows = (Array.isArray(data) ? data : []) as Array<{ symbol?: unknown; payload?: { source?: unknown } }>;
    const symbols = rows
      .filter((row) => row.payload?.source !== 'market-wide')
      .map((row) => (typeof row.symbol === 'string' ? row.symbol : ''))
      .filter((symbol) => symbol.length > 0 && !desk.has(symbol));
    return [...new Set(symbols)].slice(0, 20);
  } catch {
    return [];
  }
}

async function scrapeOneEquity(symbol: string, fallbackName: string) {
  const rows: Array<{
    asset_class: string;
    symbol: string;
    timeframe: string;
    payload: unknown;
  }> = [];
  const quote = await fetchYahooQuote(symbol);
  let dailyBars: OhlcBar[] = [];
  let resolvedName = fallbackName;

  for (const timeframe of ['daily', 'monthly', 'annual'] as const) {
    const yahoo = await fetchYahooChart(symbol, timeframe);
    const bars = yahoo ? yahooToBars(yahoo) : [];
    const meta = chartMeta(yahoo);
    const name = quote?.shortName ?? quote?.longName ?? meta?.shortName ?? fallbackName;
    resolvedName = name;
    const currency =
      quote?.currency ?? meta?.currency ?? (symbol.endsWith('.TW') || symbol.endsWith('.TWO') ? 'TWD' : 'USD');
    if (timeframe === 'daily') dailyBars = bars;
    if (bars.length < 4) continue;
    rows.push({
      asset_class: 'equity',
      symbol,
      timeframe,
      payload: toSeries(
        name,
        timeframe === 'annual' ? downsampleAnnual(bars) : bars,
        '',
        '',
        currency,
        quote,
        meta?.exchangeName,
      ),
    });
  }
  return { rows, print: printFromQuote(symbol, resolvedName, quote, dailyBars) };
}

export async function ingestEquitySymbol(symbol: string): Promise<{ name: string; rows: number } | null> {
  const { rows, print } = await scrapeOneEquity(symbol, symbol);
  if (rows.length === 0) return null;
  await upsertMarket(rows);
  if (print) await insertSessionPrints([print]);
  const payload = rows[0]?.payload as MarketSeriesPayload | undefined;
  return { name: payload?.name ?? symbol, rows: rows.length };
}

async function scrapeEquities() {
  const extras = await extraEquitySymbols();
  const targets = [
    ...EQUITY_UNIVERSE.map((equity) => ({ symbol: equity.symbol, name: equity.name })),
    ...extras.map((symbol) => ({ symbol, name: symbol })),
  ];
  const rows: Array<{
    asset_class: string;
    symbol: string;
    timeframe: string;
    payload: unknown;
  }> = [];
  const prints: SessionPrint[] = [];
  for (const target of targets) {
    const one = await scrapeOneEquity(target.symbol, target.name);
    rows.push(...one.rows);
    if (one.print) prints.push(one.print);
  }
  return { rows, prints };
}

async function scrapeUsdTwd(): Promise<WarehouseRow[]> {
  const quote = await fetchYahooQuote(USDTWD_YAHOO);
  const rate = quote?.regularMarketPrice;
  if (!rate || rate < 20 || rate > 50) return [];
  return [
    {
      asset_class: 'index',
      symbol: USDTWD_SYMBOL,
      timeframe: 'spot',
      payload: {
        name: 'USD/TWD',
        currency: 'TWD',
        last: rate,
        changePct: quote?.regularMarketChangePercent ?? 0,
        high: quote?.fiftyTwoWeekHigh ?? rate,
        low: quote?.fiftyTwoWeekLow ?? rate,
        thesis: '',
        thesisZh: '',
        bars: [],
      },
    },
  ];
}

function downsampleAnnual(bars: OhlcBar[]): OhlcBar[] {
  const byYear = new Map<string, OhlcBar>();
  for (const bar of bars) {
    const year = bar.t.slice(0, 4);
    const existing = byYear.get(year);
    if (!existing) {
      byYear.set(year, { ...bar });
      continue;
    }
    existing.h = Math.max(existing.h, bar.h);
    existing.l = Math.min(existing.l, bar.l);
    existing.c = bar.c;
  }
  return [...byYear.values()];
}

type CoinChart = { prices?: Array<[number, number]> };

async function scrapeCrypto() {
  const rows: Array<{
    asset_class: string;
    symbol: string;
    timeframe: string;
    payload: unknown;
  }> = [];

  for (const asset of CRYPTO_UNIVERSE) {
    const daily = await fetchJson<CoinChart>(
      `https://api.coingecko.com/api/v3/coins/${asset.id}/market_chart?vs_currency=usd&days=90&interval=daily`,
    );
    const monthly = await fetchJson<CoinChart>(
      `https://api.coingecko.com/api/v3/coins/${asset.id}/market_chart?vs_currency=usd&days=730&interval=daily`,
    );
    const toBars = (chart: CoinChart | null, step: number): OhlcBar[] => {
      const points = chart?.prices ?? [];
      const sampled = points.filter((_, i) => i % step === 0);
      return sampled.map((point, i) => {
        const c = point[1];
        const prev = sampled[i - 1]?.[1] ?? c;
        return {
          t: new Date(point[0]).toISOString().slice(0, 10),
          o: prev,
          h: Math.max(prev, c),
          l: Math.min(prev, c),
          c,
        };
      });
    };
    const dailyBars = toBars(daily, 1);
    const monthlyBars = toBars(monthly, 30);
    if (dailyBars.length >= 4) {
      rows.push({
        asset_class: 'crypto',
        symbol: asset.symbol,
        timeframe: 'daily',
        payload: toSeries(
          asset.name,
          dailyBars,
          'Spot liquidity and ETF primary-market flow remain the dominant daily drivers.',
          '現貨流動性與 ETF 初級市場資金流仍是主要日線驅動力。',
          'USD',
        ),
      });
    }
    if (monthlyBars.length >= 4) {
      rows.push({
        asset_class: 'crypto',
        symbol: asset.symbol,
        timeframe: 'monthly',
        payload: toSeries(
          asset.name,
          monthlyBars,
          'The monthly crypto trend still tracks liquidity conditions more than on-chain activity.',
          '加密月線仍較跟隨流動性條件，而非單純鏈上活動。',
          'USD',
        ),
      });
    }
  }
  return rows;
}

async function scrapeGold() {
  const yahoo = await fetchYahooChart('GC=F', 'daily');
  const monthly = await fetchYahooChart('GC=F', 'monthly');
  const rows: Array<{
    asset_class: string;
    symbol: string;
    timeframe: string;
    payload: unknown;
  }> = [];
  const dailyBars = yahoo ? yahooToBars(yahoo) : [];
  const monthlyBars = monthly ? yahooToBars(monthly) : [];
  if (dailyBars.length >= 4) {
    rows.push({
      asset_class: 'gold',
      symbol: 'XAUUSD',
      timeframe: 'spot',
      payload: toSeries(
        'Spot Gold',
        dailyBars,
        'Real rates, official-sector demand, and geopolitical convexity underwrite the bullion bid.',
        '實質利率、官方部門需求與地緣凸性支撐黃金買盤。',
        'USD',
      ),
    });
  }
  if (monthlyBars.length >= 4) {
    rows.push({
      asset_class: 'gold',
      symbol: 'XAUUSD',
      timeframe: 'monthly',
      payload: toSeries(
        'Spot Gold',
        monthlyBars,
        'Monthly bullion remains a hedge overlay against duration and reserve diversification.',
        '黃金月線仍是對存續期與存底多元化的避險配置。',
        'USD',
      ),
    });
  }
  return rows;
}

type FearGreedResponse = {
  data?: Array<{ value?: string; value_classification?: string; timestamp?: string }>;
};

type WarehouseRow = {
  asset_class: string;
  symbol: string;
  timeframe: string;
  payload: unknown;
};

async function scrapeFearGreed(): Promise<WarehouseRow[]> {
  const json = await fetchJson<FearGreedResponse>('https://api.alternative.me/fng/?limit=30&format=json');
  const points = json?.data ?? [];
  if (points.length === 0) return [];
  const history = [...points].reverse().map((point) => ({
    t: point.timestamp
      ? new Date(Number(point.timestamp) * 1000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    value: Number(point.value ?? 50),
  }));
  const value = history[history.length - 1]?.value ?? 50;
  const classification = points[0]?.value_classification ?? 'Neutral';
  return [
    {
      asset_class: 'index',
      symbol: 'FNG',
      timeframe: 'daily',
      payload: {
        value,
        classification,
        classificationZh: classifyZh(classification),
        history,
        commentary: '',
        commentaryZh: '',
      },
    },
  ];
}

function classifyZh(value: string): string {
  const key = value.toLowerCase();
  if (key.includes('extreme greed')) return '極度貪婪';
  if (key.includes('greed')) return '貪婪';
  if (key.includes('extreme fear')) return '極度恐慌';
  if (key.includes('fear')) return '恐慌';
  return '中性';
}

function hasCjk(value: string | null | undefined): boolean {
  return Boolean(value && /[\u3400-\u9fff]/.test(value));
}

async function translateEnToZh(text: string): Promise<string> {
  const input = text.trim();
  if (!input || hasCjk(input)) return input;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(input.slice(0, 480))}&langpair=en|zh-TW`;
  const json = await fetchJson<{ responseData?: { translatedText?: string } }>(url);
  const out = json?.responseData?.translatedText?.trim() ?? '';
  if (!out || /MYMEMORY WARNING|QUERY LENGTH|INVALID/i.test(out)) return input;
  return out;
}

async function translateNewsOpenRouter(
  items: RssItem[],
): Promise<Array<{ title_zh: string; summary_zh: string }> | null> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key || items.length === 0) return null;
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Translate each news item into Traditional Chinese used in Taiwan. Return ONLY a JSON array of {"title_zh","summary_zh"} in the same order. No commentary.',
          },
          {
            role: 'user',
            content: JSON.stringify(items.map((item) => ({ title: item.title, summary: item.summary }))),
          },
        ],
      }),
      cache: 'no-store',
    });
    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? '';
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as Array<{ title_zh?: string; summary_zh?: string }>;
    if (!Array.isArray(parsed) || parsed.length !== items.length) return null;
    return parsed.map((row, index) => ({
      title_zh: hasCjk(row.title_zh) ? row.title_zh!.trim() : items[index].title,
      summary_zh: hasCjk(row.summary_zh) ? row.summary_zh!.trim() : items[index].summary,
    }));
  } catch (error) {
    console.warn('[peakpro/scraper] news zh batch failed', error);
    return null;
  }
}

async function localizeNews(items: RssItem[]): Promise<Array<RssItem & { title_zh: string; summary_zh: string }>> {
  const batched = await translateNewsOpenRouter(items);
  if (batched) {
    return items.map((item, index) => ({
      ...item,
      title_zh: batched[index]?.title_zh ?? item.title,
      summary_zh: batched[index]?.summary_zh ?? item.summary,
    }));
  }

  return Promise.all(
    items.map(async (item) => ({
      ...item,
      title_zh: await translateEnToZh(item.title),
      summary_zh: await translateEnToZh(item.summary),
    })),
  );
}

export async function ensureNewsTraditionalChinese<
  T extends { id: string; title: string; title_zh: string; summary: string; summary_zh: string },
>(news: T[]): Promise<T[]> {
  const pending = news.filter((row) => !hasCjk(row.title_zh));
  if (pending.length === 0) return news;

  const localized = await localizeNews(
    pending.map((row) => ({
      title: row.title,
      summary: row.summary,
      url: '',
      published: '',
      source: '',
    })),
  );

  const admin = peakproAdmin();
  const now = new Date().toISOString();
  const updates = new Map(pending.map((row, index) => [row.id, localized[index]]));

  await Promise.all(
    pending.map((row, index) =>
      admin
        .from('news_cache')
        .update({
          title_zh: localized[index].title_zh,
          summary_zh: localized[index].summary_zh,
          last_updated: now,
        })
        .eq('id', row.id),
    ),
  );

  return news.map((row) => {
    const next = updates.get(row.id);
    return next ? { ...row, title_zh: next.title_zh, summary_zh: next.summary_zh } : row;
  });
}

export const NEWS_STALE_MS = 15 * 60 * 1000;
export const FILINGS_STALE_MS = 3 * 60 * 60 * 1000;

let filingsInFlight: Promise<number> | null = null;

export async function runPeakProFilingsScrape(): Promise<number> {
  if (filingsInFlight) return filingsInFlight;
  filingsInFlight = persistFilings()
    .then(async (count) => {
      if (count > 0) {
        try {
          const { revalidateTag } = await import('next/cache');
          revalidateTag('peakpro-warehouse');
        } catch (error) {
          console.warn('[peakpro/scraper] filings revalidate skipped', error);
        }
      }
      return count;
    })
    .finally(() => {
      filingsInFlight = null;
    });
  return filingsInFlight;
}

async function persistFilings(): Promise<number> {
  const filings = await harvestPublicFilings();
  const count = filings.trades.length + filings.books.length;
  if (count === 0) return 0;
  await upsertMarket([
    {
      asset_class: 'ranking',
      symbol: 'FILINGS',
      timeframe: 'weekly',
      payload: filings,
    },
  ]);
  return count;
}

let newsInFlight: Promise<number> | null = null;

export async function runPeakProNewsScrape(): Promise<number> {
  if (newsInFlight) return newsInFlight;
  newsInFlight = scrapeNews()
    .then(async (news) => {
      try {
        const { revalidateTag } = await import('next/cache');
        revalidateTag('peakpro-warehouse');
      } catch (error) {
        console.warn('[peakpro/scraper] news revalidate skipped', error);
      }
      return news;
    })
    .finally(() => {
      newsInFlight = null;
    });
  return newsInFlight;
}

async function scrapeNews() {
  const items = await collectMarketNews(24);

  const admin = peakproAdmin();
  const now = new Date().toISOString();
  if (items.length === 0) return 0;

  let localized: Array<RssItem & { title_zh: string; summary_zh: string }>;
  try {
    localized = await localizeNews(items);
  } catch (error) {
    console.warn('[peakpro/scraper] news zh localize failed', error);
    localized = items.map((item) => ({
      ...item,
      title_zh: item.title,
      summary_zh: item.summary,
    }));
  }

  await admin.from('news_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error } = await admin.from('news_cache').insert(
    localized.map((item) => ({
      category: newsCategory(item),
      title: item.title,
      title_zh: item.title_zh,
      summary: item.summary,
      summary_zh: item.summary_zh,
      source: item.source,
      url: item.url,
      published_at: item.published,
      last_updated: now,
    })),
  );
  if (error) {
    console.warn('[peakpro/scraper] news insert failed', error.message);
    return 0;
  }
  return items.length;
}

function mergeTrendingSide(primary: TrendingItem[] | undefined, fallback: TrendingItem[], minCount: number) {
  const start = pricedTrending(primary);
  if (start.length >= minCount) return rerankTrending(start);
  const seen = new Set(start.map((item) => item.symbol));
  const merged = [...start];
  for (const item of pricedTrending(fallback)) {
    if (seen.has(item.symbol)) continue;
    seen.add(item.symbol);
    merged.push(item);
    if (merged.length >= minCount) break;
  }
  return rerankTrending(merged);
}

function deskTrendingFallback(rows: Array<{ payload: unknown; symbol: string; asset_class: string }>): TrendingPayload {
  const items = rows
    .filter((row) => row.asset_class === 'equity')
    .map((row) => {
      const payload = row.payload as MarketSeriesPayload;
      const market = isTaiwanSymbol(row.symbol) ? 'taiwan' : 'us';
      return {
        rank: 0,
        symbol: row.symbol,
        name: payload.name,
        assetClass: 'equity' as const,
        market: market as 'taiwan' | 'us',
        changePct: payload.changePct ?? 0,
        last: payload.last,
        currency: payload.currency,
        catalyst: 'Desk watchlist mover',
        catalystZh: '桌上觀察名單',
      };
    })
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  const taiwan = items.filter((row) => row.market === 'taiwan').slice(0, 15).map((item, index) => ({ ...item, rank: index + 1 }));
  const us = items.filter((row) => row.market === 'us').slice(0, 15).map((item, index) => ({ ...item, rank: index + 1 }));
  return { taiwan, us, items: [...taiwan, ...us] };
}

async function writeAiBrief(context: string) {
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setUTCDate(periodStart.getUTCDate() - 7);
  const admin = peakproAdmin();
  const key = process.env.OPENROUTER_API_KEY?.trim();

  const fallback = buildSeedSnapshot().briefs;
  let en = fallback.find((row) => row.locale === 'en')?.content ?? context;
  let zh = fallback.find((row) => row.locale === 'zh')?.content ?? context;

  if (key) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a sell-side cross-asset strategist writing for a private desk. Write two weekly wrap-ups (English, then Traditional Chinese) using only the cached prints provided. Be bold: in Positioning, state what is 適合買進 / add, 適合減碼 / trim, or 先觀望 / wait, and why. Do not write order tickets, share counts, or how to place a trade. Do not say "no investment advice" in the body. Markdown headings: Tape, Equities, Crypto & bullion, Geopolitics, Positioning. Separate the two languages with a line of --- . End each wrap-up with one disclaimer line: snapshot commentary, not a broker ticket.',
            },
            { role: 'user', content: context.slice(0, 8000) },
          ],
        }),
        cache: 'no-store',
      });
      const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const text = json.choices?.[0]?.message?.content ?? '';
      const [english, chinese] = text.split(/---+/);
      if (english?.trim()) en = english.trim();
      if (chinese?.trim()) zh = chinese.trim();
    } catch (error) {
      console.warn('[peakpro/scraper] AI brief fallback', error);
    }
  }

  for (const locale of ['en', 'zh'] as const) {
    await admin.from('ai_summaries').upsert(
      {
        kind: 'weekly_market',
        locale,
        title: locale === 'en' ? 'Weekly Market Summary — Cross-Asset Desk' : '每週市場總結 — 跨資產桌',
        content: locale === 'en' ? en : zh,
        period_start: periodStart.toISOString().slice(0, 10),
        period_end: periodEnd.toISOString().slice(0, 10),
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'kind,locale,period_start' },
    );
  }
}

async function seedWarehouse() {
  const seed = buildSeedSnapshot();
  await upsertMarket(
    seed.market.map((row) => ({
      asset_class: row.asset_class,
      symbol: row.symbol,
      timeframe: row.timeframe,
      payload: row.payload,
    })),
  );
  const admin = peakproAdmin();
  await admin.from('news_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await admin.from('news_cache').insert(
    seed.news.map(({ id: _id, ...row }) => row),
  );
  for (const brief of seed.briefs) {
    const { id: _id, ...row } = brief;
    await admin.from('ai_summaries').upsert(row, { onConflict: 'kind,locale,period_start' });
  }
}

export async function runPeakProMarketScrape(): Promise<{
  equities: number;
  crypto: number;
  gold: number;
  fearGreed: number;
  news: number;
  seeded: boolean;
}> {
  const equityPack = await scrapeEquities();
  let equities = equityPack.rows;
  let crypto = await scrapeCrypto();
  let gold = await scrapeGold();
  const fearRaw = await scrapeFearGreed();
  const [fx, taiwanHarvest, usLeaders] = await Promise.all([
    scrapeUsdTwd(),
    harvestTaiwanMarket(),
    harvestUsLeaders(),
  ]);

  const taiwanItems = itemsFromPrints(taiwanHarvest.leaders);
  const deskTrend = deskTrendingFallback(equities.filter((row) => row.timeframe === 'daily'));
  const taiwan = mergeTrendingSide(taiwanItems, deskTrend.taiwan ?? [], 10);
  const us = mergeTrendingSide(usLeaders, deskTrend.us ?? [], 8);
  const trendPayload: TrendingPayload = { taiwan, us, items: [...taiwan, ...us] };

  const seenEquity = new Set(equities.map((row) => `${row.symbol}:${row.timeframe}`));
  const leaderDate = taiwanHarvest.leaders[0]?.tradeDate ?? new Date().toISOString().slice(0, 10);
  for (const print of taiwanHarvest.leaders) {
    const key = `${print.symbol}:daily`;
    if (seenEquity.has(key)) continue;
    seenEquity.add(key);
    equities.push({
      asset_class: 'equity',
      symbol: print.symbol,
      timeframe: 'daily',
      payload: seriesFromLeader({
        name: print.name,
        last: print.last,
        changePct: print.changePct,
        currency: 'TWD',
        open: print.open,
        high: print.high,
        low: print.low,
        volume: print.volume,
        date: print.tradeDate ?? leaderDate,
      }),
    });
  }
  for (const item of usLeaders) {
    if (item.last == null || item.last <= 0) continue;
    const key = `${item.symbol}:daily`;
    if (seenEquity.has(key)) continue;
    seenEquity.add(key);
    equities.push({
      asset_class: 'equity',
      symbol: item.symbol,
      timeframe: 'daily',
      payload: seriesFromLeader({
        name: item.name,
        last: item.last,
        changePct: item.changePct,
        currency: item.currency === 'TWD' ? 'TWD' : 'USD',
        date: new Date().toISOString().slice(0, 10),
      }),
    });
  }

  const deskBias = deskBiasGauges(equities);
  const usBreadth = biasFromChanges(usLeaders.map((item) => item.changePct));
  const bias = {
    taiwan: taiwanHarvest.breadth.sampleSize > 0 ? taiwanHarvest.breadth : deskBias.taiwan,
    us: usBreadth.sampleSize > 0 ? usBreadth : deskBias.us,
  };
  const fear: WarehouseRow[] = fearRaw.map((row) => ({
    asset_class: row.asset_class,
    symbol: row.symbol,
    timeframe: row.timeframe,
    payload: {
      ...(row.payload && typeof row.payload === 'object'
        ? (row.payload as Record<string, unknown>)
        : {}),
      taiwan: bias.taiwan,
      us: bias.us,
      commentary: '',
      commentaryZh: '',
    },
  }));
  const liveCount = equities.length + crypto.length + gold.length + fear.length;

  if (liveCount < 8) {
    await seedWarehouse();
    await upsertMarket(fx.length ? fx : await scrapeUsdTwd());
    return {
      equities: equities.length,
      crypto: crypto.length,
      gold: gold.length,
      fearGreed: fear.length,
      news: 0,
      seeded: true,
    };
  }

  const trending = [
    {
      asset_class: 'ranking',
      symbol: 'WEEKLY',
      timeframe: 'weekly',
      payload: trendPayload,
    },
  ];

  await upsertMarket([...equities, ...crypto, ...gold, ...fear, ...trending, ...fx]);
  const twBenchPrint = taiwanHarvest.universe.find((row) => row.symbol === TAPE_TW_BENCH);
  try {
    await persistTapeFromScrape(
      [
        ...equityPack.prints,
        ...taiwanHarvest.leaders.map(printFromOfficial),
        ...(twBenchPrint ? [printFromOfficial(twBenchPrint)] : []),
        ...usLeaders.flatMap((item) => {
          const print = printFromTrendingItem(item);
          return print ? [print] : [];
        }),
      ],
      [...new Set([...equities.map((row) => row.symbol), TAPE_TW_BENCH, TAPE_US_BENCH])],
    );
  } catch (error) {
    console.warn('[peakpro/scraper] tape persist skipped', error);
  }
  const news = await scrapeNews();
  try {
    await persistFilings();
  } catch (error) {
    console.warn('[peakpro/scraper] filings harvest skipped', error);
  }
  const context = JSON.stringify({
    equities: equities.slice(0, 8),
    crypto,
    gold,
    fear,
    note: 'Use only these cached prints. Educational wrap-up.',
  });
  await writeAiBrief(context);

  try {
    const { revalidateTag } = await import('next/cache');
    revalidateTag('peakpro-warehouse');
  } catch (error) {
    console.warn('[peakpro/scraper] cache revalidate skipped', error);
  }

  return {
    equities: equities.length,
    crypto: crypto.length,
    gold: gold.length,
    fearGreed: fear.length,
    news,
    seeded: false,
  };
}
