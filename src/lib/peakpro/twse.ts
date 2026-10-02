import { previousCalendarDates, taipeiCalendarDate, toRocSlashDate } from '@/lib/peakpro/session-clock';

export type InstitutionalRow = {
  trade_date: string;
  symbol: string;
  name: string;
  foreign_net: number;
  trust_net: number;
  dealer_net: number;
  total_net: number;
  source: 'twse' | 'tpex';
};

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function parseTwNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace(/,/g, '').replace(/[—–−]/g, '-').replace(/--/g, '').trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function fieldIndex(fields: string[], needles: string[], excludes: string[] = []) {
  return fields.findIndex((field) => {
    if (excludes.some((token) => field.includes(token))) return false;
    return needles.some((needle) => field.includes(needle));
  });
}

function listedSymbol(code: string, source: 'twse' | 'tpex') {
  const raw = code.trim();
  if (!/^\d{4}$/.test(raw)) return null;
  return source === 'tpex' ? `${raw}.TWO` : `${raw}.TW`;
}

async function fetchJson(url: string, referer: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json,text/plain,*/*',
        'User-Agent': UA,
        Referer: referer,
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn('[peakpro/twse] fetch failed', url, error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function mapBoard(
  fields: string[],
  data: unknown[][],
  tradeDate: string,
  source: 'twse' | 'tpex',
): InstitutionalRow[] {
  const codeIdx = fieldIndex(fields, ['證券代號', '代號']);
  const nameIdx = fieldIndex(fields, ['證券名稱', '名稱']);
  const foreignIdx = fieldIndex(fields, ['外陸資買賣超', '外資及陸資買賣超', '外資及陸資(不含外資自營商)-買賣超']);
  const trustIdx = fieldIndex(fields, ['投信買賣超', '投信-買賣超']);
  const dealerIdx = fieldIndex(fields, ['自營商買賣超'], ['自行', '避險']);
  const totalIdx = fieldIndex(fields, ['三大法人買賣超']);
  if (codeIdx < 0) return [];

  const rows: InstitutionalRow[] = [];
  for (const line of data) {
    if (!Array.isArray(line)) continue;
    const symbol = listedSymbol(String(line[codeIdx] ?? ''), source);
    if (!symbol) continue;
    const foreign = foreignIdx >= 0 ? parseTwNumber(line[foreignIdx]) : 0;
    const trust = trustIdx >= 0 ? parseTwNumber(line[trustIdx]) : 0;
    const dealer = dealerIdx >= 0 ? parseTwNumber(line[dealerIdx]) : 0;
    const total = totalIdx >= 0 ? parseTwNumber(line[totalIdx]) : foreign + trust + dealer;
    rows.push({
      trade_date: tradeDate,
      symbol,
      name: nameIdx >= 0 ? String(line[nameIdx] ?? '').trim() : symbol,
      foreign_net: foreign,
      trust_net: trust,
      dealer_net: dealer,
      total_net: total,
      source,
    });
  }
  return rows;
}

async function fetchTwseDay(iso: string): Promise<InstitutionalRow[] | null> {
  const ymd = iso.replace(/-/g, '');
  const json = (await fetchJson(
    `https://www.twse.com.tw/rwd/zh/fund/T86?date=${ymd}&selectType=ALLBUT0999&response=json`,
    'https://www.twse.com.tw/',
  )) as { stat?: string; fields?: string[]; data?: unknown[][] } | null;
  if (!json) return null;
  if (json.stat && json.stat !== 'OK') return [];
  if (!Array.isArray(json.fields) || !Array.isArray(json.data)) return [];
  return mapBoard(json.fields, json.data, iso, 'twse');
}

async function fetchTpexDay(iso: string): Promise<InstitutionalRow[] | null> {
  const roc = toRocSlashDate(iso);
  if (!roc) return [];
  const json = (await fetchJson(
    `https://www.tpex.org.tw/web/stock/3insti/daily_trade/3itrade_hedge_result.php?l=zh-tw&se=EW&t=D&d=${encodeURIComponent(roc)}`,
    'https://www.tpex.org.tw/',
  )) as {
    tables?: Array<{ fields?: string[]; data?: unknown[][] }>;
    fields?: string[];
    data?: unknown[][];
    aaData?: unknown[][];
  } | null;
  if (!json) return null;
  const table = json.tables?.find((item) => Array.isArray(item.fields) && Array.isArray(item.data));
  const fields = table?.fields ?? json.fields;
  const data = table?.data ?? json.data ?? json.aaData;
  if (!fields || !data) return [];
  return mapBoard(fields, data, iso, 'tpex');
}

export async function fetchOfficialInstitutional(options?: {
  days?: number;
  includeOtc?: boolean;
}): Promise<InstitutionalRow[]> {
  const days = options?.days ?? 8;
  const includeOtc = options?.includeOtc ?? false;
  const collected: InstitutionalRow[] = [];
  let hits = 0;

  for (const iso of previousCalendarDates(taipeiCalendarDate(), days + 8)) {
    if (hits >= days) break;
    const listed = await fetchTwseDay(iso);
    if (listed === null) continue;
    if (listed.length === 0) continue;
    collected.push(...listed);
    if (includeOtc) {
      const otc = await fetchTpexDay(iso);
      if (otc && otc.length > 0) collected.push(...otc);
    }
    hits += 1;
  }

  return collected;
}
