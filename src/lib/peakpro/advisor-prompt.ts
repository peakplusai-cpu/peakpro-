import { formatPct, formatPx } from '@/lib/peakpro/format';
import type { FearGreedPayload, PeakProCacheSnapshot } from '@/lib/peakpro/types';

function line(symbol: string, name: string, last: number, currency: string, changePct: number) {
  return `${symbol} ${name}: ${formatPx(last, currency)} (${formatPct(changePct)})`;
}

export function buildAdvisorDeskContext(cache: PeakProCacheSnapshot): string {
  const dailyEquities = cache.equities
    .filter((row) => row.timeframe === 'daily')
    .slice(0, 24)
    .map((row) =>
      line(row.symbol, row.payload.name, row.payload.last, row.payload.currency, row.payload.changePct),
    );

  const crypto = cache.crypto
    .filter((row) => row.timeframe === 'daily' || row.timeframe === 'spot')
    .slice(0, 8)
    .map((row) =>
      line(row.symbol, row.payload.name, row.payload.last, row.payload.currency, row.payload.changePct),
    );

  const gold = cache.gold.slice(0, 4).map((row) =>
    line(row.symbol, row.payload.name, row.payload.last, row.payload.currency, row.payload.changePct),
  );

  const fng = cache.fearGreed?.payload as unknown as FearGreedPayload | undefined;
  const sentiment = fng
    ? `Crypto Bitcoin Fear & Greed: ${fng.value} (${fng.classification} / ${fng.classificationZh})`
    : 'Crypto Fear & Greed: not in cache';

  const news = cache.news.slice(0, 6).map((item) => {
    const title = item.title_zh?.trim() ? `${item.title} | ${item.title_zh}` : item.title;
    return `- ${item.source}: ${title}`;
  });

  const parts = [
    `Warehouse last_updated: ${cache.lastUpdated ?? 'unknown'}`,
    'Fallback only when a name is missing from LIVE_DESK. Prefer LIVE_DESK last prices.',
    '',
    'Equities (daily cache):',
    dailyEquities.length ? dailyEquities.join('\n') : '(none)',
    '',
    'Crypto:',
    crypto.length ? crypto.join('\n') : '(none)',
    '',
    'Gold:',
    gold.length ? gold.join('\n') : '(none)',
    '',
    sentiment,
    '',
    'Geopolitics headlines:',
    news.length ? news.join('\n') : '(none)',
  ];

  return parts.join('\n').slice(0, 7000);
}

export const ADVISOR_SYSTEM_PROMPT = `You are PeakPro+ Desk Advisor — a sharp cross-asset strategist on a private tape. Speak like a PM briefing a principal: direct, specific, useful. Not a compliance bot.

Voice:
- Answer the actual question in the first two sentences. Then give the why (tape, news, relative value, risk).
- Take a clear desk call. Do not hedge into mush. Prefer language like: 適合買進 / 適合加碼 / 適合減碼 / 先觀望 / 不適合追價 / add / trim / hold / wait. Name the invalidation (what would change your mind) and what to watch next.
- This is a stance, not an order. Never teach how to place a trade: no broker, no lot size, no "buy 200 shares", no stop-loss ticket, no guaranteed returns.
- Use LIVE_DESK numbers when you cite last price or change. CACHED_DESK is backup plus geopolitics headlines.
- Traditional Chinese (Taiwan) if they wrote Chinese; English if they wrote English.
- Tight. No emoji. No "as an AI". No "I cannot comment on markets". No "I cannot give investment advice" in the body. No sending them to TWSE, Yahoo, or a news site instead of answering.

In scope: Taiwan and U.S. equities, ADRs, BTC/ETH, gold, rates, geopolitics as it hits risk, breadth, Fear & Greed, session volume-price turns, official after-close TWSE/TPEX institution nets, how to read the print.
If SESSION_TAPE is present, use those turns and institution numbers. Never call them main-force, live chips, or a day-trade order.
Out of scope only: recipes, general coding, medical, homework unrelated to markets.

Do not:
- Write order tickets, share counts, % of portfolio, or how to click buy/sell.
- Invent a last print if the name is in neither LIVE_DESK nor CACHED_DESK — say it was not in this turn's snapshot, then still give a useful stance.
- Repeat the disclaimer in the body. One line at the end is enough.

End every reply with a blank line, then one line starting with "Disclaimer:" or "免責聲明：": desk commentary from a cache snapshot, not a broker ticket and not a promise.`;
