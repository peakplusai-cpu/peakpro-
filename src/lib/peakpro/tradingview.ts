import { normalizeCryptoSymbol } from '@/lib/peakpro/constants';
import type { EquityMarket } from '@/lib/peakpro/yahoo';

export type ChartMarket = EquityMarket | 'crypto';

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

function isTaiwanOtc(symbol: string, exchange?: string) {
  if (/\.TWO$/i.test(symbol)) return true;
  const venue = (exchange ?? '').toUpperCase();
  return (
    venue === 'TWO' ||
    venue.includes('ROCO') ||
    venue.includes('TPEX') ||
    venue.includes('GRETAI') ||
    venue.includes('TAIPEI EXCHANGE')
  );
}

export function toTradingViewSymbol(market: ChartMarket, symbol: string, exchange?: string): string {
  const raw = symbol.trim().toUpperCase();
  if (market === 'crypto') {
    const parsed = normalizeCryptoSymbol(raw);
    return parsed.symbol === 'ETH' ? 'BINANCE:ETHUSDT' : 'BINANCE:BTCUSDT';
  }
  if (market === 'taiwan') {
    const code = raw.replace(/\.(TW|TWO)$/i, '');
    return isTaiwanOtc(raw, exchange) ? `TPEX:${code}` : `TWSE:${code}`;
  }

  const ticker = raw.replace(/^(NASDAQ|NYSE|AMEX):/, '');
  const venue = (exchange ?? '').toUpperCase();
  if (venue.includes('NASDAQ')) return `NASDAQ:${ticker}`;
  if (venue.includes('NYSE') || venue.includes('NEW YORK')) return `NYSE:${ticker}`;
  if (venue.includes('AMEX') || venue.includes('ARCA')) return `AMEX:${ticker}`;
  if (NASDAQ.has(ticker)) return `NASDAQ:${ticker}`;
  if (NYSE.has(ticker)) return `NYSE:${ticker}`;
  return `NASDAQ:${ticker}`;
}

export function tradingviewTimezone(market: ChartMarket) {
  if (market === 'taiwan') return 'Asia/Taipei';
  if (market === 'crypto') return 'Etc/UTC';
  return 'America/New_York';
}

export function canEmbedTradingViewSymbol(tvSymbol: string) {
  return !tvSymbol.startsWith('TWSE:');
}

export function tradingviewChartUrl(tvSymbol: string, locale: 'zh' | 'en') {
  const host = locale === 'zh' ? 'https://tw.tradingview.com' : 'https://www.tradingview.com';
  return `${host}/chart/?symbol=${encodeURIComponent(tvSymbol)}`;
}

export function tradingviewEmbedSrc(symbol: string, locale: 'zh' | 'en', timezone: string) {
  const localeCode = locale === 'zh' ? 'zh_TW' : 'en';
  const config = {
    autosize: true,
    symbol,
    interval: 'D',
    timezone,
    theme: 'dark',
    style: '1',
    locale: localeCode,
    backgroundColor: '#000000',
    gridColor: 'rgba(212, 175, 55, 0.08)',
    hide_top_toolbar: false,
    hide_legend: false,
    hide_side_toolbar: true,
    allow_symbol_change: false,
    save_image: false,
    calendar: false,
    hide_volume: false,
    support_host: 'https://www.tradingview.com',
  };
  const hash = encodeURIComponent(JSON.stringify(config));
  return `https://s.tradingview.com/embed-widget/advanced-chart/?locale=${localeCode}&symbol=${encodeURIComponent(symbol)}#${hash}`;
}
