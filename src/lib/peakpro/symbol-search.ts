import { EQUITY_UNIVERSE } from '@/lib/peakpro/constants';
import { peakproAdmin } from '@/lib/peakpro/db';
import { harvestTaiwanMarket } from '@/lib/peakpro/market-trending';
import { isTaiwanSymbol, normalizeEquityQuery, searchYahooQuotes, type EquityMarket } from '@/lib/peakpro/yahoo';

export type SymbolHit = {
  symbol: string;
  name: string;
};

const NAME_ROW = { asset_class: 'ranking', symbol: 'NAMES', timeframe: 'spot' } as const;
const CJK = /[\u3400-\u9fff]/;
const TICKER_US = /^[A-Z][A-Z0-9.\-]{0,11}$/;
const TICKER_TW = /^\d{4}(\.(TW|TWO))?$/;
const YAHOO_KEEP = /^(EQUITY|ETF)$/i;

function fold(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '').replace(/[（）()．.]/g, '');
}

export function looksLikeEquityTicker(query: string, market: EquityMarket) {
  const raw = query.trim().toUpperCase().replace(/\s+/g, '');
  if (!raw || CJK.test(query)) return false;
  if (market === 'taiwan') return TICKER_TW.test(raw);
  return TICKER_US.test(raw) && !TICKER_TW.test(raw) && !isTaiwanSymbol(raw);
}

export function looksLikeForeignTicker(query: string, market: EquityMarket) {
  if (CJK.test(query)) return false;
  return market === 'taiwan' ? looksLikeEquityTicker(query, 'us') : looksLikeEquityTicker(query, 'taiwan');
}

export function scoreSymbolHit(query: string, hit: SymbolHit) {
  const q = fold(query);
  const symbol = fold(hit.symbol);
  const code = fold(hit.symbol.replace(/\.(TW|TWO)$/i, ''));
  const name = fold(hit.name);
  if (!q) return 0;
  if (symbol === q || code === q || name === q) return 100;
  if (symbol.startsWith(q) || code.startsWith(q) || name.startsWith(q)) return 80;
  if (symbol.includes(q) || code.includes(q) || name.includes(q)) return 55;
  return 0;
}

export function namesDirectoryRow(taiwan: SymbolHit[], us: SymbolHit[]) {
  return {
    ...NAME_ROW,
    payload: {
      name: 'Listed names',
      taiwan,
      us,
    },
  };
}

async function cachedDirectory(market: EquityMarket): Promise<SymbolHit[]> {
  try {
    const admin = peakproAdmin();
    const { data } = await admin
      .from('market_data')
      .select('payload')
      .eq('asset_class', NAME_ROW.asset_class)
      .eq('symbol', NAME_ROW.symbol)
      .eq('timeframe', NAME_ROW.timeframe)
      .maybeSingle();
    const payload = data?.payload as { taiwan?: SymbolHit[]; us?: SymbolHit[] } | undefined;
    const rows = market === 'taiwan' ? payload?.taiwan : payload?.us;
    return Array.isArray(rows) ? rows.filter((row) => row.symbol && row.name) : [];
  } catch {
    return [];
  }
}

async function deskDirectory(market: EquityMarket): Promise<SymbolHit[]> {
  const hits: SymbolHit[] = EQUITY_UNIVERSE.filter((row) =>
    market === 'taiwan' ? isTaiwanSymbol(row.symbol) : !isTaiwanSymbol(row.symbol),
  ).map((row) => ({ symbol: row.symbol, name: row.name }));
  try {
    const admin = peakproAdmin();
    const { data } = await admin.from('market_data').select('symbol, payload').eq('asset_class', 'equity').eq('timeframe', 'daily');
    for (const row of (data ?? []) as Array<{ symbol?: string; payload?: { name?: string } }>) {
      const symbol = String(row.symbol ?? '');
      if (!symbol) continue;
      if (market === 'taiwan' ? !isTaiwanSymbol(symbol) : isTaiwanSymbol(symbol)) continue;
      hits.push({ symbol, name: String(row.payload?.name ?? symbol) });
    }
  } catch {
    /* warehouse optional */
  }
  return hits;
}

async function taiwanOfficialDirectory(): Promise<SymbolHit[]> {
  const cached = await cachedDirectory('taiwan');
  if (cached.length >= 50) return cached;
  try {
    const harvest = await harvestTaiwanMarket();
    return harvest.universe.map((row) => ({ symbol: row.symbol, name: row.name }));
  } catch {
    return cached;
  }
}

function fromYahoo(query: string, market: EquityMarket, quotes: Awaited<ReturnType<typeof searchYahooQuotes>>): SymbolHit[] {
  const hits: SymbolHit[] = [];
  for (const quote of quotes) {
    const symbol = String(quote.symbol ?? '').trim().toUpperCase();
    if (!symbol || !YAHOO_KEEP.test(quote.quoteType ?? 'EQUITY')) continue;
    if (market === 'taiwan') {
      if (!isTaiwanSymbol(symbol)) continue;
    } else if (isTaiwanSymbol(symbol) || TICKER_TW.test(symbol) || symbol.includes('=')) {
      continue;
    }
    hits.push({
      symbol,
      name: String(quote.shortname || quote.longname || symbol),
    });
  }
  if (hits.length > 0 || market === 'taiwan') return hits;
  return quotes
    .filter((quote) => {
      const symbol = String(quote.symbol ?? '').trim().toUpperCase();
      return symbol && !isTaiwanSymbol(symbol) && !symbol.includes('=') && YAHOO_KEEP.test(quote.quoteType ?? 'EQUITY');
    })
    .map((quote) => ({
      symbol: String(quote.symbol).trim().toUpperCase(),
      name: String(quote.shortname || quote.longname || quote.symbol),
    }));
}

export async function searchEquitySymbols(query: string, market: EquityMarket, limit = 8): Promise<SymbolHit[]> {
  const q = query.trim();
  if (!q) return [];
  const [local, yahoo] = await Promise.all([
    market === 'taiwan' ? taiwanOfficialDirectory() : Promise.all([cachedDirectory('us'), deskDirectory('us')]).then((rows) => rows.flat()),
    searchYahooQuotes(q).catch(() => []),
  ]);
  const desk = market === 'taiwan' ? await deskDirectory('taiwan') : [];
  const remote = fromYahoo(q, market, yahoo);
  const remoteSet = new Set(remote.map((hit) => hit.symbol));
  const merged = new Map<string, SymbolHit>();
  for (const hit of [...desk, ...local, ...remote]) {
    if (!merged.has(hit.symbol)) merged.set(hit.symbol, hit);
  }
  return [...merged.values()]
    .map((hit) => ({
      hit,
      score: scoreSymbolHit(q, hit) || (remoteSet.has(hit.symbol) ? 40 : 0),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.hit.symbol.localeCompare(b.hit.symbol))
    .slice(0, limit)
    .map((row) => row.hit);
}

export async function resolveEquityLookup(
  query: string,
  market: EquityMarket,
): Promise<{
  symbol?: string;
  fromTicker?: boolean;
  matches?: SymbolHit[];
  error?: 'empty' | 'invalid' | 'wrong_market' | 'not_found' | 'ambiguous';
}> {
  const raw = query.trim();
  if (!raw) return { error: 'empty' };
  if (looksLikeForeignTicker(raw, market)) return { error: 'wrong_market' };

  if (looksLikeEquityTicker(raw, market)) {
    const parsed = normalizeEquityQuery(raw, market);
    if (parsed.error === 'wrong_market') return { error: 'wrong_market' };
    if (!parsed.error) return { symbol: parsed.symbol, fromTicker: true };
  }

  const matches = await searchEquitySymbols(raw, market);
  if (matches.length === 0) return { error: 'not_found' };
  const best = matches[0];
  const second = matches[1];
  const bestScore = scoreSymbolHit(raw, best);
  const secondScore = second ? scoreSymbolHit(raw, second) : 0;
  if (matches.length === 1 || (bestScore >= 80 && secondScore < 70)) {
    return { symbol: best.symbol, matches };
  }
  return { error: 'ambiguous', matches };
}
