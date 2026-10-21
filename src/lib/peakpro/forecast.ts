import { bollinger, rsiRead, std } from '@/lib/peakpro/indicators';
import type { MarketTimeframe, NameDeskLean, OhlcBar } from '@/lib/peakpro/types';

export interface ProjectedBar extends OhlcBar {
  lo: number;
  hi: number;
}

export type StrategyDriverId = 'bb' | 'rsi' | 'tape' | 'news' | 'filings' | 'desk' | 'prints';

export interface StrategyDriver {
  id: StrategyDriverId;
  score: number;
}

export interface StrategyRead {
  bbPctB: number | null;
  bbMid: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  rsi: number | null;
  rsiMean: number | null;
  score: number;
  drivers: StrategyDriver[];
}

export interface ForecastContext {
  changePct?: number;
  newsText?: string;
  filings?: string[];
  deskBias?: number | null;
  livePrints?: number;
}

export interface Projection {
  bars: ProjectedBar[];
  movePct: number;
  sigmaPct: number;
  direction: 'up' | 'down' | 'flat';
  timeframe: MarketTimeframe;
  strategy: StrategyRead;
}

const HORIZON: Partial<Record<MarketTimeframe, number>> = { daily: 10, weekly: 8, monthly: 6, annual: 3 };
const MIN_BARS = 20;

const BULL_WORDS = [
  'beat',
  'surge',
  'rally',
  'upgrade',
  'record',
  'soar',
  'jump',
  'buy',
  'outperform',
  '大漲',
  '超預期',
  '上調',
  '創新高',
  '買超',
  '突破',
  '強於',
];
const BEAR_WORDS = [
  'miss',
  'slump',
  'cut',
  'downgrade',
  'lawsuit',
  'probe',
  'sell',
  'warning',
  '大跌',
  '下修',
  '不及',
  '賣超',
  '調查',
  '虧損',
  '弱於',
];

function clamp(value: number, lo = -1, hi = 1) {
  return Math.max(lo, Math.min(hi, value));
}

function nextStamp(last: string, step: number, timeframe: MarketTimeframe): string {
  const base = new Date(`${last.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return `+${step}`;
  if (timeframe === 'daily' || timeframe === 'spot') {
    let left = step;
    while (left > 0) {
      base.setUTCDate(base.getUTCDate() + 1);
      const day = base.getUTCDay();
      if (day !== 0 && day !== 6) left -= 1;
    }
  } else if (timeframe === 'weekly') {
    base.setUTCDate(base.getUTCDate() + 7 * step);
  } else if (timeframe === 'monthly') {
    base.setUTCMonth(base.getUTCMonth() + step);
  } else {
    base.setUTCFullYear(base.getUTCFullYear() + step);
  }
  return base.toISOString().slice(0, 10);
}

function bbScore(pctB: number): number {
  if (pctB <= 0.05) return 0.9;
  if (pctB <= 0.2) return 0.55;
  if (pctB >= 0.95) return -0.9;
  if (pctB >= 0.8) return -0.55;
  if (pctB >= 0.58) return 0.2;
  if (pctB <= 0.42) return -0.2;
  return 0;
}

function rsiScore(rsi: number, rsiMean: number | null): number {
  let score = 0;
  if (rsi <= 30) score += 0.85;
  else if (rsi <= 40) score += 0.4;
  else if (rsi >= 70) score += -0.85;
  else if (rsi >= 60) score += -0.4;
  else score += (rsi - 50) / 100;
  if (rsiMean != null) {
    if (rsi > rsiMean && rsi < 48) score += 0.25;
    if (rsi < rsiMean && rsi > 52) score -= 0.25;
  }
  return clamp(score);
}

function newsScore(text: string): number {
  const blob = text.toLowerCase();
  let score = 0;
  for (const word of BULL_WORDS) if (blob.includes(word)) score += 0.22;
  for (const word of BEAR_WORDS) if (blob.includes(word)) score -= 0.22;
  return clamp(score);
}

function filingsScore(rows: string[]): number {
  if (rows.length === 0) return 0;
  const blob = rows.join(' ').toLowerCase();
  const buys = (blob.match(/\bbuy\b|買/g) ?? []).length;
  const sells = (blob.match(/\bsell\b|賣/g) ?? []).length;
  if (buys === 0 && sells === 0) return 0;
  return clamp((buys - sells) / Math.max(1, buys + sells));
}

export function scoreStrategy(closes: number[], context: ForecastContext = {}): StrategyRead {
  const bb = bollinger(closes);
  const rsi = rsiRead(closes);
  const drivers: StrategyDriver[] = [];

  if (bb) drivers.push({ id: 'bb', score: bbScore(bb.pctB) });
  if (rsi) drivers.push({ id: 'rsi', score: rsiScore(rsi.rsi, rsi.mean) });
  if (context.changePct != null && Number.isFinite(context.changePct)) {
    drivers.push({ id: 'tape', score: clamp(context.changePct / 4) });
  }
  if (context.newsText) {
    const score = newsScore(context.newsText);
    if (score !== 0) drivers.push({ id: 'news', score });
  }
  if (context.filings?.length) {
    const score = filingsScore(context.filings);
    if (score !== 0) drivers.push({ id: 'filings', score });
  }
  if (context.deskBias != null && Number.isFinite(context.deskBias)) {
    drivers.push({ id: 'desk', score: clamp((context.deskBias - 50) / 40) });
  }
  if ((context.livePrints ?? 0) > 0) {
    drivers.push({ id: 'prints', score: 0 });
  }

  const weights: Record<StrategyDriverId, number> = {
    bb: 0.32,
    rsi: 0.28,
    tape: 0.12,
    news: 0.12,
    filings: 0.08,
    desk: 0.08,
    prints: 0,
  };
  const weightSum = drivers.reduce((sum, row) => sum + weights[row.id], 0) || 1;
  let score = drivers.reduce((sum, row) => sum + row.score * weights[row.id], 0) / weightSum;
  if ((context.livePrints ?? 0) > 0) score *= 0.7;

  return {
    bbPctB: bb?.pctB ?? null,
    bbMid: bb?.mid ?? null,
    bbUpper: bb?.upper ?? null,
    bbLower: bb?.lower ?? null,
    rsi: rsi?.rsi ?? null,
    rsiMean: rsi?.mean ?? null,
    score: clamp(score),
    drivers,
  };
}

/**
 * Strategy path: Bollinger mean-revert / ride, RSI vs its mean, then tape, headlines, filings, desk bias.
 * Same inputs always yield the same path.
 */
export function projectBars(
  bars: OhlcBar[],
  timeframe: MarketTimeframe = 'daily',
  context: ForecastContext = {},
): Projection | null {
  const closes = bars.map((bar) => bar.c).filter((value) => Number.isFinite(value) && value > 0);
  if (closes.length < MIN_BARS) return null;

  const start = closes[closes.length - 1];
  const window = closes.slice(-91);
  const returns = window.slice(1).map((value, index) => Math.log(value / window[index]));
  const sigma = Math.max(std(returns), 0.0015);
  const strategy = scoreStrategy(closes, context);
  const horizon = HORIZON[timeframe] ?? 10;
  const total = strategy.score * 0.85 * sigma * Math.sqrt(horizon);
  const drift = total / horizon;
  const lastBar = bars[bars.length - 1];
  const out: ProjectedBar[] = [];
  let prev = start;

  for (let k = 1; k <= horizon; k += 1) {
    const close = start * Math.exp(drift * k);
    const open = prev;
    const wick = Math.exp(sigma * 0.4);
    out.push({
      t: nextStamp(lastBar.t, k, timeframe),
      o: open,
      c: close,
      h: Math.max(open, close) * wick,
      l: Math.min(open, close) / wick,
      lo: start * Math.exp(drift * k - sigma * Math.sqrt(k)),
      hi: start * Math.exp(drift * k + sigma * Math.sqrt(k)),
    });
    prev = close;
  }

  return {
    bars: out,
    movePct: (Math.exp(total) - 1) * 100,
    sigmaPct: sigma * 100,
    direction: Math.abs(strategy.score) < 0.16 ? 'flat' : strategy.score > 0 ? 'up' : 'down',
    timeframe,
    strategy,
  };
}

export function leanFromProjection(projection: Projection | null, changePct?: number): NameDeskLean {
  if (projection?.direction === 'up') return 'add';
  if (projection?.direction === 'down') return 'trim';
  if (changePct != null && Number.isFinite(changePct) && changePct >= 1.5) return 'add';
  if (changePct != null && Number.isFinite(changePct) && changePct <= -1.5) return 'trim';
  return 'wait';
}

export function strategyLine(strategy: StrategyRead, locale: 'en' | 'zh'): string {
  const bits: string[] = [];
  if (strategy.bbPctB != null) {
    bits.push(locale === 'zh' ? `布林 %B ${strategy.bbPctB.toFixed(2)}` : `BB %B ${strategy.bbPctB.toFixed(2)}`);
  }
  if (strategy.rsi != null) {
    const meanBit = strategy.rsiMean == null ? '' : locale === 'zh' ? ` / 均值 ${strategy.rsiMean.toFixed(0)}` : ` / mean ${strategy.rsiMean.toFixed(0)}`;
    bits.push(`RSI ${strategy.rsi.toFixed(0)}${meanBit}`);
  }
  for (const driver of strategy.drivers) {
    if (driver.id === 'bb' || driver.id === 'rsi') continue;
    const label =
      driver.id === 'tape'
        ? locale === 'zh'
          ? '走勢'
          : 'tape'
        : driver.id === 'news'
          ? locale === 'zh'
            ? '標題'
            : 'news'
          : driver.id === 'filings'
            ? locale === 'zh'
              ? '申報'
              : 'filings'
            : driver.id === 'desk'
              ? locale === 'zh'
                ? '情緒'
                : 'bias'
              : locale === 'zh'
                ? '數據窗'
                : 'prints';
    bits.push(`${label} ${driver.score > 0.05 ? '+' : driver.score < -0.05 ? '−' : '·'}`);
  }
  return bits.join(' · ');
}
