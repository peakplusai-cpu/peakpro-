export type PeakProTier = 'free' | 'premium';

export type MarketTimeframe = 'daily' | 'monthly' | 'annual' | 'spot' | 'weekly';
export type MarketAssetClass = 'equity' | 'crypto' | 'gold' | 'index' | 'ranking';

export interface OhlcBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
}

export interface MarketSeriesPayload {
  name: string;
  currency: string;
  last: number;
  changePct: number;
  high: number;
  low: number;
  thesis: string;
  thesisZh: string;
  bars: OhlcBar[];
  exchange?: string;
  marketCap?: number;
  pe?: number;
}

export interface MarketDataRow {
  id: string;
  asset_class: MarketAssetClass;
  symbol: string;
  timeframe: MarketTimeframe;
  payload: MarketSeriesPayload;
  last_updated: string;
}

export interface NewsCacheRow {
  id: string;
  category: string;
  title: string;
  title_zh: string;
  summary: string;
  summary_zh: string;
  source: string;
  url: string;
  published_at: string;
  last_updated: string;
}

export interface AiSummaryRow {
  id: string;
  kind: string;
  locale: 'en' | 'zh';
  title: string;
  content: string;
  period_start: string;
  period_end: string;
  last_updated: string;
}

export interface PeakProProfile {
  id: string;
  email: string | null;
  tier: PeakProTier;
  expires_at: string | null;
  creem_customer_id: string | null;
  creem_subscription_id: string | null;
  creem_last_transaction_id: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface FearGreedPayload {
  value: number;
  classification: string;
  classificationZh: string;
  history: Array<{ t: string; value: number }>;
  commentary: string;
  commentaryZh: string;
}

export interface TrendingPayload {
  items: Array<{
    rank: number;
    symbol: string;
    name: string;
    assetClass: MarketAssetClass;
    changePct: number;
    catalyst: string;
    catalystZh: string;
  }>;
}

export interface PeakProCacheSnapshot {
  equities: MarketDataRow[];
  crypto: MarketDataRow[];
  gold: MarketDataRow[];
  news: NewsCacheRow[];
  fearGreed: MarketDataRow | null;
  trending: MarketDataRow | null;
  briefs: AiSummaryRow[];
  lastUpdated: string | null;
}

export interface PeakProSession {
  userId: string | null;
  email: string | null;
  tier: PeakProTier;
  expiresAt: string | null;
  revoked: boolean;
}
