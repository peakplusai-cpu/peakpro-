export function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function std(values: number[]) {
  const m = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - m) ** 2)));
}

export interface BollingerRead {
  mid: number;
  upper: number;
  lower: number;
  pctB: number;
  bandwidth: number;
  sigma: number;
}

export interface RsiRead {
  rsi: number;
  mean: number | null;
  delta: number | null;
}

export function bollinger(closes: number[], period = 20, k = 2): BollingerRead | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const mid = mean(slice);
  const sigma = std(slice);
  const upper = mid + k * sigma;
  const lower = mid - k * sigma;
  const last = closes[closes.length - 1];
  const width = upper - lower;
  return {
    mid,
    upper,
    lower,
    pctB: width > 0 ? (last - lower) / width : 0.5,
    bandwidth: mid > 0 ? width / mid : 0,
    sigma,
  };
}

function rsiWindow(closes: number[], end: number, period: number): number | null {
  if (end < period) return null;
  let gain = 0;
  let loss = 0;
  for (let i = end - period + 1; i <= end; i += 1) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gain += delta;
    else loss -= delta;
  }
  if (loss === 0) return 100;
  const rs = gain / period / (loss / period);
  return 100 - 100 / (1 + rs);
}

export function rsiRead(closes: number[], period = 14, meanPeriod = 9): RsiRead | null {
  const last = rsiWindow(closes, closes.length - 1, period);
  if (last == null) return null;
  const series: number[] = [];
  for (let end = period; end < closes.length; end += 1) {
    const value = rsiWindow(closes, end, period);
    if (value != null) series.push(value);
  }
  const rsiMean = series.length >= meanPeriod ? mean(series.slice(-meanPeriod)) : null;
  return {
    rsi: last,
    mean: rsiMean,
    delta: rsiMean == null ? null : last - rsiMean,
  };
}

export function emaSeries(values: number[], period: number): number[] {
  if (values.length === 0 || period < 1) return [];
  const k = 2 / (period + 1);
  const out = new Array<number>(values.length);
  const seedAt = Math.min(period, values.length) - 1;
  out[seedAt] = mean(values.slice(0, seedAt + 1));
  for (let i = 0; i < seedAt; i += 1) out[i] = out[seedAt];
  for (let i = seedAt + 1; i < values.length; i += 1) {
    out[i] = values[i] * k + out[i - 1] * (1 - k);
  }
  return out;
}

export interface MacdRead {
  line: number;
  signal: number;
  hist: number;
  prevHist: number;
  histSeries: number[];
}

export function macdRead(closes: number[], fast = 12, slow = 26, signalPeriod = 9): MacdRead | null {
  if (closes.length < slow + signalPeriod) return null;
  const fastEma = emaSeries(closes, fast);
  const slowEma = emaSeries(closes, slow);
  const line = fastEma.map((value, index) => value - slowEma[index]);
  const signal = emaSeries(line, signalPeriod);
  const histSeries = line.map((value, index) => value - signal[index]);
  const last = histSeries.length - 1;
  return {
    line: line[last],
    signal: signal[last],
    hist: histSeries[last],
    prevHist: histSeries[last - 1] ?? 0,
    histSeries,
  };
}
