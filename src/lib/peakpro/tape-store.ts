import { TAPE_TW_BENCH, TAPE_US_BENCH } from '@/lib/peakpro/constants';
import { peakproAdmin } from '@/lib/peakpro/db';
import type { OfficialPrint } from '@/lib/peakpro/market-trending';
import { activeSessionDate, marketCalendarDate, taipeiCalendarDate, tapeMarketFor } from '@/lib/peakpro/session-clock';
import {
  buildTapeDesk,
  type InstitutionalPrint,
  type SessionPrint,
  type TapeDesk,
} from '@/lib/peakpro/tape';
import { fetchOfficialInstitutional, type InstitutionalRow } from '@/lib/peakpro/twse';
import type { MarketDataRow, OhlcBar, TrendingItem } from '@/lib/peakpro/types';
import { fetchYahooChart, fetchYahooQuotes, isTaiwanSymbol, yahooToBars, type YahooQuote } from '@/lib/peakpro/yahoo';

const SETUP_RE = /peakpro_session_prints|peakpro_institutional|does not exist|schema cache/i;

export function isTapeSetupError(message: string | undefined) {
  return Boolean(message && SETUP_RE.test(message));
}

export function printFromQuote(
  symbol: string,
  fallbackName: string,
  quote: YahooQuote | null,
  dailyBars?: OhlcBar[],
): SessionPrint | null {
  if (!quote && !dailyBars?.length) return null;
  const market = tapeMarketFor(symbol);
  const lastBar = dailyBars?.at(-1);
  const prevBar = dailyBars && dailyBars.length >= 2 ? dailyBars[dailyBars.length - 2] : undefined;
  const price = quote?.regularMarketPrice ?? lastBar?.c ?? null;
  if (price == null) return null;
  const sessionDate = quote?.regularMarketTime
    ? marketCalendarDate(new Date(quote.regularMarketTime * 1000), market)
    : lastBar?.t ?? activeSessionDate(new Date(), market);
  const barChg =
    lastBar && prevBar && prevBar.c > 0 ? ((lastBar.c - prevBar.c) / prevBar.c) * 100 : null;

  return {
    symbol,
    name: quote?.shortName ?? quote?.longName ?? fallbackName,
    market,
    session_date: sessionDate,
    scraped_at: new Date().toISOString(),
    price,
    change_pct: quote?.regularMarketChangePercent ?? barChg,
    volume: quote?.regularMarketVolume ?? lastBar?.v ?? null,
    day_open: quote?.regularMarketOpen ?? lastBar?.o ?? null,
    day_high: quote?.regularMarketDayHigh ?? lastBar?.h ?? null,
    day_low: quote?.regularMarketDayLow ?? lastBar?.l ?? null,
    prev_close: quote?.regularMarketPreviousClose ?? null,
    currency: quote?.currency === 'TWD' || isTaiwanSymbol(symbol) ? 'TWD' : 'USD',
  };
}

export function printFromOfficial(row: OfficialPrint): SessionPrint {
  const prev = row.changePct !== 0 ? row.last / (1 + row.changePct / 100) : row.last;
  return {
    symbol: row.symbol,
    name: row.name,
    market: 'taiwan',
    session_date: row.tradeDate || taipeiCalendarDate(),
    scraped_at: new Date().toISOString(),
    price: row.last,
    change_pct: row.changePct,
    volume: row.volume,
    day_open: row.open ?? null,
    day_high: row.high ?? null,
    day_low: row.low ?? null,
    prev_close: Number.isFinite(prev) ? prev : null,
    currency: 'TWD',
  };
}

export function printFromTrendingItem(item: TrendingItem): SessionPrint | null {
  if (item.last == null || item.last <= 0) return null;
  const market = item.market === 'taiwan' || isTaiwanSymbol(item.symbol) ? 'taiwan' : 'us';
  return {
    symbol: item.symbol,
    name: item.name,
    market,
    session_date: activeSessionDate(new Date(), market),
    scraped_at: new Date().toISOString(),
    price: item.last,
    change_pct: item.changePct,
    volume: null,
    day_open: null,
    day_high: null,
    day_low: null,
    prev_close: null,
    currency: item.currency === 'TWD' || market === 'taiwan' ? 'TWD' : 'USD',
  };
}

export async function insertSessionPrints(prints: SessionPrint[]) {
  if (prints.length === 0) return { inserted: 0, setup: false };
  const admin = peakproAdmin();
  const symbols = [...new Set(prints.map((row) => row.symbol))];
  const { data: recent, error: recentError } = await admin
    .from('peakpro_session_prints')
    .select('*')
    .in('symbol', symbols)
    .order('scraped_at', { ascending: false })
    .limit(200);
  if (recentError) {
    if (isTapeSetupError(recentError.message)) return { inserted: 0, setup: true };
    console.warn('[peakpro/tape] read prints failed', recentError.message);
    return { inserted: 0, setup: false };
  }

  const lastBySymbol = new Map<string, SessionPrint>();
  for (const row of (recent ?? []) as SessionPrint[]) {
    if (!lastBySymbol.has(row.symbol)) lastBySymbol.set(row.symbol, row);
  }

  const fresh = prints.filter((print) => {
    const prev = lastBySymbol.get(print.symbol);
    if (!prev) return true;
    if (prev.session_date !== print.session_date) return true;
    if (
      Math.abs((prev.price ?? 0) - (print.price ?? 0)) < 1e-6 &&
      (prev.volume ?? 0) === (print.volume ?? 0)
    ) {
      return false;
    }
    return true;
  });

  if (fresh.length === 0) return { inserted: 0, setup: false };

  const { error } = await admin.from('peakpro_session_prints').insert(fresh);
  if (error) {
    if (isTapeSetupError(error.message)) return { inserted: 0, setup: true };
    console.warn('[peakpro/tape] insert prints failed', error.message);
    return { inserted: 0, setup: false };
  }

  await admin
    .from('peakpro_session_prints')
    .delete()
    .lt('scraped_at', new Date(Date.now() - 8 * 86_400_000).toISOString());

  return { inserted: fresh.length, setup: false };
}

export async function upsertInstitutional(rows: InstitutionalRow[]) {
  if (rows.length === 0) return { upserted: 0, setup: false };
  const admin = peakproAdmin();
  const { error } = await admin.from('peakpro_institutional').upsert(rows, { onConflict: 'trade_date,symbol' });
  if (error) {
    if (isTapeSetupError(error.message)) return { upserted: 0, setup: true };
    console.warn('[peakpro/tape] institutional upsert failed', error.message);
    return { upserted: 0, setup: false };
  }
  await admin
    .from('peakpro_institutional')
    .delete()
    .lt('trade_date', new Date(Date.now() - 40 * 86_400_000).toISOString().slice(0, 10));
  return { upserted: rows.length, setup: false };
}

export async function persistTapeFromScrape(prints: SessionPrint[], warehouseSymbols: string[]) {
  const now = new Date();
  const needed = [TAPE_TW_BENCH, TAPE_US_BENCH].filter((symbol) => {
    const session = activeSessionDate(now, tapeMarketFor(symbol));
    return !prints.some((print) => print.symbol === symbol && print.session_date === session && print.change_pct != null);
  });
  if (needed.length > 0) {
    const quotes = await fetchYahooQuotes(needed);
    for (const symbol of needed) {
      const quote = quotes.find((row) => row.symbol === symbol) ?? null;
      let bars: OhlcBar[] | undefined;
      if (!quote?.regularMarketChangePercent) {
        const chart = await fetchYahooChart(symbol, 'daily');
        bars = chart ? yahooToBars(chart) : undefined;
      }
      const print = printFromQuote(symbol, symbol, quote, bars);
      if (print) prints.push(print);
    }
  }

  const printResult = await insertSessionPrints(prints);
  const includeOtc = true;
  let institutional = 0;
  try {
    const admin = peakproAdmin();
    const { data: latest } = await admin
      .from('peakpro_institutional')
      .select('trade_date')
      .order('trade_date', { ascending: false })
      .limit(1);
    const hasHistory = Boolean(latest?.[0]?.trade_date);
    const board = await fetchOfficialInstitutional({ days: hasHistory ? 3 : 8, includeOtc });
    const twKeep = new Set(warehouseSymbols.filter((symbol) => /\.(TW|TWO)$/i.test(symbol)));
    const focused = twKeep.size > 0 ? board.filter((row) => twKeep.has(row.symbol)) : board;
    const saved = await upsertInstitutional(focused);
    institutional = saved.upserted;
  } catch (error) {
    console.warn('[peakpro/tape] institutional scrape failed', error);
  }
  return { prints: printResult.inserted, institutional, setup: printResult.setup };
}

function asPrint(row: Record<string, unknown>): SessionPrint {
  return {
    symbol: String(row.symbol),
    name: String(row.name ?? row.symbol),
    market: row.market === 'taiwan' ? 'taiwan' : 'us',
    session_date: String(row.session_date),
    scraped_at: String(row.scraped_at),
    price: row.price == null ? null : Number(row.price),
    change_pct: row.change_pct == null ? null : Number(row.change_pct),
    volume: row.volume == null ? null : Number(row.volume),
    day_open: row.day_open == null ? null : Number(row.day_open),
    day_high: row.day_high == null ? null : Number(row.day_high),
    day_low: row.day_low == null ? null : Number(row.day_low),
    prev_close: row.prev_close == null ? null : Number(row.prev_close),
    currency: row.currency === 'TWD' ? 'TWD' : 'USD',
  };
}

function asInst(row: Record<string, unknown>): InstitutionalPrint {
  return {
    trade_date: String(row.trade_date),
    symbol: String(row.symbol),
    name: String(row.name ?? row.symbol),
    foreign_net: Number(row.foreign_net ?? 0),
    trust_net: Number(row.trust_net ?? 0),
    dealer_net: Number(row.dealer_net ?? 0),
    total_net: Number(row.total_net ?? 0),
    source: String(row.source ?? 'twse'),
  };
}

export async function loadTapeDesk(options: {
  bookSymbols: string[];
  extraSymbols?: string[];
  dailyRows: MarketDataRow[];
}): Promise<{ desk: TapeDesk; setup: boolean }> {
  const admin = peakproAdmin();
  const symbols = [
    ...new Set([
      ...options.bookSymbols,
      ...(options.extraSymbols ?? []),
      TAPE_TW_BENCH,
      TAPE_US_BENCH,
      ...options.dailyRows.map((row) => row.symbol),
    ]),
  ].filter(Boolean);

  const twSymbols = symbols.filter((symbol) => /\.(TW|TWO)$/i.test(symbol));
  const [printRes, benchRes, instRes] = await Promise.all([
    admin
      .from('peakpro_session_prints')
      .select('*')
      .in('symbol', symbols.length > 0 ? symbols : ['__none__'])
      .order('scraped_at', { ascending: false })
      .limit(2400),
    admin
      .from('peakpro_session_prints')
      .select('*')
      .in('symbol', [TAPE_TW_BENCH, TAPE_US_BENCH])
      .order('scraped_at', { ascending: false })
      .limit(80),
    admin
      .from('peakpro_institutional')
      .select('*')
      .in('symbol', twSymbols.length > 0 ? twSymbols : ['__none__'])
      .order('trade_date', { ascending: false })
      .limit(800),
  ]);

  if (printRes.error && isTapeSetupError(printRes.error.message)) {
    return {
      desk: buildTapeDesk({
        prints: [],
        institutional: [],
        dailyBars: new Map(),
        bookSymbols: options.bookSymbols,
        extraSymbols: options.extraSymbols,
      }),
      setup: true,
    };
  }
  if (printRes.error) console.warn('[peakpro/tape] load prints failed', printRes.error.message);
  if (benchRes.error && !isTapeSetupError(benchRes.error.message)) {
    console.warn('[peakpro/tape] load benches failed', benchRes.error.message);
  }
  if (instRes.error && !isTapeSetupError(instRes.error.message)) {
    console.warn('[peakpro/tape] load institutional failed', instRes.error.message);
  }

  const dailyBars = new Map<string, { name: string; bars: OhlcBar[] }>();
  for (const row of options.dailyRows) {
    if (row.timeframe !== 'daily') continue;
    dailyBars.set(row.symbol, { name: row.payload.name, bars: row.payload.bars ?? [] });
  }

  const mergedPrints = new Map<string, SessionPrint>();
  for (const row of [...(printRes.data ?? []), ...(benchRes.data ?? [])] as Record<string, unknown>[]) {
    const print = asPrint(row);
    mergedPrints.set(`${print.symbol}|${print.session_date}|${print.scraped_at}`, print);
  }

  return {
    desk: buildTapeDesk({
      prints: [...mergedPrints.values()],
      institutional: ((instRes.data ?? []) as Record<string, unknown>[]).map(asInst),
      dailyBars,
      bookSymbols: options.bookSymbols,
      extraSymbols: options.extraSymbols,
    }),
    setup: Boolean(instRes.error && isTapeSetupError(instRes.error.message)),
  };
}
