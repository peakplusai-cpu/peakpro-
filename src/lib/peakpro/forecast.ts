import type { MarketTimeframe, OhlcBar } from '@/lib/peakpro/types';

export interface ProjectedBar extends OhlcBar {
  /** 1σ band around the median path at this bar. */
  lo: number;
  hi: number;
}

export interface Projection {
  bars: ProjectedBar[];
  /** Median-path move over the whole horizon, in percent. */
  movePct: number;
  /** Per-bar volatility, in percent. */
  sigmaPct: number;
  direction: 'up' | 'down' | 'flat';
  timeframe: MarketTimeframe;
}

const HORIZON: Partial<Record<MarketTimeframe, number>> = { daily: 10, weekly: 8, monthly: 6, annual: 3 };
const MIN_BARS = 20;

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function std(values: number[]) {
  const m = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - m) ** 2)));
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

/**
 * Deterministic extrapolation from the warehouse bars: blended short/long log-return drift
 * (shrunk so it does not compound into a fantasy), widening 1σ cone from realised volatility.
 * No randomness, no outside data: same bars in, same path out.
 */
export function projectBars(bars: OhlcBar[], timeframe: MarketTimeframe = 'daily'): Projection | null {
  const closes = bars.map((bar) => bar.c).filter((value) => Number.isFinite(value) && value > 0);
  if (closes.length < MIN_BARS) return null;

  const window = closes.slice(-91);
  const returns = window.slice(1).map((value, index) => Math.log(value / window[index]));
  const drift = 0.7 * (0.5 * mean(returns.slice(-20)) + 0.5 * mean(returns));
  const sigma = Math.max(std(returns), 0.0015);

  const horizon = HORIZON[timeframe] ?? 10;
  const lastBar = bars[bars.length - 1];
  const start = closes[closes.length - 1];
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

  const total = drift * horizon;
  const flatBand = 0.25 * sigma * Math.sqrt(horizon);
  return {
    bars: out,
    movePct: (Math.exp(total) - 1) * 100,
    sigmaPct: sigma * 100,
    direction: Math.abs(total) < flatBand ? 'flat' : total > 0 ? 'up' : 'down',
    timeframe,
  };
}
