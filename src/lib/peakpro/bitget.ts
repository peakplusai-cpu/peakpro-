import { normalizeCryptoSymbol } from '@/lib/peakpro/constants';
import { biasRankFromBars } from '@/lib/peakpro/forecast';
import type { OhlcBar } from '@/lib/peakpro/types';

const BITGET_REST = 'https://api.bitget.com';
const SPOT_INTERVAL = '1D';
const PERP_INTERVAL = '15m';
const CANDLE_LIMIT = '90';
const TOP_N = 50;

type BitgetCategory = 'SPOT' | 'USDT-FUTURES';
type BitgetEnvelope<T> = { code?: string; msg?: string; data?: T };
type BitgetTicker = {
  symbol?: string;
  lastPrice?: string;
  price24hPcnt?: string;
  highPrice24h?: string;
  lowPrice24h?: string;
  fundingRate?: string;
  turnover24h?: string;
};
type BitgetCandle = [string, string, string, string, string, string, string];
type BitgetInstrument = {
  symbol?: string;
  baseCoin?: string;
  quoteCoin?: string;
  symbolType?: string;
  instrumentType?: string;
  fullName?: string;
  status?: string;
  type?: string;
};

export interface BitgetQuote {
  last: number;
  changePct: number;
  high24h: number | null;
  low24h: number | null;
  fundingRate: number | null;
  rank: number | null;
}

export interface BitgetNameTape {
  symbol: string;
  pair: string;
  name: string;
  turnover: number;
  spot: BitgetQuote;
  perp: BitgetQuote;
}

export interface BitgetCryptoDesk {
  asOf: string;
  venue: 'bitget';
  names: BitgetNameTape[];
}

export interface BitgetSearchHit {
  symbol: string;
  name: string;
  pair: string;
}

function num(value: string | undefined): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function pairFor(symbol: string) {
  const base = symbol.trim().toUpperCase().replace(/USDT$/, '');
  return `${base}USDT`;
}

export function baseFromPair(pair: string) {
  return pair.trim().toUpperCase().replace(/USDT$/, '');
}

async function bitgetJson<T>(path: string, query: Record<string, string>, revalidate: number): Promise<T | null> {
  const url = new URL(path, BITGET_REST);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'PeakProPlus-CacheDesk/1.0' },
      next: { revalidate },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as BitgetEnvelope<T>;
    if (body.code !== '00000') {
      console.warn('[peakpro/bitget] api', path, body.code, body.msg);
      return null;
    }
    return body.data ?? null;
  } catch (error) {
    console.warn('[peakpro/bitget] fetch failed', url.toString(), error);
    return null;
  }
}

function tickerMap(rows: BitgetTicker[] | BitgetTicker | null | undefined) {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  const map = new Map<string, BitgetTicker>();
  for (const row of list) {
    const symbol = row.symbol?.toUpperCase();
    if (symbol) map.set(symbol, row);
  }
  return map;
}

function tickerToQuote(ticker: BitgetTicker | undefined, extras?: Partial<BitgetQuote>): BitgetQuote {
  const last = extras?.last ?? num(ticker?.lastPrice) ?? 0;
  const change = num(ticker?.price24hPcnt);
  return {
    last,
    changePct: extras?.changePct ?? (change == null ? 0 : change * 100),
    high24h: extras?.high24h ?? num(ticker?.highPrice24h),
    low24h: extras?.low24h ?? num(ticker?.lowPrice24h),
    fundingRate: extras?.fundingRate ?? num(ticker?.fundingRate) ?? null,
    rank: extras?.rank ?? null,
  };
}

function candlesToBars(rows: BitgetCandle[] | null | undefined): OhlcBar[] {
  if (!rows?.length) return [];
  return [...rows]
    .map((row) => {
      const t = Number(row[0]);
      const o = Number(row[1]);
      const h = Number(row[2]);
      const l = Number(row[3]);
      const c = Number(row[4]);
      if (!Number.isFinite(t) || !Number.isFinite(c) || c <= 0) return null;
      return {
        t: new Date(t).toISOString(),
        o: Number.isFinite(o) ? o : c,
        h: Number.isFinite(h) ? h : c,
        l: Number.isFinite(l) ? l : c,
        c,
      };
    })
    .filter((bar): bar is OhlcBar => Boolean(bar))
    .sort((a, b) => a.t.localeCompare(b.t));
}

function isCryptoInstrument(row: BitgetInstrument) {
  const type = (row.symbolType ?? row.instrumentType ?? '').toLowerCase();
  if (type !== 'crypto') return false;
  if ((row.quoteCoin ?? '').toUpperCase() !== 'USDT') return false;
  if (row.status && row.status !== 'online') return false;
  const base = (row.baseCoin ?? baseFromPair(row.symbol ?? '')).toUpperCase();
  if (!base || /[0-9][LS]$/.test(base)) return false;
  return Boolean(row.symbol);
}

async function loadCryptoInstruments() {
  const rows = await bitgetJson<BitgetInstrument[]>('/api/v3/market/instruments', { category: 'USDT-FUTURES' }, 300);
  return (rows ?? []).filter(isCryptoInstrument);
}

async function loadTickers(category: BitgetCategory) {
  return tickerMap(await bitgetJson<BitgetTicker[]>('/api/v3/market/tickers', { category }, 15));
}

async function loadCandles(category: BitgetCategory, pair: string, interval: string) {
  const rows = await bitgetJson<BitgetCandle[]>(
    '/api/v3/market/candles',
    { category, symbol: pair, interval, limit: CANDLE_LIMIT },
    interval === PERP_INTERVAL ? 20 : 60,
  );
  return candlesToBars(rows);
}

function tapeFromTickers(
  instrument: BitgetInstrument,
  spot: BitgetTicker | undefined,
  perp: BitgetTicker | undefined,
): BitgetNameTape {
  const pair = (instrument.symbol ?? '').toUpperCase();
  const symbol = (instrument.baseCoin ?? baseFromPair(pair)).toUpperCase();
  return {
    symbol,
    pair,
    name: instrument.fullName?.trim() || symbol,
    turnover: num(perp?.turnover24h) ?? 0,
    spot: tickerToQuote(spot),
    perp: tickerToQuote(perp, { fundingRate: num(perp?.fundingRate) }),
  };
}

export async function loadBitgetCryptoDesk(): Promise<BitgetCryptoDesk> {
  const [instruments, spotTickers, perpTickers] = await Promise.all([
    loadCryptoInstruments(),
    loadTickers('SPOT'),
    loadTickers('USDT-FUTURES'),
  ]);
  const names = instruments
    .map((row) => tapeFromTickers(row, spotTickers.get((row.symbol ?? '').toUpperCase()), perpTickers.get((row.symbol ?? '').toUpperCase())))
    .filter((row) => row.perp.last > 0 || row.spot.last > 0)
    .sort((a, b) => b.turnover - a.turnover)
    .slice(0, TOP_N);
  return { asOf: new Date().toISOString(), venue: 'bitget', names };
}

export async function loadBitgetName(symbol: string): Promise<BitgetNameTape | null> {
  const pair = pairFor(symbol);
  const [instruments, spotTickers, perpTickers, spotBars, perpBars] = await Promise.all([
    loadCryptoInstruments(),
    loadTickers('SPOT'),
    loadTickers('USDT-FUTURES'),
    loadCandles('SPOT', pair, SPOT_INTERVAL),
    loadCandles('USDT-FUTURES', pair, PERP_INTERVAL),
  ]);
  const instrument =
    instruments.find((row) => (row.symbol ?? '').toUpperCase() === pair) ??
    instruments.find((row) => (row.baseCoin ?? '').toUpperCase() === symbol.toUpperCase());
  if (!instrument && !perpTickers.get(pair) && !spotTickers.get(pair)) return null;

  const spotTicker = spotTickers.get(pair);
  const perpTicker = perpTickers.get(pair);
  const spotLast = spotBars[spotBars.length - 1]?.c;
  const spotPrev = spotBars[spotBars.length - 2]?.c;
  const perpLast = perpBars[perpBars.length - 1]?.c;
  const perpPrev = perpBars[perpBars.length - 2]?.c;
  const spotChange = spotLast && spotPrev ? ((spotLast - spotPrev) / spotPrev) * 100 : undefined;
  const perpChange = perpLast && perpPrev ? ((perpLast - perpPrev) / perpPrev) * 100 : undefined;

  const base = (instrument?.baseCoin ?? baseFromPair(pair)).toUpperCase();
  return {
    symbol: base,
    pair,
    name: instrument?.fullName?.trim() || base,
    turnover: num(perpTicker?.turnover24h) ?? 0,
    spot: tickerToQuote(spotTicker, {
      rank: biasRankFromBars(spotBars, { changePct: spotChange }),
    }),
    perp: tickerToQuote(perpTicker, {
      last: perpLast ?? undefined,
      changePct: perpChange,
      rank: biasRankFromBars(perpBars, { changePct: perpChange }),
      fundingRate: num(perpTicker?.fundingRate),
    }),
  };
}

export async function searchBitgetCrypto(query: string, limit = 8): Promise<BitgetSearchHit[]> {
  const parsed = normalizeCryptoSymbol(query);
  const needle = (parsed.error ? query.trim().toUpperCase().replace(/USDT$/, '') : parsed.symbol).replace(/USDT$/, '');
  if (needle.length < 1) return [];
  const instruments = await loadCryptoInstruments();
  return instruments
    .map((row) => {
      const symbol = (row.baseCoin ?? baseFromPair(row.symbol ?? '')).toUpperCase();
      const pair = (row.symbol ?? pairFor(symbol)).toUpperCase();
      const name = row.fullName?.trim() || symbol;
      return { symbol, pair, name };
    })
    .filter((row) => row.symbol.includes(needle) || row.name.toUpperCase().includes(needle) || row.pair.includes(needle))
    .sort((a, b) => {
      const aExact = a.symbol === needle ? 0 : a.symbol.startsWith(needle) ? 1 : 2;
      const bExact = b.symbol === needle ? 0 : b.symbol.startsWith(needle) ? 1 : 2;
      if (aExact !== bExact) return aExact - bExact;
      return a.symbol.localeCompare(b.symbol);
    })
    .slice(0, limit);
}

export function bitgetName(desk: BitgetCryptoDesk | null, symbol: string): BitgetNameTape | null {
  const key = symbol.trim().toUpperCase();
  return desk?.names.find((row) => row.symbol === key || row.pair === pairFor(key)) ?? null;
}
