import { EQUITY_UNIVERSE } from '@/lib/peakpro/constants';
import type { SentimentGauge } from '@/lib/peakpro/types';
import { isTaiwanSymbol } from '@/lib/peakpro/yahoo';

type BiasRow = {
  asset_class: string;
  symbol: string;
  timeframe: string;
  payload: unknown;
};

function changePctOf(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = (payload as { changePct?: unknown }).changePct;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function classifyBias(value: number): Pick<SentimentGauge, 'classification' | 'classificationZh'> {
  if (value >= 75) return { classification: 'Extreme bid', classificationZh: '極度利多' };
  if (value >= 55) return { classification: 'Bid', classificationZh: '利多' };
  if (value >= 45) return { classification: 'Neutral', classificationZh: '中性' };
  if (value >= 25) return { classification: 'Offer', classificationZh: '利空' };
  return { classification: 'Extreme offer', classificationZh: '極度利空' };
}

function biasFromChanges(changes: number[]): SentimentGauge {
  if (changes.length === 0) {
    return {
      value: 50,
      classification: 'Neutral',
      classificationZh: '中性',
      avgChangePct: null,
      sampleSize: 0,
    };
  }
  const avg = changes.reduce((sum, value) => sum + value, 0) / changes.length;
  const upShare = changes.filter((value) => value >= 0).length / changes.length;
  const value = clampScore(0.5 * (50 + avg * 10) + 0.5 * upShare * 100);
  return {
    value,
    ...classifyBias(value),
    avgChangePct: avg,
    sampleSize: changes.length,
  };
}

function deskDailyChanges(rows: BiasRow[], market: 'taiwan' | 'us'): number[] {
  const desk = new Set<string>(EQUITY_UNIVERSE.map((row) => row.symbol));
  return rows
    .filter(
      (row) =>
        row.asset_class === 'equity' &&
        row.timeframe === 'daily' &&
        desk.has(row.symbol) &&
        (market === 'taiwan' ? isTaiwanSymbol(row.symbol) : !isTaiwanSymbol(row.symbol)),
    )
    .map((row) => changePctOf(row.payload))
    .filter((value): value is number => value != null);
}

export function deskBiasGauges(rows: BiasRow[]): { taiwan: SentimentGauge; us: SentimentGauge } {
  return {
    taiwan: biasFromChanges(deskDailyChanges(rows, 'taiwan')),
    us: biasFromChanges(deskDailyChanges(rows, 'us')),
  };
}
