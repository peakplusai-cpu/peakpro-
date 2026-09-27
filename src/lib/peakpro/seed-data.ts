import type {
  AiSummaryRow,
  FearGreedPayload,
  MarketDataRow,
  MarketSeriesPayload,
  NewsCacheRow,
  OhlcBar,
  TrendingPayload,
} from '@/lib/peakpro/types';

function fract(seed: number, i: number): number {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function walkBars(params: {
  seed: number;
  count: number;
  start: number;
  drift: number;
  vol: number;
  stepDays: number;
}): OhlcBar[] {
  const bars: OhlcBar[] = [];
  let close = params.start;
  for (let i = 0; i < params.count; i += 1) {
    const shock = (fract(params.seed, i) - 0.38) * params.vol;
    const open = close;
    close = Math.max(0.5, open * (1 + params.drift + shock));
    const wick = Math.abs(fract(params.seed, i + 99) - 0.5) * params.vol * open;
    const high = Math.max(open, close) + wick;
    const low = Math.min(open, close) - wick * 0.7;
    bars.push({
      t: isoDaysAgo((params.count - 1 - i) * params.stepDays),
      o: round(open),
      h: round(high),
      l: round(Math.max(0.2, low)),
      c: round(close),
    });
  }
  return bars;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function series(
  name: string,
  bars: OhlcBar[],
  thesis: string,
  thesisZh: string,
  currency = 'USD',
): MarketSeriesPayload {
  const last = bars[bars.length - 1]?.c ?? 0;
  const prev = bars[bars.length - 2]?.c ?? last;
  const highs = bars.map((b) => b.h);
  const lows = bars.map((b) => b.l);
  return {
    name,
    currency,
    last,
    changePct: prev ? ((last - prev) / prev) * 100 : 0,
    high: Math.max(...highs),
    low: Math.min(...lows),
    thesis,
    thesisZh,
    bars,
  };
}

function row(
  assetClass: MarketDataRow['asset_class'],
  symbol: string,
  timeframe: MarketDataRow['timeframe'],
  payload: MarketSeriesPayload,
): MarketDataRow {
  return {
    id: `${assetClass}:${symbol}:${timeframe}`,
    asset_class: assetClass,
    symbol,
    timeframe,
    payload,
    last_updated: new Date().toISOString(),
  };
}

const EQUITY_META: Record<
  string,
  { name: string; start: number; drift: number; thesis: string; thesisZh: string }
> = {
  TSM: {
    name: 'TSMC',
    start: 92,
    drift: 0.018,
    thesis:
      'Foundry utilization and leading-edge node mix remain the swing factor for the semiconductor cycle. Monthly tape still prices durable AI accelerator demand.',
    thesisZh:
      '先進製程產能利用率與節點組合仍是半導體循環的核心變數。月線仍在反映 AI 加速器的可持續需求。',
  },
  NVDA: {
    name: 'NVIDIA',
    start: 48,
    drift: 0.022,
    thesis:
      'Data-center GPU bookings keep the multiple elevated. Watch supply tightness versus hyperscaler capex digestion.',
    thesisZh: '資料中心 GPU 訂單支撐估值。需觀察供給緊俏與超大規模資本支出消化速度。',
  },
  AAPL: {
    name: 'Apple',
    start: 165,
    drift: 0.008,
    thesis:
      'Services mix and installed-base monetization offset hardware elasticity. Annual outlook hinges on AI feature attach rates.',
    thesisZh: '服務組合與裝機基數變現抵銷硬體彈性。年度展望取決於 AI 功能附加率。',
  },
  MSFT: {
    name: 'Microsoft',
    start: 310,
    drift: 0.012,
    thesis:
      'Azure AI run-rate and Office copilot seats remain the fundamental drivers. Cash-flow duration supports the premium multiple.',
    thesisZh: 'Azure AI 經常性收入與 Office Copilot 席次仍是基本面驅動力。現金流存續期支撐溢價本益比。',
  },
  TSLA: {
    name: 'Tesla',
    start: 180,
    drift: 0.006,
    thesis:
      'Volume, mix, and autonomy optionality dominate the tape. Monthly trend remains higher-beta versus the mega-cap complex.',
    thesisZh: '量能、產品組合與自駕選擇權主導走勢。月線相對巨型科技股仍屬高貝塔。',
  },
  '2330.TW': {
    name: '台積電',
    start: 580,
    drift: 0.016,
    thesis:
      'Local listing tracks the same foundry cycle with TWD beta and domestic flow overlay.',
    thesisZh: '上市櫃走勢同步晶圓代工循環，並疊加新台幣與本土資金流向。',
  },
  '2317.TW': {
    name: '鴻海',
    start: 145,
    drift: 0.01,
    thesis: 'Server and AI enclosure programs are the incremental earnings lever versus handset assembly.',
    thesisZh: '伺服器與 AI 機殼專案是相對手機組裝的增量獲利槓桿。',
  },
  '2454.TW': {
    name: '聯發科',
    start: 980,
    drift: 0.011,
    thesis: 'Edge AI SoC mix and flagship smartphone recovery frame the annual macro outlook.',
    thesisZh: '邊緣 AI SoC 組合與旗艦手機復甦構成年度總體展望。',
  },
  AMZN: {
    name: 'Amazon',
    start: 145,
    drift: 0.013,
    thesis: 'AWS growth re-acceleration and retail operating leverage remain the two-factor model.',
    thesisZh: 'AWS 增長再加速與零售營運槓桿仍是雙因子模型。',
  },
  GOOGL: {
    name: 'Alphabet',
    start: 130,
    drift: 0.01,
    thesis: 'Search durability versus AI distribution risk is the core debate on the annual outlook.',
    thesisZh: '搜尋耐久性對上 AI 分發風險，是年度展望的核心辯論。',
  },
  META: {
    name: 'Meta Platforms',
    start: 320,
    drift: 0.014,
    thesis: 'Reels monetization and infra spend discipline keep the daily trend constructive.',
    thesisZh: 'Reels 變現與基礎設施支出紀律使日線趨勢維持正向。',
  },
  JPM: {
    name: 'JPMorgan Chase',
    start: 175,
    drift: 0.007,
    thesis: 'NII trajectory and capital return capacity anchor the money-center annual outlook.',
    thesisZh: '淨利息收入軌跡與資本回饋能力錨定大型銀行年度展望。',
  },
};

function equityRows(symbol: string): MarketDataRow[] {
  const meta = EQUITY_META[symbol];
  if (!meta) return [];
  const daily = walkBars({
    seed: symbol.length * 11,
    count: 60,
    start: meta.start,
    drift: meta.drift / 8,
    vol: 0.028,
    stepDays: 1,
  });
  const monthly = walkBars({
    seed: symbol.length * 17,
    count: 24,
    start: meta.start * 0.72,
    drift: meta.drift,
    vol: 0.06,
    stepDays: 30,
  });
  const annual = walkBars({
    seed: symbol.length * 23,
    count: 8,
    start: meta.start * 0.45,
    drift: meta.drift * 2.2,
    vol: 0.09,
    stepDays: 365,
  });
  const currency = symbol.endsWith('.TW') ? 'TWD' : 'USD';
  return [
    row('equity', symbol, 'daily', series(meta.name, daily, meta.thesis, meta.thesisZh, currency)),
    row('equity', symbol, 'monthly', series(meta.name, monthly, meta.thesis, meta.thesisZh, currency)),
    row('equity', symbol, 'annual', series(meta.name, annual, meta.thesis, meta.thesisZh, currency)),
  ];
}

function cryptoRows(): MarketDataRow[] {
  const btcD = walkBars({ seed: 7, count: 60, start: 62000, drift: 0.006, vol: 0.035, stepDays: 1 });
  const ethD = walkBars({ seed: 9, count: 60, start: 2800, drift: 0.005, vol: 0.04, stepDays: 1 });
  return [
    row(
      'crypto',
      'BTC',
      'daily',
      series(
        'Bitcoin',
        btcD,
        'Spot liquidity and ETF primary-market flows remain the dominant daily drivers versus on-chain activity.',
        '現貨流動性與 ETF 初級市場資金流仍是相對鏈上活動的主要日線驅動力。',
      ),
    ),
    row(
      'crypto',
      'BTC',
      'monthly',
      series(
        'Bitcoin',
        walkBars({ seed: 8, count: 24, start: 28000, drift: 0.02, vol: 0.08, stepDays: 30 }),
        'Halving-cycle liquidity and institutional custody adoption frame the monthly trend.',
        '減半週期流動性與機構託管採用構成月線趨勢。',
      ),
    ),
    row(
      'crypto',
      'ETH',
      'daily',
      series(
        'Ethereum',
        ethD,
        'Staking yield, L2 fee compression, and ETF flow are the three-factor daily tape.',
        '質押收益率、L2 費用壓縮與 ETF 資金流構成日線三因子。',
      ),
    ),
    row(
      'crypto',
      'ETH',
      'monthly',
      series(
        'Ethereum',
        walkBars({ seed: 10, count: 24, start: 1600, drift: 0.018, vol: 0.09, stepDays: 30 }),
        'Restaking and blob-space economics remain the structural monthly narrative.',
        '再質押與 blob 空間經濟仍是結構性月線敘事。',
      ),
    ),
  ];
}

function goldRows(): MarketDataRow[] {
  const daily = walkBars({ seed: 3, count: 60, start: 2320, drift: 0.003, vol: 0.012, stepDays: 1 });
  return [
    row(
      'gold',
      'XAUUSD',
      'spot',
      series(
        'Spot Gold',
        daily,
        'Real-rate path, official-sector demand, and geopolitical convexity continue to underwrite the bid for bullion.',
        '實質利率路徑、官方部門需求與地緣凸性持續支撐黃金買盤。',
      ),
    ),
    row(
      'gold',
      'XAUUSD',
      'monthly',
      series(
        'Spot Gold',
        walkBars({ seed: 4, count: 24, start: 1850, drift: 0.012, vol: 0.03, stepDays: 30 }),
        'Monthly trend remains a hedge overlay against duration and FX reserve diversification.',
        '月線趨勢仍是對存續期與外匯存底多元化的避險配置。',
      ),
    ),
  ];
}

function fearGreedRow(): MarketDataRow {
  const history = Array.from({ length: 30 }, (_, i) => ({
    t: isoDaysAgo(29 - i),
    value: Math.round(42 + fract(5, i) * 36),
  }));
  const value = history[history.length - 1]?.value ?? 54;
  const payload: FearGreedPayload = {
    value,
    classification: value >= 75 ? 'Extreme Greed' : value >= 55 ? 'Greed' : value >= 45 ? 'Neutral' : value >= 25 ? 'Fear' : 'Extreme Fear',
    classificationZh:
      value >= 75 ? '極度貪婪' : value >= 55 ? '貪婪' : value >= 45 ? '中性' : value >= 25 ? '恐慌' : '極度恐慌',
    history,
    commentary:
      'Cross-asset positioning is modestly risk-on. Breadth is constructive, but geopolitical headlines keep a hedge bid under gold and the dollar.',
    commentaryZh:
      '跨資產部位略偏風險偏好。廣度偏正向，但地緣標題使黃金與美元仍保有避險買盤。',
  };
  return {
    id: 'index:FNG:daily',
    asset_class: 'index',
    symbol: 'FNG',
    timeframe: 'daily',
    payload: payload as unknown as MarketSeriesPayload,
    last_updated: new Date().toISOString(),
  };
}

function trendingRow(): MarketDataRow {
  const payload: TrendingPayload = {
    items: [
      { rank: 1, symbol: 'NVDA', name: 'NVIDIA', assetClass: 'equity', changePct: 6.4, catalyst: 'Accelerator order book revision', catalystZh: '加速器訂單下修／上修傳聞' },
      { rank: 2, symbol: 'BTC', name: 'Bitcoin', assetClass: 'crypto', changePct: 4.1, catalyst: 'Spot ETF primary-market create', catalystZh: '現貨 ETF 初級市場申購' },
      { rank: 3, symbol: 'XAUUSD', name: 'Spot Gold', assetClass: 'gold', changePct: 2.2, catalyst: 'Official-sector bid + real-rate ease', catalystZh: '官方買盤與實質利率回落' },
      { rank: 4, symbol: 'TSM', name: 'TSMC', assetClass: 'equity', changePct: 3.8, catalyst: 'Leading-edge utilization print', catalystZh: '先進製程利用率數據' },
      { rank: 5, symbol: 'ETH', name: 'Ethereum', assetClass: 'crypto', changePct: 3.1, catalyst: 'L2 fee compression vs staking yield', catalystZh: 'L2 費用壓縮對比質押收益' },
      { rank: 6, symbol: '2330.TW', name: '台積電', assetClass: 'equity', changePct: 2.9, catalyst: 'Domestic flow into the foundry complex', catalystZh: '本土資金流入晶圓代工族群' },
    ],
  };
  return {
    id: 'ranking:WEEKLY:weekly',
    asset_class: 'ranking',
    symbol: 'WEEKLY',
    timeframe: 'weekly',
    payload: payload as unknown as MarketSeriesPayload,
    last_updated: new Date().toISOString(),
  };
}

function newsRows(): NewsCacheRow[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'n1',
      category: 'war',
      title: 'Cross-border strikes keep energy-risk premium bid in European gas and crude.',
      title_zh: '跨境攻擊使歐洲天然氣與原油風險溢價維持買盤。',
      summary:
        'Overnight military activity near energy infrastructure lifted the geopolitical risk overlay. Equity desks faded cyclicals at the open while bullion held a safe-haven bid.',
      summary_zh: '能源基礎設施附近的軍事活動抬升地緣風險溢價。股市開盤淡化週期股，黃金維持避險買盤。',
      source: 'Desk Wire',
      url: 'https://peakpro.local/cache/geopolitics/energy-premium',
      published_at: isoDaysAgo(0),
      last_updated: now,
    },
    {
      id: 'n2',
      category: 'geopolitics',
      title: 'Export-control chatter around advanced packaging weighs on the semiconductor complex.',
      title_zh: '先進封裝出口管制傳聞壓抑半導體族群。',
      summary:
        'Policy headlines around tool and packaging restrictions introduced a discount rate shock for foundry and GPU names. The monthly trend is intact; daily tape is two-sided.',
      summary_zh: '設備與封裝限制的政策標題對晶圓代工與 GPU 名稱形成折現率衝擊。月線仍完好，日線則雙向波動。',
      source: 'Policy Tape',
      url: 'https://peakpro.local/cache/geopolitics/export-controls',
      published_at: isoDaysAgo(1),
      last_updated: now,
    },
    {
      id: 'n3',
      category: 'war',
      title: 'Naval corridor disruption raises freight rates and delays just-in-time inventory.',
      title_zh: '航道中斷推升運價並延遲即時庫存。',
      summary:
        'Insurance premia and rerouting costs are the first-order hit. Secondary effects flow into goods inflation and regional equity multiples.',
      summary_zh: '保險溢價與改道成本是一階衝擊。二階效應傳導至商品通膨與區域股市本益比。',
      source: 'Maritime Desk',
      url: 'https://peakpro.local/cache/geopolitics/corridor',
      published_at: isoDaysAgo(2),
      last_updated: now,
    },
    {
      id: 'n4',
      category: 'geopolitics',
      title: 'Diplomatic channel reopened; risk assets faded the first headline, then faded the fade.',
      title_zh: '外交管道重啟；風險資產先淡化標題，再淡化回撤。',
      summary:
        'Ceasefire optionality is being priced as a thin tail, not a base case. Volatility surfaces remain bid in energy and defense names.',
      summary_zh: '停火選擇權被定價為薄尾而非基準情境。能源與國防名稱的波動率曲面仍有買盤。',
      source: 'Diplomatic Wire',
      url: 'https://peakpro.local/cache/geopolitics/diplomacy',
      published_at: isoDaysAgo(3),
      last_updated: now,
    },
    {
      id: 'n5',
      category: 'war',
      title: 'Defense-budget revisions lift the contractor complex versus consumer discretionary.',
      title_zh: '國防預算修正推升承包商族群、相對壓抑非必需消費。',
      summary:
        'Fiscal reallocation is a multi-quarter theme. The weekly trending desk keeps contractors on the watchlist versus crowded growth.',
      summary_zh: '財政重新配置是多季主題。每週熱門桌將承包商列入觀察，對比擁擠的成長股。',
      source: 'Fiscal Tape',
      url: 'https://peakpro.local/cache/geopolitics/defense-budget',
      published_at: isoDaysAgo(4),
      last_updated: now,
    },
    {
      id: 'n6',
      category: 'geopolitics',
      title: 'Sanctions perimeter widened; correspondent-banking friction rises in adjacent FX.',
      title_zh: '制裁範圍擴大；周邊外匯的代理銀行摩擦上升。',
      summary:
        'Settlement delays and basis widening are the tell. Gold and the dollar remain the cleanest hedge expressions in the cache.',
      summary_zh: '結算延遲與基差走闊是訊號。黃金與美元仍是快取中最乾淨的避險表達。',
      source: 'Sanctions Desk',
      url: 'https://peakpro.local/cache/geopolitics/sanctions',
      published_at: isoDaysAgo(5),
      last_updated: now,
    },
  ];
}

function briefRows(): AiSummaryRow[] {
  const periodEnd = isoDaysAgo(0);
  const periodStart = isoDaysAgo(7);
  const now = new Date().toISOString();
  return [
    {
      id: 'brief-en',
      kind: 'weekly_market',
      locale: 'en',
      title: 'Weekly Market Summary — Cross-Asset Desk',
      content: [
        '## Tape',
        'Risk assets finished the week higher, led by the semiconductor complex and the large-cap growth cohort. Breadth improved into Friday, but the bid was not indiscriminate: crowded momentum still paid, while lower-quality cyclicals lagged.',
        '',
        '## Equities',
        'Taiwan and U.S. cash equities remain aligned on the AI capex cycle. TSMC and NVIDIA continue to set the high-beta tone. Apple and Microsoft offered ballast. Tesla stayed two-sided on delivery and autonomy headlines.',
        '',
        '## Crypto & bullion',
        'Bitcoin held a constructive monthly trend on ETF primary-market flow. Ethereum tracked beta with a staking-yield overlay. Spot gold retained a geopolitical hedge bid as real-rate volatility cooled.',
        '',
        '## Geopolitics',
        'The risk feed stayed live: corridor disruption, export-control chatter, and defense-budget revisions. None of these prints, by themselves, reverse the monthly equity trend — they do keep a premium on hedges.',
        '',
        '## Positioning',
        'Fear & Greed sits in modest greed. The desk prefers staying long quality growth with an explicit gold overlay, rather than chasing late-week extended names.',
        '',
        '_Cached for educational use. Not investment advice._',
      ].join('\n'),
      period_start: periodStart,
      period_end: periodEnd,
      last_updated: now,
    },
    {
      id: 'brief-zh',
      kind: 'weekly_market',
      locale: 'zh',
      title: '每週市場總結 — 跨資產桌',
      content: [
        '## 走勢',
        '風險資產本週收高，由半導體與大型成長股領漲。週五廣度改善，但買盤並非全面：擁擠動能仍獲報酬，低品質週期股落後。',
        '',
        '## 股票',
        '台股與美股現貨仍對齊 AI 資本支出循環。台積電與 NVIDIA 設定高貝塔基調，蘋果與微軟提供壓艙，特斯拉受交付與自駕標題影響呈雙向波動。',
        '',
        '## 加密與黃金',
        '比特幣在 ETF 初級市場資金流下維持正向月線。以太坊跟隨貝塔並疊加質押收益。現貨黃金在實質利率波動降溫時仍保有地緣避險買盤。',
        '',
        '## 地緣政治',
        '風險情報維持活躍：航道中斷、出口管制傳聞與國防預算修正。單一標題不足以扭轉股票月線，但會維持避險溢價。',
        '',
        '## 部位',
        '恐慌與貪婪指數位於溫和貪婪。桌面傾向於持有優質成長並配置明確的黃金避險，而非追價週末延伸的標的。',
        '',
        '_本快取僅供教育參考，不構成投資建議。_',
      ].join('\n'),
      period_start: periodStart,
      period_end: periodEnd,
      last_updated: now,
    },
  ];
}

/** Deterministic climbing candles for the landing intro — not a named listing. */
export function anonymousGrowthBars(count = 42): OhlcBar[] {
  return walkBars({
    seed: 42,
    count,
    start: 18,
    drift: 0.034,
    vol: 0.045,
    stepDays: 1,
  });
}

export function buildSeedSnapshot(): {
  market: MarketDataRow[];
  news: NewsCacheRow[];
  briefs: AiSummaryRow[];
} {
  const market = [
    ...Object.keys(EQUITY_META).flatMap(equityRows),
    ...cryptoRows(),
    ...goldRows(),
    fearGreedRow(),
    trendingRow(),
  ];
  return { market, news: newsRows(), briefs: briefRows() };
}
