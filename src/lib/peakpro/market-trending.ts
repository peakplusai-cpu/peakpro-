import { previousCalendarDates, taipeiCalendarDate } from '@/lib/peakpro/session-clock';
import type { TrendingItem, TrendingPayload } from '@/lib/peakpro/types';
import { fetchYahooQuotes, isTaiwanSymbol } from '@/lib/peakpro/yahoo';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const SKIP = /^(?:\^|BRK\.B$)/i;
const TARGET = 15;

type SeedWhy = 'volume' | 'gainer' | 'trending';

type OfficialPrint = {
  symbol: string;
  name: string;
  last: number;
  changePct: number;
  volume: number;
  why: SeedWhy;
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

async function fetchJson(url: string, referer?: string, timeoutMs = 12_000): Promise<unknown> {
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
    const json = await fetchJson(candidate, undefined, 8_000);
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

function parseTwseStockTable(fields: string[], data: unknown[][]): OfficialPrint[] {
  const codeIdx = fieldIndex(fields, ['證券代號', '代號']);
  const nameIdx = fieldIndex(fields, ['證券名稱', '名稱']);
  const volIdx = fieldIndex(fields, ['成交股數']);
  const closeIdx = fieldIndex(fields, ['收盤價']);
  const signIdx = fieldIndex(fields, ['漲跌(+/-)', '漲跌']);
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
    rows.push({
      symbol: `${code}.TW`,
      name: String(line[nameIdx] ?? code),
      last,
      changePct: change == null ? 0 : changePctFromClose(last, change),
      volume,
      why: 'volume',
    });
  }
  return rows;
}

async function twseMiIndexAll(): Promise<OfficialPrint[]> {
  for (const iso of previousCalendarDates(taipeiCalendarDate(), 5)) {
    const json = (await fetchJson(
      `https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=${iso.replace(/-/g, '')}&type=ALLBUT0999&response=json`,
      'https://www.twse.com.tw/',
      15_000,
    )) as {
      stat?: string;
      tables?: Array<{ title?: string; fields?: string[]; data?: unknown[][] }>;
    } | null;
    if (!json || (json.stat && json.stat !== 'OK') || !Array.isArray(json.tables)) continue;
    for (const table of json.tables) {
      const fields = table.fields ?? [];
      if (!fields.some((field) => field.includes('證券代號'))) continue;
      const rows = parseTwseStockTable(fields, table.data ?? []);
      if (rows.length >= 50) return rows;
    }
  }
  return [];
}

async function twseStockDayAll(): Promise<OfficialPrint[]> {
  const json = await fetchJson('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL');
  if (!Array.isArray(json)) return [];
  const rows: OfficialPrint[] = [];
  for (const row of json) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as Record<string, unknown>;
    const code = listedCode(rec.Code);
    if (!code) continue;
    const last = parseNum(rec.ClosingPrice);
    const change = parseNum(rec.Change);
    const volume = parseNum(rec.TradeVolume);
    if (last == null || last <= 0 || volume == null || volume <= 0) continue;
    rows.push({
      symbol: `${code}.TW`,
      name: String(rec.Name ?? code),
      last,
      changePct: change == null ? 0 : changePctFromClose(last, change),
      volume,
      why: 'volume',
    });
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
    const code = listedCode(rec.SecuritiesCompanyCode);
    if (!code) continue;
    const last = parseNum(rec.Close);
    const change = parseNum(rec.Change);
    const volume = parseNum(rec.TradingShares);
    if (last == null || last <= 0 || volume == null || volume <= 0) continue;
    rows.push({
      symbol: `${code}.TWO`,
      name: String(rec.CompanyName ?? code),
      last,
      changePct: change == null ? 0 : changePctFromClose(last, change),
      volume,
      why: 'volume',
    });
  }
  return rows;
}

async function twseVolumeLeaders(): Promise<OfficialPrint[]> {
  const dates = previousCalendarDates(taipeiCalendarDate(), 4);
  for (const iso of dates) {
    const json = (await fetchJson(
      `https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX20?date=${iso.replace(/-/g, '')}&response=json`,
      'https://www.twse.com.tw/',
      8_000,
    )) as { stat?: string; fields?: string[]; data?: unknown[][] } | null;
    if (!json || (json.stat && json.stat !== 'OK') || !Array.isArray(json.data)) continue;
    const rows = parseTwseStockTable(json.fields ?? [], json.data);
    if (rows.length > 0) return rows;
  }
  return [];
}

function pickTaiwanPrints(boards: OfficialPrint[][]): OfficialPrint[] {
  const all: OfficialPrint[] = [];
  const seen = new Set<string>();
  for (const board of boards) {
    for (const row of board) {
      if (seen.has(row.symbol)) continue;
      seen.add(row.symbol);
      all.push(row);
    }
  }
  const byVol = [...all].sort((a, b) => b.volume - a.volume).slice(0, 12);
  const liquid = all.filter((row) => row.volume >= 1_000_000);
  const byMove = [...liquid]
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 12)
    .map((row) => ({ ...row, why: 'gainer' as const }));
  const picked: OfficialPrint[] = [];
  const pickedSeen = new Set<string>();
  for (const row of [...byVol, ...byMove]) {
    if (pickedSeen.has(row.symbol)) continue;
    pickedSeen.add(row.symbol);
    picked.push(row);
  }
  return picked.slice(0, 20);
}

function normalize(symbol: string, market: 'taiwan' | 'us') {
  if (market === 'taiwan') {
    if (/^\d{4}$/.test(symbol)) return `${symbol}.TW`;
    if (/\.(TW|TWO)$/i.test(symbol)) return symbol.replace(/\.tw$/i, '.TW').replace(/\.two$/i, '.TWO');
    return '';
  }
  if (isTaiwanSymbol(symbol) || /^\d{4}$/.test(symbol)) return '';
  if (SKIP.test(symbol) || symbol.includes('=')) return '';
  return symbol;
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

function itemsFromPrints(prints: OfficialPrint[], quotes: QuoteRow[]): TrendingItem[] {
  const quoteBy = new Map(quotes.map((row) => [row.symbol.toUpperCase(), row]));
  return rerankTrending(
    prints
      .map((print) => {
        const quote = quoteBy.get(print.symbol.toUpperCase());
        const copy = whyCopy(print.why);
        return {
          rank: 0,
          symbol: print.symbol,
          name: print.name || quote?.shortName || quote?.longName || print.symbol,
          assetClass: 'equity' as const,
          market: 'taiwan' as const,
          changePct: quote?.regularMarketChangePercent ?? print.changePct,
          last: quote?.regularMarketPrice ?? print.last,
          currency: quote?.currency ?? 'TWD',
          catalyst: copy.catalyst,
          catalystZh: copy.catalystZh,
        };
      })
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)),
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
    if (!quote?.regularMarketPrice && quote?.regularMarketChangePercent == null) continue;
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

async function fetchUsBoard(): Promise<TrendingItem[]> {
  const actives = await yahooScreener('most_actives', 'US');
  const gainers = actives.length >= 12 ? [] : await yahooScreener('day_gainers', 'US');
  const trend = actives.length + gainers.length >= 12 ? [] : await yahooTrending('US');
  const seeds: Seed[] = [
    ...actives.map((symbol) => ({ symbol, why: 'volume' as const })),
    ...gainers.map((symbol) => ({ symbol, why: 'gainer' as const })),
    ...trend.map((symbol) => ({ symbol, why: 'trending' as const })),
  ];
  const symbols = [...new Set(seeds.map((row) => normalize(row.symbol, 'us')).filter(Boolean))];
  const quotes = await fetchYahooQuotes(symbols, 40);
  return rankSide(seeds, quotes, 'us');
}

async function fetchTaiwanBoard(): Promise<TrendingItem[]> {
  const [miIndex, otc, volume20] = await Promise.all([twseMiIndexAll(), tpexQuotes(), twseVolumeLeaders()]);
  const listed = miIndex.length >= 50 ? miIndex : await twseStockDayAll();
  let prints = pickTaiwanPrints([listed, otc, volume20]);

  if (prints.length < 10) {
    const [twTrend, twActives] = await Promise.all([yahooTrending('TW'), yahooScreener('most_actives', 'TW')]);
    const extra = [...twTrend, ...twActives]
      .map((symbol) => normalize(symbol, 'taiwan'))
      .filter(Boolean)
      .filter((symbol) => !prints.some((row) => row.symbol === symbol))
      .slice(0, 12)
      .map((symbol) => ({
        symbol,
        name: symbol,
        last: 0,
        changePct: 0,
        volume: 0,
        why: 'trending' as const,
      }));
    prints = [...prints, ...extra].slice(0, 20);
  }

  const quotes = await fetchYahooQuotes(
    prints.map((row) => row.symbol),
    20,
  );
  const withTape = prints.filter((row) => row.last > 0 || row.changePct !== 0);
  if (withTape.length >= 8) return itemsFromPrints(withTape, quotes);
  return itemsFromPrints(prints, quotes);
}

export async function fetchMarketWideTrending(): Promise<TrendingPayload> {
  const [taiwan, us] = await Promise.all([fetchTaiwanBoard(), fetchUsBoard()]);
  return {
    taiwan,
    us,
    items: [...taiwan, ...us],
  };
}
