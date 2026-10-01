import { normalizeEquityQuery, type EquityMarket } from '@/lib/peakpro/yahoo';

export const PORTFOLIO_MAX_LOTS = 40;

export type PortfolioBook = 'taiwan' | 'us' | 'crypto' | 'gold';

export type PortfolioLot = {
  id: string;
  book: PortfolioBook;
  symbol: string;
  quantity: number;
  cost: number;
  currency: 'TWD' | 'USD';
  bought_on: string | null;
  created_at: string;
};

export type MarkedLot = PortfolioLot & {
  name: string;
  last: number | null;
  marketValue: number | null;
  costValue: number;
  pnl: number | null;
  pnlPct: number | null;
};

export function isPortfolioBook(value: unknown): value is PortfolioBook {
  return value === 'taiwan' || value === 'us' || value === 'crypto' || value === 'gold';
}

export function quoteSymbolFor(book: PortfolioBook, symbol: string): string {
  if (book === 'crypto') {
    if (symbol === 'BTC' || symbol === 'BTC-USD') return 'BTC-USD';
    if (symbol === 'ETH' || symbol === 'ETH-USD') return 'ETH-USD';
  }
  if (book === 'gold') return 'GC=F';
  return symbol;
}

export function parseLotSymbol(
  book: PortfolioBook,
  query: string,
): { symbol: string; currency: 'TWD' | 'USD'; error?: 'empty' | 'invalid' | 'wrong_market' } {
  const raw = query.trim();
  if (!raw) return { symbol: '', currency: 'USD', error: 'empty' };

  if (book === 'taiwan' || book === 'us') {
    const parsed = normalizeEquityQuery(raw, book as EquityMarket);
    if (parsed.error) return { symbol: parsed.symbol, currency: book === 'taiwan' ? 'TWD' : 'USD', error: parsed.error };
    return { symbol: parsed.symbol, currency: book === 'taiwan' ? 'TWD' : 'USD' };
  }

  const key = raw.toUpperCase().replace(/\s+/g, '');
  if (book === 'crypto') {
    if (key === 'BTC' || key === 'BTC-USD' || key === 'BITCOIN' || key === 'XBT') {
      return { symbol: 'BTC-USD', currency: 'USD' };
    }
    if (key === 'ETH' || key === 'ETH-USD' || key === 'ETHEREUM') {
      return { symbol: 'ETH-USD', currency: 'USD' };
    }
    return { symbol: key, currency: 'USD', error: 'invalid' };
  }

  if (key === 'GC=F' || key === 'XAUUSD' || key === 'XAU' || key === 'GOLD') {
    return { symbol: 'GC=F', currency: 'USD' };
  }
  return { symbol: key, currency: 'USD', error: 'invalid' };
}

export function markLot(
  lot: PortfolioLot,
  print: { last: number; name: string; currency?: string } | null,
): MarkedLot {
  const costValue = lot.quantity * lot.cost;
  if (!print || !Number.isFinite(print.last)) {
    return {
      ...lot,
      name: lot.symbol,
      last: null,
      marketValue: null,
      costValue,
      pnl: null,
      pnlPct: null,
    };
  }
  const marketValue = lot.quantity * print.last;
  const pnl = marketValue - costValue;
  const pnlPct = lot.cost > 0 ? ((print.last - lot.cost) / lot.cost) * 100 : null;
  return {
    ...lot,
    name: print.name,
    last: print.last,
    marketValue,
    costValue,
    pnl,
    pnlPct,
  };
}

export function totalsByCurrency(rows: MarkedLot[]) {
  const books = { TWD: { cost: 0, market: 0, pnl: 0 }, USD: { cost: 0, market: 0, pnl: 0 } };
  for (const row of rows) {
    const bucket = books[row.currency];
    bucket.cost += row.costValue;
    if (row.marketValue != null && row.pnl != null) {
      bucket.market += row.marketValue;
      bucket.pnl += row.pnl;
    }
  }
  return books;
}
