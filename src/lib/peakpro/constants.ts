export const PEAKPRO_PATH = '/';
export const PEAKPRO_APP_PATH = '/app';
export const PEAKPRO_SUBSCRIBE_PATH = '/subscribe';
export const PEAKPRO_LOGIN_PATH = '/login';

export const FREE_MONTHLY_SYMBOLS = ['TSM', 'NVDA', 'AAPL', 'MSFT', 'TSLA'] as const;
export type FreeMonthlySymbol = (typeof FREE_MONTHLY_SYMBOLS)[number];

export const EQUITY_UNIVERSE = [
  { symbol: 'TSM', name: 'TSMC', venue: 'NYSE ADR', region: 'United States', free: true },
  { symbol: 'NVDA', name: 'NVIDIA', venue: 'NASDAQ', region: 'United States', free: true },
  { symbol: 'AAPL', name: 'Apple', venue: 'NASDAQ', region: 'United States', free: true },
  { symbol: 'MSFT', name: 'Microsoft', venue: 'NASDAQ', region: 'United States', free: true },
  { symbol: 'TSLA', name: 'Tesla', venue: 'NASDAQ', region: 'United States', free: true },
  { symbol: '2330.TW', name: 'TSMC (TW)', venue: 'TWSE', region: 'Taiwan', free: false },
  { symbol: '2317.TW', name: 'Hon Hai', venue: 'TWSE', region: 'Taiwan', free: false },
  { symbol: '2454.TW', name: 'MediaTek', venue: 'TWSE', region: 'Taiwan', free: false },
  { symbol: 'AMZN', name: 'Amazon', venue: 'NASDAQ', region: 'United States', free: false },
  { symbol: 'GOOGL', name: 'Alphabet', venue: 'NASDAQ', region: 'United States', free: false },
  { symbol: 'META', name: 'Meta Platforms', venue: 'NASDAQ', region: 'United States', free: false },
  { symbol: 'JPM', name: 'JPMorgan Chase', venue: 'NYSE', region: 'United States', free: false },
] as const;

export const CRYPTO_UNIVERSE = [
  { symbol: 'BTC', name: 'Bitcoin', id: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', id: 'ethereum' },
] as const;

export const GOLD_SYMBOL = 'XAUUSD';

export const PEAKPRO_MODULES = [
  'overview',
  'taiwan',
  'us',
  'crypto',
  'gold',
  'geopolitics',
  'sentiment',
  'trending',
  'brief',
] as const;

export type PeakProModule = (typeof PEAKPRO_MODULES)[number];

export function isPeakProModule(value: string): value is PeakProModule {
  return (PEAKPRO_MODULES as readonly string[]).includes(value);
}

export const WORLD_CLOCKS = [
  { id: 'us', countryEn: 'United States', countryZh: '美國', cityEn: 'New York', cityZh: '紐約', timeZone: 'America/New_York' },
  { id: 'cn', countryEn: 'China', countryZh: '中國', cityEn: 'Beijing', cityZh: '北京', timeZone: 'Asia/Shanghai' },
  { id: 'jp', countryEn: 'Japan', countryZh: '日本', cityEn: 'Tokyo', cityZh: '東京', timeZone: 'Asia/Tokyo' },
  { id: 'de', countryEn: 'Germany', countryZh: '德國', cityEn: 'Berlin', cityZh: '柏林', timeZone: 'Europe/Berlin' },
  { id: 'in', countryEn: 'India', countryZh: '印度', cityEn: 'Mumbai', cityZh: '孟買', timeZone: 'Asia/Kolkata' },
  { id: 'uk', countryEn: 'United Kingdom', countryZh: '英國', cityEn: 'London', cityZh: '倫敦', timeZone: 'Europe/London' },
  { id: 'fr', countryEn: 'France', countryZh: '法國', cityEn: 'Paris', cityZh: '巴黎', timeZone: 'Europe/Paris' },
  { id: 'it', countryEn: 'Italy', countryZh: '義大利', cityEn: 'Rome', cityZh: '羅馬', timeZone: 'Europe/Rome' },
  { id: 'br', countryEn: 'Brazil', countryZh: '巴西', cityEn: 'Brasília', cityZh: '巴西利亞', timeZone: 'America/Sao_Paulo' },
  { id: 'ca', countryEn: 'Canada', countryZh: '加拿大', cityEn: 'Toronto', cityZh: '多倫多', timeZone: 'America/Toronto' },
] as const;

export const PEAKPRO_PRICE_USD = 20;
export const PEAKPRO_BILLING_DAYS = 30;
