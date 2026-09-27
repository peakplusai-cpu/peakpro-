import { canAccessEquity, effectiveTier } from '@/lib/peakpro/access';
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

export async function readPeakProCache(): Promise<PeakProCacheSnapshot> {
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

    return {
      equities: market.filter((row) => row.asset_class === 'equity'),
      crypto: market.filter((row) => row.asset_class === 'crypto'),
      gold: market.filter((row) => row.asset_class === 'gold'),
      news,
      fearGreed: market.find((row) => row.symbol === 'FNG') ?? null,
      trending: market.find((row) => row.symbol === 'WEEKLY') ?? null,
      briefs,
      lastUpdated: latestStamp([...market, ...news, ...briefs]),
    };
  } catch (error) {
    console.warn('[peakpro/cache] local warehouse unavailable', error);
    return {
      equities: [],
      crypto: [],
      gold: [],
      news: [],
      fearGreed: null,
      trending: null,
      briefs: [],
      lastUpdated: null,
    };
  }
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
