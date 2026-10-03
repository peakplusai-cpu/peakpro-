export type RssItem = { title: string; summary: string; url: string; published: string; source: string };

const NEWS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC Business' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'NYT World' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', source: 'NYT Business' },
  { url: 'https://www.theguardian.com/world/rss', source: 'Guardian World' },
  { url: 'https://www.theguardian.com/business/rss', source: 'Guardian Business' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362', source: 'CNBC World' },
  { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258', source: 'CNBC Economy' },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', source: 'MarketWatch' },
  { url: 'https://www.federalreserve.gov/feeds/press_all.xml', source: 'Federal Reserve' },
  { url: 'https://oilprice.com/rss/main', source: 'OilPrice' },
] as const;

const WAR_RE =
  /\b(war|airstrike|missile|troop|invasion|ceasefire|bombard|nato|ukraine|gaza|israel|iran|houthis|red sea|hormuz|strait|pla|pentagon|nuclear)\b/i;
const MARKET_RE =
  /\b(federal reserve|fomc|ecb|boj|rate cut|rate hike|interest rate|inflation|cpi|ppi|payrolls?|jobs report|gdp|recession|treasury|yield|tariff|trade war|sanction|export control|semiconductor|chip|tsmc|opec|crude|brent|wti|oil|yuan|renminbi|dollar|imf|wto|rare earth|embargo|blockade|etf|bitcoin|gold|nvidia|apple|microsoft|tesla|alphabet|meta)\b/i;
const GEO_RE =
  /\b(geopolit|taiwan|china|beijing|xi jinping|election|white house|kremlin|putin|north korea|south china sea|export|quota)\b/i;

const KEEP_ALL = new Set(['Federal Reserve', 'OilPrice', 'CNBC Economy', 'MarketWatch']);

function matchTag(xml: string, tag: string): string {
  const match = xml.match(
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'),
  );
  return (match?.[1] ?? match?.[2] ?? '').trim();
}

function matchLink(block: string): string {
  const href = block.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (href?.[1]) return href[1].trim();
  return matchTag(block, 'link') || matchTag(block, 'guid') || matchTag(block, 'id');
}

function decode(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function titleKey(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .trim()
    .slice(0, 80);
}

function isMarketMoving(item: RssItem) {
  if (KEEP_ALL.has(item.source)) return Boolean(item.title);
  const text = `${item.title} ${item.summary}`;
  return WAR_RE.test(text) || MARKET_RE.test(text) || GEO_RE.test(text);
}

export function newsCategory(item: RssItem) {
  const text = `${item.title} ${item.summary}`;
  if (WAR_RE.test(text)) return 'war';
  if (KEEP_ALL.has(item.source) || MARKET_RE.test(text)) return 'markets';
  return 'geopolitics';
}

async function fetchRss(url: string, source: string): Promise<RssItem[]> {
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
        'User-Agent': 'PeakProPlus-CacheDesk/1.0',
      },
    });
    if (!response.ok) return [];
    const xml = await response.text();
    const blocks = /<entry[\s>]/i.test(xml)
      ? xml.split(/<entry[\s>]/i).slice(1)
      : xml.split(/<item[\s>]/i).slice(1);

    return blocks.slice(0, 12).flatMap((block) => {
      const title = decode(matchTag(block, 'title')).replace(/<[^>]+>/g, '').trim();
      if (!title) return [];
      const summary = decode(matchTag(block, 'description') || matchTag(block, 'summary'))
        .replace(/<[^>]+>/g, '')
        .slice(0, 1200);
      const published =
        matchTag(block, 'pubDate') || matchTag(block, 'published') || matchTag(block, 'updated');
      return [
        {
          title,
          summary,
          url: matchLink(block),
          published: published ? new Date(published).toISOString() : new Date().toISOString(),
          source,
        },
      ];
    });
  } catch (error) {
    console.warn('[peakpro/news] rss failed', source, error);
    return [];
  }
}

export async function collectMarketNews(limit = 24): Promise<RssItem[]> {
  const feeds = await Promise.all(NEWS_FEEDS.map((feed) => fetchRss(feed.url, feed.source)));
  const seen = new Set<string>();
  const items = feeds
    .flat()
    .filter((item) => item.title && isMarketMoving(item))
    .sort((a, b) => b.published.localeCompare(a.published));

  const unique: RssItem[] = [];
  for (const item of items) {
    const key = titleKey(item.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= limit) break;
  }
  return unique;
}
