import { biasRankFromScore } from '@/lib/peakpro/forecast';
import { bollinger, emaSeries, macdRead, mean, rsiRead } from '@/lib/peakpro/indicators';
import type { OhlcBar } from '@/lib/peakpro/types';

const MIN_BARS = 40;

function clamp(value: number, lo = -1, hi = 1) {
  return Math.max(lo, Math.min(hi, value));
}

function finiteCloses(bars: OhlcBar[]) {
  return bars.map((bar) => bar.c).filter((value) => Number.isFinite(value) && value > 0);
}

function crossIn(fast: number[], slow: number[], lookback: number): 1 | -1 | 0 {
  const last = fast.length - 1;
  for (let offset = 0; offset < lookback; offset += 1) {
    const cur = last - offset;
    const prev = cur - 1;
    if (prev < 0) break;
    if (fast[prev] <= slow[prev] && fast[cur] > slow[cur]) return 1;
    if (fast[prev] >= slow[prev] && fast[cur] < slow[cur]) return -1;
  }
  return 0;
}

function zeroCross(series: number[], lookback: number): 1 | -1 | 0 {
  const zeros = series.map(() => 0);
  return crossIn(series, zeros, lookback);
}

function squeezeBreak(closes: number[]): number {
  const bb = bollinger(closes);
  if (!bb) return 0;
  const widths: number[] = [];
  const start = Math.max(20, closes.length - 12);
  for (let end = start; end <= closes.length; end += 1) {
    const read = bollinger(closes.slice(0, end));
    if (read) widths.push(read.bandwidth);
  }
  if (widths.length < 4) return bb.pctB >= 0.6 ? 0.15 : bb.pctB <= 0.4 ? -0.15 : 0;
  const last = widths[widths.length - 1];
  const prior = widths.slice(0, -1);
  const floor = Math.min(...prior);
  const avg = mean(prior);
  const expanding = last > floor * 1.35;
  const wasTight = floor < avg * 0.78;
  const lastClose = closes[closes.length - 1];
  if (wasTight && expanding) {
    if (lastClose > bb.mid) return 0.9;
    if (lastClose < bb.mid) return -0.9;
  }
  if (bb.pctB >= 0.62) return 0.18;
  if (bb.pctB <= 0.38) return -0.18;
  return 0;
}

function rsiMomentum(closes: number[]): { score: number; fresh: 1 | -1 | 0 } {
  const current = rsiRead(closes);
  const prior = rsiRead(closes.slice(0, -1));
  if (!current) return { score: 0, fresh: 0 };
  const rsi = current.rsi;
  const prev = prior?.rsi ?? rsi;
  let fresh: 1 | -1 | 0 = 0;
  if (prev <= 50 && rsi > 50) fresh = 1;
  else if (prev >= 50 && rsi < 50) fresh = -1;

  let score = 0;
  if (rsi >= 50 && rsi < 62) score = 0.7;
  else if (rsi >= 62 && rsi < 72) score = 0.4;
  else if (rsi >= 72) score = 0.12;
  else if (rsi <= 50 && rsi > 38) score = -0.7;
  else if (rsi <= 38 && rsi > 28) score = -0.4;
  else score = -0.12;

  if (fresh === 1) score = Math.max(score, 0.85);
  if (fresh === -1) score = Math.min(score, -0.85);
  return { score, fresh };
}

function volumeThrust(bars: OhlcBar[]): number {
  const volumes = bars.map((bar) => bar.v).filter((value): value is number => value != null && Number.isFinite(value) && value > 0);
  if (volumes.length < 21 || volumes.length !== bars.length) return 0;
  const avg = mean(volumes.slice(-21, -1));
  if (!(avg > 0)) return 0;
  const last = volumes[volumes.length - 1];
  const bar = bars[bars.length - 1];
  const dir = bar.c >= bar.o ? 1 : -1;
  if (last > avg * 1.6) return 0.55 * dir;
  if (last > avg * 1.25) return 0.28 * dir;
  return 0;
}

/** Momentum / breakout hunter. Fresh crosses beat already-extended moves. Not mean-reversion. */
export function hunterScoreFromBars(bars: OhlcBar[]): number | null {
  const closes = finiteCloses(bars);
  if (closes.length < MIN_BARS) return null;

  const emaFast = emaSeries(closes, 9);
  const emaSlow = emaSeries(closes, 21);
  const last = closes[closes.length - 1];
  const fast = emaFast[emaFast.length - 1];
  const slow = emaSlow[emaSlow.length - 1];
  const gap = slow !== 0 ? Math.abs(fast - slow) / Math.abs(slow) : 0;

  let structure = 0;
  if (last > fast && fast > slow) structure = 0.68 + clamp(gap * 18, 0, 0.32);
  else if (last < fast && fast < slow) structure = -0.68 - clamp(gap * 18, 0, 0.32);
  else if (last > slow) structure = 0.22;
  else if (last < slow) structure = -0.22;

  const emaCross = crossIn(emaFast, emaSlow, 3);
  if (emaCross === 1) structure = Math.max(structure, 0.88);
  if (emaCross === -1) structure = Math.min(structure, -0.88);

  const macd = macdRead(closes);
  let macdScore = 0;
  let macdCross: 1 | -1 | 0 = 0;
  if (macd) {
    macdCross = zeroCross(macd.histSeries, 3);
    if (macd.hist > 0 && macd.hist >= macd.prevHist) macdScore = 0.62;
    else if (macd.hist < 0 && macd.hist <= macd.prevHist) macdScore = -0.62;
    else if (macd.hist > 0) macdScore = 0.22;
    else if (macd.hist < 0) macdScore = -0.22;
    if (macdCross === 1) macdScore = 0.9;
    if (macdCross === -1) macdScore = -0.9;
  }

  const rsi = rsiMomentum(closes);
  const squeeze = squeezeBreak(closes);
  const volume = volumeThrust(bars);

  const parts = [
    { score: structure, weight: 0.3 },
    { score: macdScore, weight: macd ? 0.22 : 0 },
    { score: rsi.score, weight: 0.16 },
    { score: squeeze, weight: 0.18 },
    { score: volume, weight: volume === 0 ? 0 : 0.14 },
  ].filter((row) => row.weight > 0);
  const weightSum = parts.reduce((sum, row) => sum + row.weight, 0) || 1;
  const direction = parts.reduce((sum, row) => sum + row.score * row.weight, 0) / weightSum;

  let fresh = 0;
  if (emaCross) fresh += 0.34;
  if (macdCross) fresh += 0.34;
  if (Math.abs(squeeze) >= 0.8) fresh += 0.28;
  if (rsi.fresh) fresh += 0.24;
  if (Math.abs(volume) >= 0.5) fresh += 0.12;

  return clamp(direction * (0.52 + 0.48 * clamp(Math.max(fresh, 0.35), 0, 1)));
}

export function hunterRankFromBars(bars: OhlcBar[]): number | null {
  const score = hunterScoreFromBars(bars);
  if (score == null) return null;
  return biasRankFromScore(score);
}
