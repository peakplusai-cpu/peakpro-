import { CRYPTO_UNIVERSE, EQUITY_UNIVERSE, USDTWD_SYMBOL, USDTWD_YAHOO } from '@/lib/peakpro/constants';
import { peakproAdmin } from '@/lib/peakpro/db';
import { fetchMarketWideTrending } from '@/lib/peakpro/market-trending';
import { insertSessionPrints, persistTapeFromScrape, printFromQuote } from '@/lib/peakpro/tape-store';
import { buildSeedSnapshot } from '@/lib/peakpro/seed-data';
import { deskBiasGauges } from '@/lib/peakpro/sentiment';
import type { MarketSeriesPayload, OhlcBar, TrendingPayload } from '@/lib/peakpro/types';
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
    const { data } = await admin.from('market_data').select('symbol').eq('asset_class', 'equity');
    const desk = new Set<string>(EQUITY_UNIVERSE.map((row) => row.symbol));
    const rows = (Array.isArray(data) ? data : []) as Array<{ symbol?: unknown }>;
    const symbols = rows
      .map((row) => (typeof row.symbol === 'string' ? row.symbol : ''))
      .filter((symbol) => symbol.length > 0 && !desk.has(symbol));
    return [...new Set(symbols)];
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

type RssItem = { title: string; summary: string; url: string; published: string; source: string };

async function fetchRss(url: string, source: string): Promise<RssItem[]> {
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'PeakProPlus-CacheDesk/1.0' },
    });
    if (!response.ok) return [];
    const xml = await response.text();
    const blocks = xml.split(/<item[\s>]/i).slice(1);
    return blocks.slice(0, 8).map((block) => {
      const title = decode(matchTag(block, 'title'));
      const summary = decode(matchTag(block, 'description')).replace(/<[^>]+>/g, '').slice(0, 1200);
      const link = matchTag(block, 'link') || matchTag(block, 'guid');
      const published = matchTag(block, 'pubDate');
      return {
        title,
        summary,
        url: link,
        published: published ? new Date(published).toISOString() : new Date().toISOString(),
        source,
      };
    });
  } catch (error) {
    console.warn('[peakpro/scraper] rss failed', source, error);
    return [];
  }
}

function matchTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return (match?.[1] ?? match?.[2] ?? '').trim();
}

function decode(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

const WAR_TERMS = /war|conflict|strike|missile|sanctions|troop|invasion|ceasefire|military|geopolit/i;

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

async function scrapeNews() {
  const feeds = await Promise.all([
    fetchRss('https://feeds.bbci.co.uk/news/world/rss.xml', 'BBC World'),
    fetchRss('https://rss.nytimes.com/services/xml/rss/nyt/World.xml', 'NYT World'),
  ]);
  const items = feeds
    .flat()
    .filter((item) => item.title && WAR_TERMS.test(`${item.title} ${item.summary}`))
    .slice(0, 12);

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
      category: /war|missile|troop|invasion|ceasefire|strike/i.test(`${item.title} ${item.summary}`)
        ? 'war'
        : 'geopolitics',
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
                'You are a sell-side cross-asset strategist. Write two weekly wrap-ups (English, then Traditional Chinese) using only the cached prints provided. No investment advice. Markdown headings: Tape, Equities, Crypto & bullion, Geopolitics, Positioning.',
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
  const bias = deskBiasGauges(equities);
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
    await upsertMarket(await scrapeUsdTwd());
    return {
      equities: equities.length,
      crypto: crypto.length,
      gold: gold.length,
      fearGreed: fear.length,
      news: 0,
      seeded: true,
    };
  }

  const trendingSource = equities.filter((row) => row.timeframe === 'daily');
  const [fx, marketTrend] = await Promise.all([scrapeUsdTwd(), fetchMarketWideTrending()]);
  const trendPayload =
    (marketTrend.taiwan?.length ?? 0) + (marketTrend.us?.length ?? 0) > 0
      ? marketTrend
      : deskTrendingFallback(trendingSource);
  const trending = [
    {
      asset_class: 'ranking',
      symbol: 'WEEKLY',
      timeframe: 'weekly',
      payload: trendPayload,
    },
  ];

  await upsertMarket([...equities, ...crypto, ...gold, ...fear, ...trending, ...fx]);
  try {
    await persistTapeFromScrape(
      equityPack.prints,
      equities.map((row) => row.symbol),
    );
  } catch (error) {
    console.warn('[peakpro/scraper] tape persist skipped', error);
  }
  const news = await scrapeNews();
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
