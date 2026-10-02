import { readPeakProCache } from '@/lib/peakpro/cache';
import {
  markLot,
  quoteSymbolFor,
  type MarkedLot,
  type PortfolioLot,
} from '@/lib/peakpro/portfolio';
import { fetchYahooQuotes } from '@/lib/peakpro/yahoo';

type Print = { last: number; name: string; currency?: string };

const GOLD_YAHOO = ['GC=F', 'XAUUSD=X', 'GOLD'];

async function lookupTwseMis(symbol: string): Promise<Print | null> {
  const code = symbol.replace(/\.(TW|TWO)$/i, '');
  if (!/^\d{4}$/.test(code)) return null;
  const boards = /\.TWO$/i.test(symbol) ? (['otc'] as const) : (['tse', 'otc'] as const);
  for (const board of boards) {
    try {
      const response = await fetch(
        `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${board}_${code}.tw&json=1&delay=0`,
        {
          cache: 'no-store',
          headers: {
            Accept: 'application/json,text/plain,*/*',
            'User-Agent': 'Mozilla/5.0',
            Referer: 'https://mis.twse.com.tw/',
          },
        },
      );
      if (!response.ok) continue;
      const json = (await response.json()) as {
        msgArray?: Array<{ z?: string; c?: string; n?: string; y?: string }>;
      };
      const row = json.msgArray?.[0];
      const last = Number(String(row?.z ?? '').replace(/,/g, ''));
      const prev = Number(String(row?.y ?? '').replace(/,/g, ''));
      const price = Number.isFinite(last) && last > 0 ? last : Number.isFinite(prev) && prev > 0 ? prev : null;
      if (!price) continue;
      return {
        last: price,
        name: row?.n?.trim() || code,
        currency: 'TWD',
      };
    } catch {
      continue;
    }
  }
  return null;
}

export async function resolveLotPrint(
  book: PortfolioLot['book'],
  symbol: string,
): Promise<Print | null> {
  const cache = await readPeakProCache();
  if (book === 'gold') {
    const row = cache.gold.find((item) => item.payload.last > 0) ?? cache.gold[0];
    if (row?.payload.last) {
      return { last: row.payload.last, name: row.payload.name, currency: row.payload.currency ?? 'USD' };
    }
    const quotes = await fetchYahooQuotes(GOLD_YAHOO);
    const hit = quotes.find((item) => typeof item.regularMarketPrice === 'number' && item.regularMarketPrice > 0);
    if (!hit?.regularMarketPrice) return null;
    return {
      last: hit.regularMarketPrice,
      name: hit.shortName ?? hit.longName ?? 'Gold',
      currency: hit.currency ?? 'USD',
    };
  }
  if (book === 'crypto') {
    const key = symbol.startsWith('ETH') ? 'ETH' : 'BTC';
    const row = cache.crypto.find((item) => item.symbol === key && item.payload.last > 0);
    if (row?.payload.last) {
      return { last: row.payload.last, name: row.payload.name, currency: row.payload.currency };
    }
  }
  if (book === 'taiwan' || book === 'us') {
    const row = cache.equities.find((item) => item.symbol === symbol && item.timeframe === 'daily' && item.payload.last > 0);
    if (row?.payload.last) {
      return { last: row.payload.last, name: row.payload.name, currency: row.payload.currency };
    }
  }
  if (book === 'taiwan') {
    const official = await lookupTwseMis(symbol);
    if (official) return official;
  }
  const [quote] = await fetchYahooQuotes([quoteSymbolFor(book, symbol)]);
  if (!quote?.regularMarketPrice) return null;
  return {
    last: quote.regularMarketPrice,
    name: quote.shortName ?? quote.longName ?? symbol,
    currency: quote.currency,
  };
}

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
      const row = cache.gold.find((item) => item.payload.last > 0) ?? cache.gold[0];
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
    const yahooSymbols = missing.flatMap((symbol) => (symbol === 'GC=F' ? GOLD_YAHOO : [symbol]));
    const quotes = await fetchYahooQuotes(yahooSymbols);
    for (const row of quotes) {
      if (typeof row.regularMarketPrice !== 'number' || row.regularMarketPrice <= 0) continue;
      prints.set(row.symbol, {
        last: row.regularMarketPrice,
        name: row.shortName ?? row.longName ?? row.symbol,
        currency: row.currency,
      });
      if (GOLD_YAHOO.includes(row.symbol)) prints.set('GC=F', prints.get(row.symbol)!);
    }
  }

  const missingTw = lots.filter(
    (lot) => lot.book === 'taiwan' && !prints.has(quoteSymbolFor(lot.book, lot.symbol)),
  );
  if (missingTw.length > 0) {
    await Promise.all(
      missingTw.map(async (lot) => {
        const official = await lookupTwseMis(lot.symbol);
        if (official) prints.set(lot.symbol, official);
      }),
    );
  }

  return lots.map((lot) => markLot(lot, prints.get(quoteSymbolFor(lot.book, lot.symbol)) ?? null));
}
