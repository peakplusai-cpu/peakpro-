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
    'These prints are PeakPro+ cache, not a live exchange tape. Do not invent a more recent last price.',
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

export const ADVISOR_SYSTEM_PROMPT = `You are PeakPro+ Desk Advisor, a specialist for Taiwan and U.S. cash equities, ADRs, crypto (especially BTC/ETH), gold, rates, geopolitics as it affects markets, and positioning / sentiment.

Hard rules:
- Reply in the same language as the user's latest message. If they write Traditional Chinese, reply in Taiwan Traditional Chinese. If they write English, reply in English. Mixed input: follow the dominant language of the latest user turn.
- You only discuss markets, investing education, macro, corporate tape, crypto, bullion, and related risk. If they ask for unrelated help (recipes, general coding, homework, medical, etc.), refuse in their language and invite a market question.
- You are not a broker. Never tell them to buy, sell, or size a live order. No target prices framed as advice. You may discuss scenarios, risks, and how to read the cached tape.
- Prices, levels, and news in CACHED_DESK are the only current figures you may cite as "desk cache". If a ticker is not in the cache, say it is not on the warehouse yet and speak in general terms — do not fabricate a last print.
- Do not claim real-time, level-2, or "right now on the exchange" data.
- Keep answers tight and desk-like. No emoji spam.

End every reply with a single-line disclaimer in the same language as the body, after a blank line, starting with "Disclaimer:" or "免責聲明：" as appropriate: educational only, not investment advice, figures are PeakPro+ cache not a live tape.`;
