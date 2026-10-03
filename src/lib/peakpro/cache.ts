import { unstable_cache } from 'next/cache';

import { canAccessEquity, effectiveTier } from '@/lib/peakpro/access';
import { USDTWD_SYMBOL } from '@/lib/peakpro/constants';
import { peakproAdmin } from '@/lib/peakpro/db';
import type {
  AiSummaryRow,
  MarketDataRow,
  NewsCacheRow,
  PeakProCacheSnapshot,
  PeakProTier,
} from '@/lib/peakpro/types';

function latestStamp(rows: Array<{ last_updated: string }>): string | null {
  if (rows.length === 0) return null;
  return rows
    .map((row) => row.last_updated)
    .sort()
    .at(-1) ?? null;
}

function emptySnapshot(): PeakProCacheSnapshot {
  return {
    equities: [],
    crypto: [],
    gold: [],
    news: [],
    fearGreed: null,
    trending: null,
    briefs: [],
    lastUpdated: null,
    usdTwd: null,
  };
}

async function queryPeakProWarehouse(): Promise<PeakProCacheSnapshot> {
  try {
    const admin = peakproAdmin();
    const [marketRes, newsRes, briefRes] = await Promise.all([
      admin.from('market_data').select('*'),
      admin.from('news_cache').select('*').order('published_at', { ascending: false }),
      admin.from('ai_summaries').select('*').order('period_end', { ascending: false }),
    ]);

    const market = (marketRes.data ?? []) as MarketDataRow[];
    const news = (newsRes.data ?? []) as NewsCacheRow[];
    const briefs = (briefRes.data ?? []) as AiSummaryRow[];
    const fx = market.find((row) => row.symbol === USDTWD_SYMBOL)?.payload.last;
    const usdTwd = typeof fx === 'number' && fx > 20 && fx < 50 ? fx : null;

    return {
      equities: market.filter((row) => row.asset_class === 'equity'),
      crypto: market.filter((row) => row.asset_class === 'crypto'),
      gold: market.filter((row) => row.asset_class === 'gold'),
      news,
      fearGreed: market.find((row) => row.symbol === 'FNG') ?? null,
      trending: market.find((row) => row.symbol === 'WEEKLY') ?? null,
      briefs,
      lastUpdated: latestStamp([...market, ...news, ...briefs]),
      usdTwd,
    };
  } catch (error) {
    console.warn('[peakpro/cache] local warehouse unavailable', error);
    return emptySnapshot();
  }
}

const readPeakProWarehouseCached = unstable_cache(queryPeakProWarehouse, ['peakpro-warehouse-v1'], {
  revalidate: 90,
  tags: ['peakpro-warehouse'],
});

export async function readPeakProCache(): Promise<PeakProCacheSnapshot> {
  return readPeakProWarehouseCached();
}

function stripBarsFromRow(row: MarketDataRow): MarketDataRow {
  return {
    ...row,
    payload: { ...row.payload, bars: row.payload.bars?.slice(-1) ?? [] },
  };
}

export function slimCacheForModule(
  snapshot: PeakProCacheSnapshot,
  moduleId: string,
): PeakProCacheSnapshot {
  const chartModules = new Set(['overview', 'taiwan', 'us', 'crypto', 'gold']);
  if (chartModules.has(moduleId)) return snapshot;

  return {
    ...snapshot,
    equities: snapshot.equities.map(stripBarsFromRow),
    crypto: snapshot.crypto.map(stripBarsFromRow),
    gold: snapshot.gold.map(stripBarsFromRow),
  };
}

export function filterCacheForTier(
  snapshot: PeakProCacheSnapshot,
  tier: PeakProTier,
): PeakProCacheSnapshot {
  if (tier === 'premium') return snapshot;

  return {
    ...snapshot,
    equities: snapshot.equities.filter((row) => canAccessEquity(tier, row.symbol, row.timeframe)),
    crypto: [],
    gold: [],
    news: [],
    fearGreed: null,
    trending: null,
    briefs: [],
  };
}

export function newsCacheAgeMs(snapshot: PeakProCacheSnapshot): number | null {
  const stamps = snapshot.news
    .map((row) => row.last_updated)
    .filter((value): value is string => Boolean(value))
    .sort();
  const latest = stamps.at(-1);
  if (!latest) return null;
  return Date.now() - new Date(latest).getTime();
}

export function cacheHasPrints(snapshot: PeakProCacheSnapshot): boolean {
  return (
    snapshot.equities.length +
      snapshot.crypto.length +
      snapshot.gold.length +
      snapshot.news.length +
      snapshot.briefs.length >
      0 || Boolean(snapshot.fearGreed || snapshot.trending)
  );
}

export { effectiveTier };
