import { CRYPTO_UNIVERSE, EQUITY_UNIVERSE } from '@/lib/peakpro/constants';
import { peakproAdmin } from '@/lib/peakpro/db';
import { buildSeedSnapshot } from '@/lib/peakpro/seed-data';
import type { MarketSeriesPayload, OhlcBar } from '@/lib/peakpro/types';

const YAHOO_RANGE: Record<'daily' | 'monthly' | 'annual', { range: string; interval: string }> = {
  daily: { range: '3mo', interval: '1d' },
  monthly: { range: '2y', interval: '1mo' },
  annual: { range: '10y', interval: '1mo' },
};

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

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: { shortName?: string; regularMarketPrice?: number; currency?: string };
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

function yahooToBars(payload: YahooChart): OhlcBar[] {
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

function toSeries(
  name: string,
  bars: OhlcBar[],
  thesis: string,
  thesisZh: string,
  currency: string,
): MarketSeriesPayload {
  const last = bars[bars.length - 1]?.c ?? 0;
  const prev = bars[bars.length - 2]?.c ?? last;
  return {
    name,
    currency,
    last,
    changePct: prev ? ((last - prev) / prev) * 100 : 0,
    high: Math.max(...bars.map((b) => b.h), last),
    low: Math.min(...bars.map((b) => b.l), last),
    thesis,
    thesisZh,
    bars,
  };
}

async function fetchYahooSeries(symbol: string, timeframe: 'daily' | 'monthly' | 'annual') {
  const spec = YAHOO_RANGE[timeframe];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${spec.range}&interval=${spec.interval}`;
  return fetchJson<YahooChart>(url);
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

async function scrapeEquities() {
  const rows: Array<{
    asset_class: string;
    symbol: string;
    timeframe: string;
    payload: unknown;
  }> = [];

  for (const equity of EQUITY_UNIVERSE) {
    for (const timeframe of ['daily', 'monthly', 'annual'] as const) {
      const yahoo = await fetchYahooSeries(equity.symbol, timeframe);
      const bars = yahoo ? yahooToBars(yahoo) : [];
      const name = yahoo?.chart?.result?.[0]?.meta?.shortName ?? equity.name;
      const currency = yahoo?.chart?.result?.[0]?.meta?.currency ?? (equity.symbol.endsWith('.TW') ? 'TWD' : 'USD');
      const payload =
        bars.length >= 4
          ? toSeries(
              name,
              timeframe === 'annual' ? downsampleAnnual(bars) : bars,
              `${equity.name} tape cached from the exchange print. Utilization, mix, and policy headlines remain the swing factors.`,
              `${equity.name} 走勢已寫入交易所快取。產能利用率、產品組合與政策標題仍是波動因子。`,
              currency,
            )
          : null;
      if (payload) {
        rows.push({ asset_class: 'equity', symbol: equity.symbol, timeframe, payload });
      }
    }
  }
  return rows;
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
  const yahoo = await fetchYahooSeries('GC=F', 'daily');
  const monthly = await fetchYahooSeries('GC=F', 'monthly');
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

async function scrapeFearGreed() {
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
        commentary:
          'Sentiment is inferred from the cached Fear & Greed print. Positioning can reverse faster than the monthly equity trend.',
        commentaryZh: '情緒取自快取的恐慌與貪婪讀數。部位翻轉可能快於股票月線。',
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
      const summary = decode(matchTag(block, 'description')).replace(/<[^>]+>/g, '').slice(0, 360);
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

  await admin.from('news_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error } = await admin.from('news_cache').insert(
    items.map((item) => ({
      category: /war|missile|troop|invasion|ceasefire|strike/i.test(`${item.title} ${item.summary}`)
        ? 'war'
        : 'geopolitics',
      title: item.title,
      title_zh: item.title,
      summary: item.summary,
      summary_zh: item.summary,
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

function buildTrending(rows: Array<{ payload: unknown; symbol: string; asset_class: string }>) {
  const items = rows
    .map((row) => {
      const payload = row.payload as MarketSeriesPayload;
      return {
        rank: 0,
        symbol: row.symbol,
        name: payload.name,
        assetClass: row.asset_class,
        changePct: payload.changePct ?? 0,
        catalyst: payload.thesis,
        catalystZh: payload.thesisZh,
      };
    })
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 8)
    .map((item, index) => ({ ...item, rank: index + 1 }));
  return { items };
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
  let equities = await scrapeEquities();
  let crypto = await scrapeCrypto();
  let gold = await scrapeGold();
  let fear = await scrapeFearGreed();
  const liveCount = equities.length + crypto.length + gold.length + fear.length;

  if (liveCount < 8) {
    await seedWarehouse();
    return {
      equities: equities.length,
      crypto: crypto.length,
      gold: gold.length,
      fearGreed: fear.length,
      news: 0,
      seeded: true,
    };
  }

  const trendingSource = [...equities, ...crypto, ...gold].filter((row) =>
    ['daily', 'spot', 'monthly'].includes(row.timeframe),
  );
  const trending = [
    {
      asset_class: 'ranking',
      symbol: 'WEEKLY',
      timeframe: 'weekly',
      payload: buildTrending(trendingSource),
    },
  ];

  await upsertMarket([...equities, ...crypto, ...gold, ...fear, ...trending]);
  const news = await scrapeNews();
  const context = JSON.stringify({
    equities: equities.slice(0, 8),
    crypto,
    gold,
    fear,
    note: 'Use only these cached prints. Educational wrap-up.',
  });
  await writeAiBrief(context);

  return {
    equities: equities.length,
    crypto: crypto.length,
    gold: gold.length,
    fearGreed: fear.length,
    news,
    seeded: false,
  };
}
