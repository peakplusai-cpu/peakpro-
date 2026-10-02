import { EQUITY_UNIVERSE, USDTWD_YAHOO } from '@/lib/peakpro/constants';
import { displayPx, formatPct } from '@/lib/peakpro/format';
import { fetchYahooQuotes } from '@/lib/peakpro/yahoo';

const PULSE_SYMBOLS = [
  ...EQUITY_UNIVERSE.map((row) => row.symbol),
  '0050.TW',
  'QQQ',
  'BTC-USD',
  'ETH-USD',
  'GC=F',
] as const;

const NAME_ALIASES: Array<{ needle: RegExp; symbols: string[] }> = [
  { needle: /台積電|台積/i, symbols: ['2330.TW', 'TSM'] },
  { needle: /鴻海|富士康/i, symbols: ['2317.TW'] },
  { needle: /聯發科/i, symbols: ['2454.TW'] },
  { needle: /輝達|英偉達|英伟达/i, symbols: ['NVDA'] },
  { needle: /蘋果|苹果/i, symbols: ['AAPL'] },
  { needle: /微軟|微软/i, symbols: ['MSFT'] },
  { needle: /特斯拉/i, symbols: ['TSLA'] },
  { needle: /亞馬遜|亚马逊/i, symbols: ['AMZN'] },
  { needle: /谷歌|Alphabet/i, symbols: ['GOOGL'] },
  { needle: /比特幣|比特币|\bbitcoin\b|\bbtc\b/i, symbols: ['BTC-USD'] },
  { needle: /以太坊|\bethereum\b|\beth\b/i, symbols: ['ETH-USD'] },
  { needle: /黃金|黄金|\bgold\b/i, symbols: ['GC=F'] },
];

export function collectAdvisorSymbols(text: string): string[] {
  const found = new Set<string>(PULSE_SYMBOLS);
  const upper = text.toUpperCase();

  for (const alias of NAME_ALIASES) {
    if (alias.needle.test(text)) alias.symbols.forEach((symbol) => found.add(symbol));
  }

  for (const match of text.match(/\b\d{4}\b/g) ?? []) {
    found.add(`${match}.TW`);
  }
  for (const match of upper.match(/\b\d{4}\.(?:TW|TWO)\b/g) ?? []) {
    found.add(match.replace(/\.TW$/i, '.TW').replace(/\.TWO$/i, '.TWO'));
  }
  for (const equity of EQUITY_UNIVERSE) {
    const token = equity.symbol.replace('.TW', '').replace('.TWO', '');
    if (new RegExp(`\\b${token.replace('.', '\\.')}\\b`, 'i').test(upper)) {
      found.add(equity.symbol);
    }
  }
  for (const match of upper.match(/\$[A-Z]{1,5}\b/g) ?? []) {
    found.add(match.slice(1));
  }

  return [...found].slice(0, 24);
}

async function fetchFearGreed(): Promise<string | null> {
  try {
    const response = await fetch('https://api.alternative.me/fng/?limit=1&format=json', { cache: 'no-store' });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      data?: Array<{ value?: string; value_classification?: string }>;
    };
    const row = json.data?.[0];
    if (!row?.value) return null;
    return `Crypto Bitcoin Fear & Greed: ${row.value} (${row.value_classification ?? 'n/a'})`;
  } catch {
    return null;
  }
}

export async function buildAdvisorLiveContext(userText: string): Promise<string> {
  const fetchedAt = new Date().toISOString();
  const zh = /[\u3400-\u9fff]/.test(userText);
  const symbols = collectAdvisorSymbols(userText);
  const [quotes, fear] = await Promise.all([
    fetchYahooQuotes(zh ? [...symbols, USDTWD_YAHOO] : symbols),
    fetchFearGreed(),
  ]);
  const fx = quotes.find((row) => row.symbol === USDTWD_YAHOO || row.symbol === 'TWD=X')?.regularMarketPrice;
  const usdTwd = typeof fx === 'number' && fx > 20 && fx < 50 ? fx : null;
  const locale = zh ? 'zh' : 'en';
  const lines = quotes
    .filter((row) => typeof row.regularMarketPrice === 'number')
    .filter((row) => row.symbol !== USDTWD_YAHOO && row.symbol !== 'TWD=X')
    .map((row) => {
      const name = row.shortName ?? row.longName ?? row.symbol;
      const currency = row.currency ?? (row.symbol.endsWith('.TW') || row.symbol.endsWith('.TWO') ? 'TWD' : 'USD');
      const change = row.regularMarketChangePercent ?? 0;
      return `${row.symbol} ${name}: ${displayPx(row.regularMarketPrice ?? 0, currency, locale, usdTwd)} (${formatPct(change)})`;
    });

  return [
    `LIVE_DESK fetched_at: ${fetchedAt}`,
    'These prints were pulled for this turn (batch quote). They are a snapshot, not a streaming tape or level-2.',
    lines.length ? lines.join('\n') : '(live quote fetch returned nothing; use CACHED_DESK)',
    fear ?? 'Crypto Fear & Greed: live fetch unavailable',
  ].join('\n');
}
