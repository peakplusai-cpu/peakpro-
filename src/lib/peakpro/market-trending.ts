import { previousCalendarDates, taipeiCalendarDate } from '@/lib/peakpro/session-clock';
import { biasFromChanges } from '@/lib/peakpro/sentiment';
import type { SentimentGauge, TrendingItem, TrendingPayload } from '@/lib/peakpro/types';
import { fetchYahooQuotes, isTaiwanSymbol } from '@/lib/peakpro/yahoo';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const SKIP = /^(?:\^|BRK\.B$)/i;
const TARGET = 15;
const US_LIQUID = [
  'AAPL',
  'NVDA',
  'MSFT',
  'AMZN',
  'GOOGL',
  'META',
  'TSLA',
  'AVGO',
  'TSM',
  'AMD',
  'NFLX',
  'JPM',
  'ORCL',
  'WMT',
  'XOM',
  'COST',
  'PLTR',
  'BAC',
  'INTC',
  'QCOM',
];

type SeedWhy = 'volume' | 'gainer' | 'trending';

export type OfficialPrint = {
  symbol: string;
  name: string;
  last: number;
  changePct: number;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
  tradeDate?: string;
  why: SeedWhy;
};

export type TaiwanMarketHarvest = {
  leaders: OfficialPrint[];
  universe: OfficialPrint[];
  breadth: SentimentGauge;
};

type Seed = {
  symbol: string;
  why: SeedWhy;
};

type QuoteRow = {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  currency?: string;
};

async function fetchJson(url: string, referer?: string, timeoutMs = 8_000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json,text/plain,*/*',
        'User-Agent': UA,
        ...(referer ? { Referer: referer } : {}),
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn('[peakpro/trending] fetch failed', url, error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchYahooJson(url: string): Promise<unknown> {
  const urls = url.includes('query1.finance.yahoo.com')
    ? [url, url.replace('query1.finance.yahoo.com', 'query2.finance.yahoo.com')]
    : [url];
  for (const candidate of urls) {
    const json = await fetchJson(candidate, undefined, 6_000);
    if (json) return json;
  }
  return null;
}

function asSymbol(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function listedCode(value: unknown) {
  const raw = String(value ?? '').trim();
  return /^\d{4}$/.test(raw) ? raw : '';
}

function recordValue(rec: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (rec[key] != null && rec[key] !== '') return rec[key];
  }
  const lower = new Map(Object.entries(rec).map(([key, value]) => [key.toLowerCase(), value]));
  for (const key of keys) {
    const hit = lower.get(key.toLowerCase());
    if (hit != null && hit !== '') return hit;
  }
  return undefined;
}

function parseNum(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/,/g, '').replace(/[X+\s]/gi, '').replace(/[—–−]/g, '-').trim();
  if (!cleaned || cleaned === '--' || cleaned === '---') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function changePctFromClose(close: number, change: number) {
  const prev = close - change;
  if (prev <= 0) return 0;
  return (change / prev) * 100;
}

function signedChange(signCell: unknown, diffCell: unknown): number | null {
  const diff = parseNum(diffCell);
  if (diff == null) return null;
  const sign = String(signCell ?? '');
  if (sign.includes('-') && !sign.includes('+')) return -Math.abs(diff);
  if (sign.includes('+')) return Math.abs(diff);
  return diff;
}

function fieldIndex(fields: string[], needles: string[]) {
  return fields.findIndex((field) => needles.some((needle) => field.includes(needle)));
}

function taiwanSymbol(code: string, otc: boolean) {
  return otc ? `${code}.TWO` : `${code}.TW`;
}

function rocYmdToIso(value: unknown): string | undefined {
  const raw = String(value ?? '').replace(/\D/g, '');
  if (raw.length === 8 && raw.startsWith('20')) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  if (raw.length === 7) {
    const year = Number(raw.slice(0, 3)) + 1911;
    if (!Number.isFinite(year)) return undefined;
    return `${year}-${raw.slice(3, 5)}-${raw.slice(5, 7)}`;
  }
  return undefined;
}

function asPrint(
  code: string,
  name: unknown,
  last: number,
  change: number | null,
  volume: number,
  otc: boolean,
  extras?: { open?: number | null; high?: number | null; low?: number | null; tradeDate?: string; why?: SeedWhy },
): OfficialPrint {
  return {
    symbol: taiwanSymbol(code, otc),
    name: String(name ?? '').trim() || code,
    last,
    changePct: change == null ? 0 : changePctFromClose(last, change),
    volume,
    open: extras?.open ?? undefined,
    high: extras?.high ?? undefined,
    low: extras?.low ?? undefined,
    tradeDate: extras?.tradeDate,
    why: extras?.why ?? 'volume',
  };
}

async function yahooTrending(region: 'US' | 'TW'): Promise<string[]> {
  const json = (await fetchYahooJson(`https://query1.finance.yahoo.com/v1/finance/trending/${region}?count=24`)) as {
    finance?: { result?: Array<{ quotes?: Array<{ symbol?: string }> }> };
  } | null;
  return (json?.finance?.result?.[0]?.quotes ?? []).map((row) => asSymbol(row.symbol)).filter(Boolean);
}

async function yahooScreener(scrId: string, region: 'US' | 'TW' = 'US'): Promise<string[]> {
  const lang = region === 'TW' ? 'zh-TW' : 'en-US';
  const json = (await fetchYahooJson(
    `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=${lang}&region=${region}&scrIds=${encodeURIComponent(scrId)}&count=25`,
  )) as {
    finance?: { result?: Array<{ quotes?: Array<{ symbol?: string }> }> };
  } | null;
  return (json?.finance?.result?.[0]?.quotes ?? []).map((row) => asSymbol(row.symbol)).filter(Boolean);
}

function parseTwseStockTable(fields: string[], data: unknown[][], tradeDate?: string): OfficialPrint[] {
  const codeIdx = fieldIndex(fields, ['證券代號']);
  const nameIdx = fieldIndex(fields, ['證券名稱']);
  const volIdx = fieldIndex(fields, ['成交股數']);
  const closeIdx = fieldIndex(fields, ['收盤價']);
  const openIdx = fieldIndex(fields, ['開盤價']);
  const highIdx = fieldIndex(fields, ['最高價']);
  const lowIdx = fieldIndex(fields, ['最低價']);
  const signIdx = fieldIndex(fields, ['漲跌(+/-)']);
  const diffIdx = fieldIndex(fields, ['漲跌價差']);
  if (codeIdx < 0 || volIdx < 0 || closeIdx < 0) return [];

  const rows: OfficialPrint[] = [];
  for (const line of data) {
    if (!Array.isArray(line)) continue;
    const code = listedCode(line[codeIdx]);
    if (!code) continue;
    const last = parseNum(line[closeIdx]);
    const volume = parseNum(line[volIdx]);
    const change = signedChange(signIdx >= 0 ? line[signIdx] : '', diffIdx >= 0 ? line[diffIdx] : null);
    if (last == null || last <= 0 || volume == null || volume <= 0) continue;
    rows.push(
      asPrint(code, nameIdx >= 0 ? line[nameIdx] : code, last, change, volume, false, {
        open: openIdx >= 0 ? parseNum(line[openIdx]) : null,
        high: highIdx >= 0 ? parseNum(line[highIdx]) : null,
        low: lowIdx >= 0 ? parseNum(line[lowIdx]) : null,
        tradeDate,
      }),
    );
  }
  return rows;
}

async function twseStockDayAll(): Promise<OfficialPrint[]> {
  const json = await fetchJson('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL');
  if (!Array.isArray(json)) return [];
  const rows: OfficialPrint[] = [];
  for (const row of json) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as Record<string, unknown>;
    const code = listedCode(recordValue(rec, ['Code', '證券代號']));
    if (!code) continue;
    const last = parseNum(recordValue(rec, ['ClosingPrice', '收盤價']));
    const change = parseNum(recordValue(rec, ['Change', '漲跌價差']));
    const volume = parseNum(recordValue(rec, ['TradeVolume', '成交股數']));
    if (last == null || last <= 0 || volume == null || volume <= 0) continue;
    rows.push(
      asPrint(code, recordValue(rec, ['Name', '證券名稱']), last, change, volume, false, {
        open: parseNum(recordValue(rec, ['OpeningPrice', '開盤價'])),
        high: parseNum(recordValue(rec, ['HighestPrice', '最高價'])),
        low: parseNum(recordValue(rec, ['LowestPrice', '最低價'])),
        tradeDate: rocYmdToIso(recordValue(rec, ['Date', '日期'])),
      }),
    );
  }
  return rows;
}

async function tpexQuotes(): Promise<OfficialPrint[]> {
  const json = await fetchJson('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes', 'https://www.tpex.org.tw/');
  if (!Array.isArray(json)) return [];
  const rows: OfficialPrint[] = [];
  for (const row of json) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as Record<string, unknown>;
    const code = listedCode(recordValue(rec, ['SecuritiesCompanyCode', 'Code', '證券代號']));
    if (!code) continue;
    const last = parseNum(recordValue(rec, ['Close', 'ClosingPrice', '收盤價']));
    const change = parseNum(recordValue(rec, ['Change', '漲跌價差']));
    const volume = parseNum(recordValue(rec, ['TradingShares', 'TradeVolume', '成交股數']));
    if (last == null || last <= 0 || volume == null || volume <= 0) continue;
    rows.push(
      asPrint(code, recordValue(rec, ['CompanyName', 'Name', '證券名稱']), last, change, volume, true, {
        open: parseNum(recordValue(rec, ['Open', 'OpeningPrice', '開盤價'])),
        high: parseNum(recordValue(rec, ['High', 'HighestPrice', '最高價'])),
        low: parseNum(recordValue(rec, ['Low', 'LowestPrice', '最低價'])),
        tradeDate: rocYmdToIso(recordValue(rec, ['Date', '日期'])),
      }),
    );
  }
  return rows;
}

async function twseMiIndexOnce(): Promise<OfficialPrint[]> {
  const iso = previousCalendarDates(taipeiCalendarDate(), 1)[0];
  if (!iso) return [];
  const json = (await fetchJson(
    `https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=${iso.replace(/-/g, '')}&type=ALLBUT0999&response=json`,
    'https://www.twse.com.tw/',
    6_000,
  )) as {
    stat?: string;
    tables?: Array<{ title?: string; fields?: string[]; data?: unknown[][] }>;
  } | null;
  if (!json || (json.stat && json.stat !== 'OK') || !Array.isArray(json.tables)) return [];
  for (const table of json.tables) {
    const fields = table.fields ?? [];
    if (!fields.some((field) => field.includes('證券代號'))) continue;
    const rows = parseTwseStockTable(fields, table.data ?? [], rocYmdToIso((json as { date?: string }).date) ?? iso);
    if (rows.length >= 50) return rows;
  }
  return [];
}

function pickTaiwanPrints(boards: OfficialPrint[][]): OfficialPrint[] {
  const all: OfficialPrint[] = [];
  const seen = new Set<string>();
  for (const board of boards) {
    for (const row of board) {
      if (row.last <= 0 || seen.has(row.symbol)) continue;
      seen.add(row.symbol);
      all.push(row);
    }
  }
  const byVol = [...all].sort((a, b) => b.volume - a.volume).slice(0, 8);
  const liquid = all.filter((row) => row.volume >= 1_000_000);
  const byMove = [...liquid]
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 8)
    .map((row) => ({ ...row, why: 'gainer' as const }));
  const picked: OfficialPrint[] = [];
  const pickedSeen = new Set<string>();
  for (const row of [...byVol, ...byMove]) {
    if (pickedSeen.has(row.symbol)) continue;
    pickedSeen.add(row.symbol);
    picked.push(row);
  }
  return picked.slice(0, TARGET);
}

function normalize(symbol: string, market: 'taiwan' | 'us') {
  const raw = symbol.trim().toUpperCase();
  if (market === 'taiwan') {
    if (/^\d{4}$/.test(raw)) return `${raw}.TW`;
    if (/^\d{4}\.(TW|TWO)$/.test(raw)) return raw;
    return '';
  }
  if (isTaiwanSymbol(raw) || /^\d{4}$/.test(raw) || /^\d{4}\.(TW|TWO)$/.test(raw)) return '';
  if (SKIP.test(raw) || raw.includes('=')) return '';
  return raw;
}

function whyCopy(why: SeedWhy): Pick<TrendingItem, 'catalyst' | 'catalystZh'> {
  if (why === 'volume') {
    return { catalyst: 'Market-wide volume leader', catalystZh: '全市場成交量領先' };
  }
  if (why === 'gainer') {
    return { catalyst: 'Market-wide session mover', catalystZh: '全市場漲跌領先' };
  }
  return { catalyst: 'Market-wide trending tape', catalystZh: '全市場熱門走勢' };
}

export function rerankTrending(items: TrendingItem[]): TrendingItem[] {
  return items.slice(0, TARGET).map((item, index) => ({ ...item, rank: index + 1 }));
}

export function pricedTrending(items: TrendingItem[] | undefined): TrendingItem[] {
  return (items ?? []).filter((item) => typeof item.last === 'number' && item.last > 0);
}

export function itemsFromPrints(prints: OfficialPrint[]): TrendingItem[] {
  return rerankTrending(
    pricedTrending(
      prints.map((print) => {
        const copy = whyCopy(print.why);
        return {
          rank: 0,
          symbol: print.symbol,
          name: print.name || print.symbol,
          assetClass: 'equity' as const,
          market: 'taiwan' as const,
          changePct: print.changePct,
          last: print.last,
          currency: 'TWD',
          catalyst: copy.catalyst,
          catalystZh: copy.catalystZh,
        };
      }),
    ),
  );
}

function rankSide(seeds: Seed[], quotes: QuoteRow[], market: 'taiwan' | 'us'): TrendingItem[] {
  const quoteBy = new Map(quotes.map((row) => [row.symbol.toUpperCase(), row]));
  const seen = new Set<string>();
  const rows: TrendingItem[] = [];
  for (const seed of seeds) {
    const symbol = normalize(seed.symbol, market);
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    const quote = quoteBy.get(symbol);
    if (!quote?.regularMarketPrice || quote.regularMarketPrice <= 0) continue;
    const copy = whyCopy(seed.why);
    rows.push({
      rank: 0,
      symbol,
      name: quote.shortName ?? quote.longName ?? symbol,
      assetClass: 'equity',
      market,
      changePct: quote.regularMarketChangePercent ?? 0,
      last: quote.regularMarketPrice,
      currency: quote.currency ?? (market === 'taiwan' ? 'TWD' : 'USD'),
      catalyst: copy.catalyst,
      catalystZh: copy.catalystZh,
    });
  }
  return rerankTrending(rows.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)));
}

export async function harvestUsLeaders(): Promise<TrendingItem[]> {
  const actives = await yahooScreener('most_actives', 'US');
  const gainers = actives.length >= 12 ? [] : await yahooScreener('day_gainers', 'US');
  const trend = actives.length + gainers.length >= 12 ? [] : await yahooTrending('US');
  const seeds: Seed[] = [
    ...actives.map((symbol) => ({ symbol, why: 'volume' as const })),
    ...gainers.map((symbol) => ({ symbol, why: 'gainer' as const })),
    ...trend.map((symbol) => ({ symbol, why: 'trending' as const })),
    ...US_LIQUID.map((symbol) => ({ symbol, why: 'volume' as const })),
  ];
  const symbols = [...new Set(seeds.map((row) => normalize(row.symbol, 'us')).filter(Boolean))];
  const quotes = await fetchYahooQuotes(symbols, 40);
  return rankSide(seeds, quotes, 'us');
}

export async function harvestTaiwanMarket(): Promise<TaiwanMarketHarvest> {
  const [dayAll, otc] = await Promise.all([twseStockDayAll(), tpexQuotes()]);
  const listed = dayAll.length >= 50 ? dayAll : (await twseMiIndexOnce()).concat(dayAll);
  const universe = [...listed, ...otc].filter((row, index, rows) => rows.findIndex((item) => item.symbol === row.symbol) === index);
  const leaders = pickTaiwanPrints([listed, otc]);
  console.warn('[peakpro/trending] taiwan sources', {
    dayAll: dayAll.length,
    otc: otc.length,
    listed: listed.length,
    universe: universe.length,
    picked: leaders.length,
  });
  return {
    leaders,
    universe,
    breadth: biasFromChanges(universe.map((row) => row.changePct)),
  };
}

export async function fetchMarketWideTrending(): Promise<TrendingPayload> {
  const [taiwanHarvest, us] = await Promise.all([harvestTaiwanMarket(), harvestUsLeaders()]);
  const taiwan = itemsFromPrints(taiwanHarvest.leaders);
  return {
    taiwan,
    us,
    items: [...taiwan, ...us],
  };
}
