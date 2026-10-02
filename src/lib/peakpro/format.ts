import type { Locale } from '@/i18n/locale';

export function formatPx(value: number, currency: string) {
  const ccy = currency === 'TWD' ? 'TWD' : 'USD';
  return new Intl.NumberFormat(ccy === 'TWD' ? 'zh-TW' : 'en-US', {
    style: 'currency',
    currency: ccy,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

export function toDisplayAmount(value: number, currency: string, locale: Locale, usdTwd?: number | null) {
  if (locale === 'zh' && currency !== 'TWD' && usdTwd && usdTwd > 0) return value * usdTwd;
  return value;
}

export function displayCurrency(currency: string, locale: Locale, usdTwd?: number | null) {
  if (locale === 'zh' && currency !== 'TWD' && usdTwd && usdTwd > 0) return 'TWD';
  return currency === 'TWD' ? 'TWD' : 'USD';
}

export function displayPx(value: number, currency: string, locale: Locale, usdTwd?: number | null) {
  return formatPx(toDisplayAmount(value, currency, locale, usdTwd), displayCurrency(currency, locale, usdTwd));
}

export function formatCap(value: number | undefined, currency: string) {
  if (!value || value <= 0) return null;
  const unit =
    value >= 1_000_000_000_000
      ? { n: value / 1_000_000_000_000, s: 'T' }
      : value >= 1_000_000_000
        ? { n: value / 1_000_000_000, s: 'B' }
        : { n: value / 1_000_000, s: 'M' };
  return `${currency === 'TWD' ? 'NT$' : '$'}${unit.n.toFixed(1)}${unit.s}`;
}

export function displayCap(
  value: number | undefined,
  currency: string,
  locale: Locale,
  usdTwd?: number | null,
) {
  return formatCap(toDisplayAmount(value ?? 0, currency, locale, usdTwd), displayCurrency(currency, locale, usdTwd));
}

export function formatPct(value: number) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatVol(value: number | null | undefined, market: 'taiwan' | 'us') {
  if (value == null || !Number.isFinite(value)) return '—';
  if (market === 'taiwan') {
    const lots = value / 1000;
    if (Math.abs(lots) >= 10_000) return `${(lots / 10_000).toFixed(1)}萬張`;
    return `${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(lots)}張`;
  }
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

export function formatZhang(shares: number) {
  const lots = shares / 1000;
  const sign = lots > 0 ? '+' : '';
  if (Math.abs(lots) >= 10_000) return `${sign}${(lots / 10_000).toFixed(1)}萬張`;
  return `${sign}${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(lots)}張`;
}

export function publicThesis(text: string | null | undefined) {
  const value = text?.trim() ?? '';
  if (!value || /yahoo|warehouse|scraper|快取|cache print/i.test(value)) return '';
  return value;
}
