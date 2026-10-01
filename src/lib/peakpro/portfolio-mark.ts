import { readPeakProCache } from '@/lib/peakpro/cache';
import {
  markLot,
  quoteSymbolFor,
  type MarkedLot,
  type PortfolioLot,
} from '@/lib/peakpro/portfolio';
import { fetchYahooQuotes } from '@/lib/peakpro/yahoo';

type Print = { last: number; name: string; currency?: string };

export async function markLots(lots: PortfolioLot[]): Promise<MarkedLot[]> {
  const cache = await readPeakProCache();
  const prints = new Map<string, Print>();

  for (const lot of lots) {
    const quote = quoteSymbolFor(lot.book, lot.symbol);
    if (lot.book === 'taiwan' || lot.book === 'us') {
      const row = cache.equities.find((item) => item.symbol === lot.symbol && item.timeframe === 'daily');
      if (row?.payload.last) {
        prints.set(quote, {
          last: row.payload.last,
          name: row.payload.name,
          currency: row.payload.currency,
        });
      }
    }
    if (lot.book === 'crypto') {
      const key = lot.symbol.startsWith('BTC') ? 'BTC' : lot.symbol.startsWith('ETH') ? 'ETH' : '';
      const row = cache.crypto.find((item) => item.symbol === key && (item.timeframe === 'daily' || item.timeframe === 'spot'));
      if (row?.payload.last) {
        prints.set(quote, {
          last: row.payload.last,
          name: row.payload.name,
          currency: row.payload.currency,
        });
      }
    }
    if (lot.book === 'gold') {
      const row = cache.gold[0];
      if (row?.payload.last) {
        prints.set(quote, {
          last: row.payload.last,
          name: row.payload.name,
          currency: row.payload.currency,
        });
      }
    }
  }

  const missing = [...new Set(lots.map((lot) => quoteSymbolFor(lot.book, lot.symbol)))].filter(
    (symbol) => !prints.has(symbol),
  );
  if (missing.length > 0) {
    const quotes = await fetchYahooQuotes(missing);
    for (const row of quotes) {
      if (typeof row.regularMarketPrice !== 'number') continue;
      prints.set(row.symbol, {
        last: row.regularMarketPrice,
        name: row.shortName ?? row.longName ?? row.symbol,
        currency: row.currency,
      });
    }
  }

  return lots.map((lot) => markLot(lot, prints.get(quoteSymbolFor(lot.book, lot.symbol)) ?? null));
}
