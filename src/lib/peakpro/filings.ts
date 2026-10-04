import type { FilingBook, FilingTrade, FilingsPayload } from '@/lib/peakpro/types';

const CONGRESS_URLS = [
  'https://cdn.jsdelivr.net/gh/kadoa-org/congress-trading-monitor@main/public/data/trades.json',
  'https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/public/data/trades.json',
];

const SUPERINVESTORS = [
  { cik: '0001067983', name: 'Berkshire Hathaway', nameZh: '波克夏／巴菲特', principal: 'Warren Buffett' },
  { cik: '0001336528', name: 'Pershing Square', nameZh: 'Pershing Square／Ackman', principal: 'Bill Ackman' },
  { cik: '0001649339', name: 'Scion Asset Management', nameZh: 'Scion／Burry', principal: 'Michael Burry' },
  { cik: '0001350694', name: 'Bridgewater Associates', nameZh: '橋水／達利歐', principal: 'Ray Dalio' },
  { cik: '0000921669', name: 'Icahn Enterprises', nameZh: '伊坎', principal: 'Carl Icahn' },
] as const;

const SEC_HEADERS = {
  'User-Agent': 'PeakProPlus/1.0 (https://peakproai.com; desk@peakproai.com)',
  Accept: 'application/json, application/xml, text/xml, */*',
};

const TRADE_LIMIT = 80;
const HOLDING_LIMIT = 10;
const LOOKBACK_DAYS = 180;

function parseLooseDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const raw = value.trim();
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
  const stamp = Date.parse(raw);
  if (Number.isNaN(stamp)) return null;
  return new Date(stamp).toISOString().slice(0, 10);
}

function cleanTicker(value: unknown): string {
  const raw = String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z.]/g, '')
    .replace(/^\.+|\.+$/g, '');
  if (!raw || raw === 'N/A' || raw === 'NA') return '';
  if (!/^[A-Z]{1,5}(?:\.[A-Z]{1,2})?$/.test(raw)) return '';
  return raw;
}

function sideOf(value: unknown): FilingTrade['side'] {
  const raw = String(value ?? '').toLowerCase();
  if (/(sale|sell)/.test(raw)) return 'sell';
  if (/(purchase|buy)/.test(raw)) return 'buy';
  return 'other';
}

function chamberOf(value: unknown): FilingTrade['chamber'] {
  const raw = String(value ?? '').toLowerCase();
  if (raw === 'senate') return 'senate';
  if (raw === 'house') return 'house';
  return 'exec';
}

function text(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: { ...SEC_HEADERS, ...init?.headers },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.warn('[peakpro/filings] fetch failed', url, error);
    return null;
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { cache: 'no-store', headers: SEC_HEADERS });
    if (!response.ok) return null;
    return await response.text();
  } catch (error) {
    console.warn('[peakpro/filings] text failed', url, error);
    return null;
  }
}

function cutoffDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - LOOKBACK_DAYS);
  return date.toISOString().slice(0, 10);
}

function normalizeKadoa(record: Record<string, unknown>): FilingTrade | null {
  const ticker = cleanTicker(record.ticker);
  if (!ticker) return null;
  const person = text(record, 'filer_name', 'name');
  if (!person) return null;
  const disclosed = parseLooseDate(record.filing_date ?? record.disclosure_date);
  const traded = parseLooseDate(record.transaction_date);
  return {
    person,
    chamber: chamberOf(record.chamber),
    ticker,
    issuer: text(record, 'asset_name', 'asset_description') || ticker,
    side: sideOf(record.transaction_type ?? record.type),
    amount: text(record, 'amount_range_label', 'amount') || '—',
    traded,
    disclosed,
    href: text(record, 'doc_url', 'ptr_link') || null,
  };
}

async function fetchCongressJson(): Promise<unknown> {
  for (const url of CONGRESS_URLS) {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          Accept: 'application/json,text/plain,*/*',
          'User-Agent': 'PeakProPlus/1.0 (https://peakproai.com)',
        },
      });
      if (!response.ok) {
        console.warn('[peakpro/filings] congress http', response.status, url);
        continue;
      }
      return await response.json();
    } catch (error) {
      console.warn('[peakpro/filings] congress fetch failed', url, error);
    }
  }
  return null;
}

async function harvestCongress(): Promise<FilingTrade[]> {
  const raw = await fetchCongressJson();
  if (!Array.isArray(raw)) return [];
  const cutoff = cutoffDate();
  const seen = new Set<string>();
  const rows: FilingTrade[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const trade = normalizeKadoa(item as Record<string, unknown>);
    if (!trade) continue;
    const stamp = trade.disclosed ?? trade.traded;
    if (stamp && stamp < cutoff) continue;
    const key = `${trade.person}|${trade.ticker}|${trade.traded}|${trade.side}|${trade.amount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(trade);
  }
  return rows
    .sort((a, b) => (b.disclosed ?? b.traded ?? '').localeCompare(a.disclosed ?? a.traded ?? ''))
    .slice(0, TRADE_LIMIT);
}

function xmlTag(block: string, name: string) {
  const match = block.match(new RegExp(`<(?:[\\w.-]+:)?${name}[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?${name}>`, 'i'));
  return (match?.[1] ?? '').replace(/<[^>]+>/g, '').trim();
}

function parseHoldings(xml: string): FilingBook['holdings'] {
  const blocks = xml.split(/<(?:[\w.-]+:)?infoTable[\s>]/i).slice(1);
  const holdings = blocks
    .map((block) => {
      const issuer = xmlTag(block, 'nameOfIssuer');
      const value = Number(xmlTag(block, 'value').replace(/,/g, ''));
      const shares = Number(xmlTag(block, 'sshPrnamt').replace(/,/g, ''));
      if (!issuer || !Number.isFinite(value)) return null;
      return {
        issuer,
        ticker: cleanTicker(xmlTag(block, 'ticker')),
        valueUsd000: value,
        shares: Number.isFinite(shares) ? shares : null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.valueUsd000 - a.valueUsd000)
    .slice(0, HOLDING_LIMIT);

  const max = Math.max(0, ...holdings.map((row) => row.valueUsd000));
  const factor = max > 10_000_000 ? 1 : 1000;
  return holdings.map((row) => ({ ...row, valueUsd000: row.valueUsd000 * factor }));
}

function pickInfoTable(files: Array<{ name?: string }>) {
  const names = files.map((file) => file.name ?? '').filter(Boolean);
  return (
    names.find((name) => /info.*table|infotable|form13f/i.test(name)) ??
    names.find((name) => /\.xml$/i.test(name) && !/primary|index|header/i.test(name)) ??
    names.find((name) => /\.xml$/i.test(name))
  );
}

async function harvestOneBook(input: (typeof SUPERINVESTORS)[number]): Promise<FilingBook | null> {
  const submissions = await fetchJson<{
    filings?: {
      recent?: {
        form?: string[];
        accessionNumber?: string[];
        filingDate?: string[];
        reportDate?: string[];
      };
    };
  }>(`https://data.sec.gov/submissions/CIK${input.cik}.json`);
  const recent = submissions?.filings?.recent;
  const forms = recent?.form ?? [];
  const index = forms.findIndex((form) => form === '13F-HR' || form === '13F-HR/A');
  if (index < 0) return null;
  const accession = String(recent?.accessionNumber?.[index] ?? '').replace(/-/g, '');
  const cikNum = String(Number(input.cik));
  if (!accession) return null;
  const directory = await fetchJson<{ directory?: { item?: Array<{ name?: string }> } }>(
    `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accession}/index.json`,
  );
  const files = directory?.directory?.item ?? [];
  const table = pickInfoTable(files);
  if (!table) return null;
  const xml = await fetchText(`https://www.sec.gov/Archives/edgar/data/${cikNum}/${accession}/${table}`);
  if (!xml) return null;
  const holdings = parseHoldings(xml);
  if (holdings.length === 0) return null;
  return {
    name: input.name,
    nameZh: input.nameZh,
    principal: input.principal,
    cik: input.cik,
    filed: recent?.reportDate?.[index] || recent?.filingDate?.[index] || accession,
    href: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${input.cik}&type=13F-HR`,
    holdings,
  };
}

async function harvestBooks(): Promise<FilingBook[]> {
  const rows = await Promise.all(SUPERINVESTORS.map((row) => harvestOneBook(row).catch(() => null)));
  return rows.filter((row): row is FilingBook => Boolean(row));
}

export async function harvestPublicFilings(): Promise<FilingsPayload> {
  const [trades, books] = await Promise.all([harvestCongress(), harvestBooks()]);
  return {
    trades,
    books,
    asOf: new Date().toISOString(),
  };
}

export function formatAdvisorFilings(payload: FilingsPayload | null | undefined) {
  if (!payload) return 'PUBLIC_FILINGS: none this scrape';
  const trades = payload.trades.slice(0, 10).map((row) => {
    const when = row.disclosed ?? row.traded ?? 'n/a';
    return `${row.person} (${row.chamber}) ${row.side} ${row.ticker || row.issuer} ${row.amount} disclosed=${when}`;
  });
  const books = payload.books.map((book) => {
    const names = book.holdings
      .slice(0, 5)
      .map((row) => row.ticker || row.issuer)
      .join(', ');
    return `${book.principal}: ${names || 'empty'}`;
  });
  return [
    'PUBLIC_FILINGS delayed U.S. STOCK Act and 13F — not live copies, not an order.',
    trades.length ? trades.join('\n') : '(no politician trades)',
    books.length ? books.join('\n') : '(no 13F books)',
  ].join('\n');
}
