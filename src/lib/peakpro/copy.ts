import type { Locale } from '@/i18n/locale';
import type { PeakProModule } from '@/lib/peakpro/constants';

type CopyTree = Record<string, string>;

const en: CopyTree = {
  brand: 'PeakPro+',
  tagline: 'Institutional market intelligence, refined for the private desk.',
  navOverview: 'Command Desk',
  navTaiwan: 'Taiwan Equities',
  navUs: 'U.S. Equities',
  navCrypto: 'Crypto Trends',
  navGold: 'Gold Trends',
  navGeopolitics: 'Geopolitical Risk Feed',
  navSentiment: 'Fear & Greed Index',
  navTrending: 'Weekly Trending Assets',
  navBrief: 'AI Weekly Market Summary',
  navSubscribe: 'Subscribe',
  navLogin: 'Client Access',
  navApp: 'Enter Desk',
  navSignOut: 'Sign Out',
  langEn: 'English',
  langZh: '繁體中文',
  langAria: 'Language switcher',
  clocksTitle: 'World Top 10 Economies Live Clock',
  clocksSub: 'Local session times across the largest economic blocs — 12-hour with AM/PM.',
  heroCta: 'Open the Terminal',
  heroSecondary: 'View Premium Mandate',
  introKicker: 'Anonymous tape · hyper-growth complex',
  lastPrint: 'Last cache print',
  synchronizing: 'The market desk is synchronizing the local cache. No live vendor calls are made from this session.',
  freeBadge: 'Free desk',
  premiumBadge: 'Premium mandate',
  lockedTitle: 'Premium mandate required',
  lockedBody:
    'This tape is reserved for PeakPro+ Premium. Free accounts may review monthly trends on TSMC, NVIDIA, Apple, Microsoft, and Tesla only.',
  lockedCta: 'Unlock the full desk',
  monthlyOnly: 'Monthly trends — complimentary hot list',
  dailyTrends: 'Daily Trends',
  monthlyTrends: 'Monthly Trends',
  annualOutlook: 'Annual Macro Outlook',
  last: 'Last',
  change: 'Change',
  range: 'Range',
  thesis: 'Desk thesis',
  subscribeTitle: 'PeakPro+ Premium Mandate',
  subscribeSub: 'Recurring institutional access. Automatic collection every 30 days via Creem.',
  subscribePrice: '$20',
  subscribePeriod: '/ 30 days',
  subscribeCta: 'Authorize recurring mandate',
  subscribeLogin: 'Sign in to subscribe',
  subscribeFeaturesTitle: 'Unlocked on Premium',
  revokedNotice:
    'The most recent collection failed. Premium access has been revoked immediately. Re-authorize the mandate to restore the full desk.',
  paymentSuccess: 'Mandate confirmed. Premium access is live through the current 30-day cycle.',
  loginTitle: 'Client Access',
  loginSub: 'Authenticate to read the PeakPro+ cache. External market vendors are never called from the browser.',
  signIn: 'Sign In',
  signUp: 'Open an account',
  email: 'Email',
  password: 'Password',
  backHome: 'Back to PeakPro+',
  overviewLead: 'Cached prints only. The scraper desk refreshes the warehouse every three hours.',
  emptyCache: 'No cached prints yet. The background scraper has not completed its first cycle.',
  fearTitle: 'Market Fear & Greed Index',
  trendingTitle: 'Weekly Trending Assets',
  briefTitle: 'AI Weekly Market Summary',
  newsTitle: 'Geopolitical & War News',
  catWar: 'War',
  catGeopolitics: 'Geopolitics',
  sourceBbc: 'BBC World',
  sourceNyt: 'NYT World',
  goldTitle: 'Spot Gold',
  cryptoTitle: 'Major cryptocurrency complex',
  taiwanTitle: 'Taiwan cash equities',
  usTitle: 'U.S. cash equities',
  searchPlaceholderTw: 'Search a TWSE code — 2330 or 2330.TW',
  searchPlaceholderUs: 'Search a U.S. ticker — AAPL, NVDA',
  searchCta: 'Look up',
  searchHint: 'Look up a ticker to add it to the local cache.',
  searchWrongMarketTw: 'That looks like a U.S. ticker. Open U.S. Equities to look it up.',
  searchWrongMarketUs: 'That looks like a Taiwan code. Open Taiwan Equities to look it up.',
  searchInvalid: 'Enter a valid ticker.',
  searchNotFound: 'No daily tape found for that symbol.',
  searchPremiumOnly: 'Custom tickers are a Premium desk feature.',
  searchOk: 'Added to the desk cache.',
  backToDesk: 'Back to desk',
  tapeReadout: 'Tape readout',
  missingSymbol: 'This ticker is not in the warehouse yet. Look it up from the desk first.',
  missingNews: 'This briefing is no longer in the cache.',
  readOriginal: 'Read original',
  monthlyOnlyChart: 'Free desk shows the monthly cache only.',
  mktCap: 'Mkt cap',
  peLabel: 'P/E',
  weekRange: 'Cached range',
  open: 'Open',
  highLabel: 'High',
  lowLabel: 'Low',
  close: 'Close',
  volume: 'Volume',
  footerProduct: 'PeakPro+ Market Intelligence',
};

const zh: CopyTree = {
  brand: 'PeakPro+',
  tagline: '機構級市場情報，為私人投資桌重新淬鍊。',
  navOverview: '指揮台',
  navTaiwan: '台股',
  navUs: '美股',
  navCrypto: '加密趨勢',
  navGold: '黃金趨勢',
  navGeopolitics: '地緣政治風險情報',
  navSentiment: '恐慌與貪婪指數',
  navTrending: '本週熱門資產',
  navBrief: 'AI 每週市場總結',
  navSubscribe: '訂閱',
  navLogin: '客戶登入',
  navApp: '進入終端',
  navSignOut: '登出',
  langEn: 'English',
  langZh: '繁體中文',
  langAria: '語言切換',
  clocksTitle: '全球十大經濟體即時時鐘',
  clocksSub: '十大經濟體當地時間，12 小時制並標示上午／下午。',
  heroCta: '開啟終端',
  heroSecondary: '查看 Premium 授權',
  introKicker: '匿名走勢 · 超成長科技複合體',
  lastPrint: '快取最後更新',
  synchronizing: '市場桌正在同步本地快取。此工作階段不會向外部行情商發起即時請求。',
  freeBadge: '免費桌',
  premiumBadge: 'Premium 授權',
  lockedTitle: '需 Premium 授權',
  lockedBody:
    '此情報僅供 PeakPro+ Premium 使用。免費帳戶僅可檢視台積電、NVIDIA、蘋果、微軟與特斯拉的月線趨勢。',
  lockedCta: '解鎖完整終端',
  monthlyOnly: '月線趨勢 — 免費熱門清單',
  dailyTrends: '日線趨勢',
  monthlyTrends: '月線趨勢',
  annualOutlook: '年度總體展望',
  last: '最新價',
  change: '漲跌',
  range: '區間',
  thesis: '桌面論點',
  subscribeTitle: 'PeakPro+ Premium 授權',
  subscribeSub: '機構級循環權限。透過 Creem 每 30 日自動請款。',
  subscribePrice: '$20',
  subscribePeriod: '/ 30 日',
  subscribeCta: '授權循環請款',
  subscribeLogin: '登入後訂閱',
  subscribeFeaturesTitle: 'Premium 解鎖模組',
  revokedNotice: '最近一次請款失敗，Premium 權限已立即撤銷。請重新授權以恢復完整終端。',
  paymentSuccess: '授權已確認。Premium 權限於本 30 日週期內生效。',
  loginTitle: '客戶登入',
  loginSub: '驗證後僅讀取 PeakPro+ 本地快取。瀏覽器不會呼叫外部行情商。',
  signIn: '登入',
  signUp: '開立帳戶',
  email: '電子郵件',
  password: '密碼',
  backHome: '返回 PeakPro+',
  overviewLead: '僅顯示快取報價。背景爬蟲每三小時更新倉儲。',
  emptyCache: '尚無快取報價。背景爬蟲尚未完成首次週期。',
  fearTitle: '市場恐慌與貪婪指數',
  trendingTitle: '本週熱門資產',
  briefTitle: 'AI 每週市場總結',
  newsTitle: '地緣政治與戰事新聞',
  catWar: '戰事',
  catGeopolitics: '地緣政治',
  sourceBbc: 'BBC 國際',
  sourceNyt: '紐約時報國際',
  goldTitle: '現貨黃金',
  cryptoTitle: '主要加密貨幣複合體',
  taiwanTitle: '台股現貨',
  usTitle: '美股現貨',
  searchPlaceholderTw: '查台股代碼 — 2330 或 2330.TW',
  searchPlaceholderUs: '查美股代碼 — AAPL、NVDA',
  searchCta: '查詢',
  searchHint: '查詢代碼後會加入快取。',
  searchWrongMarketTw: '這比較像美股代碼，請到美股頁查詢。',
  searchWrongMarketUs: '這比較像台股代碼，請到台股頁查詢。',
  searchInvalid: '請輸入有效代碼。',
  searchNotFound: '找不到這檔的日線資料。',
  searchPremiumOnly: '自選代碼需 Premium。',
  searchOk: '已加入快取。',
  backToDesk: '返回列表',
  tapeReadout: '走勢讀數',
  missingSymbol: '這檔還沒進快取。請先在列表頁查詢。',
  missingNews: '這則情報已不在快取中。',
  readOriginal: '閱讀原文',
  monthlyOnlyChart: '免費桌僅顯示月線快取。',
  mktCap: '市值',
  peLabel: '本益比',
  weekRange: '快取區間',
  open: '開',
  highLabel: '高',
  lowLabel: '低',
  close: '收',
  volume: '量',
  footerProduct: 'PeakPro+ 市場情報',
};

const dictionaries: Record<Locale, CopyTree> = { en, zh };

export function peakproCopy(locale: Locale): CopyTree {
  return dictionaries[locale];
}

export function tPeakpro(locale: Locale, key: string): string {
  return dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
}

function hasCjk(value: string | null | undefined): boolean {
  return Boolean(value && /[\u3400-\u9fff]/.test(value));
}

export function localizedNewsText(locale: Locale, en: string, zh: string | null | undefined) {
  if (locale === 'zh' && zh && (hasCjk(zh) || zh !== en)) return zh;
  return en;
}

export function newsCategoryLabel(locale: Locale, category: string) {
  return tPeakpro(locale, category === 'war' ? 'catWar' : 'catGeopolitics');
}

export function newsSourceLabel(locale: Locale, source: string) {
  if (source === 'BBC World') return tPeakpro(locale, 'sourceBbc');
  if (source === 'NYT World') return tPeakpro(locale, 'sourceNyt');
  return source;
}

export const MODULE_HREF: Record<PeakProModule, string> = {
  overview: '/app',
  taiwan: '/app/taiwan',
  us: '/app/us',
  crypto: '/app/crypto',
  gold: '/app/gold',
  geopolitics: '/app/geopolitics',
  sentiment: '/app/sentiment',
  trending: '/app/trending',
  brief: '/app/brief',
};

export function moduleLabel(locale: Locale, moduleId: PeakProModule): string {
  const keys: Record<PeakProModule, string> = {
    overview: 'navOverview',
    taiwan: 'navTaiwan',
    us: 'navUs',
    crypto: 'navCrypto',
    gold: 'navGold',
    geopolitics: 'navGeopolitics',
    sentiment: 'navSentiment',
    trending: 'navTrending',
    brief: 'navBrief',
  };
  return tPeakpro(locale, keys[moduleId]);
}
