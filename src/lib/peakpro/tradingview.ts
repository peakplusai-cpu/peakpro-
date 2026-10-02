import type { EquityMarket } from '@/lib/peakpro/yahoo';

const NASDAQ = new Set([
  'AAPL',
  'AMD',
  'AMZN',
  'AVGO',
  'COST',
  'GOOG',
  'GOOGL',
  'INTC',
  'META',
  'MSFT',
  'NFLX',
  'NVDA',
  'ORCL',
  'PLTR',
  'QCOM',
  'TSLA',
  'TSM',
]);

const NYSE = new Set(['BAC', 'JPM', 'WMT', 'XOM', 'V', 'JNJ', 'PG', 'KO', 'DIS']);

export function toTradingViewSymbol(market: EquityMarket, symbol: string, exchange?: string): string {
  const raw = symbol.trim().toUpperCase();
  if (market === 'taiwan') {
    const code = raw.replace(/\.(TW|TWO)$/i, '');
    return /\.TWO$/i.test(raw) ? `ROCO:${code}` : `TWSE:${code}`;
  }

  const ticker = raw.replace(/^(NASDAQ|NYSE|AMEX):/, '');
  const venue = (exchange ?? '').toUpperCase();
  if (venue.includes('NASDAQ')) return `NASDAQ:${ticker}`;
  if (venue.includes('NYSE') || venue.includes('NEW YORK')) return `NYSE:${ticker}`;
  if (venue.includes('AMEX') || venue.includes('ARCA')) return `AMEX:${ticker}`;
  if (NASDAQ.has(ticker)) return `NASDAQ:${ticker}`;
  if (NYSE.has(ticker)) return `NYSE:${ticker}`;
  return ticker;
}

export function tradingviewTimezone(market: EquityMarket) {
  return market === 'taiwan' ? 'Asia/Taipei' : 'America/New_York';
}
