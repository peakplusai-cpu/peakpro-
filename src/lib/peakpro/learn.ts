export type LearnTab = 'principles' | 'indicators';

export type LearnLesson = {
  id: string;
  title: { en: string; zh: string };
  body: { en: string[]; zh: string[] };
  desk?: { en: string; zh: string };
};

export const LEARN_PRINCIPLES: LearnLesson[] = [
  {
    id: 'what-is-a-stock',
    title: { en: 'What you actually own', zh: '股票是什麼' },
    body: {
      zh: [
        '買進一股，是買進公司的一小片所有權，不是買進一個會自己往上跳的數字。價格是市場此刻願意成交的價，不是公司「應該值多少」的成績單。',
        '公司可以很健康，股價仍可能因為利率、資金、消息或情緒而下跌。反過來，消息很熱鬧，也不等於你買的那一檔會跟漲。',
      ],
      en: [
        'A share is a slice of ownership, not a number that is supposed to go up. The last print is where a buyer and a seller met — not a grade for the company.',
        'A solid business can still fall on rates, liquidity, news, or mood. Noise in the tape does not mean your name will follow.',
      ],
    },
  },
  {
    id: 'price',
    title: { en: 'How a price prints', zh: '價格怎麼來的' },
    body: {
      zh: [
        '每一筆成交，都是有人要買、有人要賣，雙方同意同一個價。買的人比賣的人急，價格容易往上走；賣的人比買的人急，價格容易往下走。',
        '影響急迫程度的，常見是利率、匯率、財報、產業消息、資金流向，以及市場當天的風險偏好。沒有單一原因能解釋每一檔。',
      ],
      en: [
        'Every print is a meeting of a bid and an offer. When buyers are more urgent, the tape lifts. When sellers are more urgent, it gives way.',
        'Urgency usually comes from rates, FX, earnings, industry news, flows, and the session’s risk appetite. No single story explains every name.',
      ],
    },
    desk: {
      zh: '台股、美股頁的「最新價」就是最後一筆成交。盤中請用即時圖，本桌其他數字大約三小時補一次。',
      en: 'Last on the Taiwan and U.S. desks is the latest print we cached. For a live tape, open the chart. Other desk numbers refresh about every three hours.',
    },
  },
  {
    id: 'candle',
    title: { en: 'Open, high, low, close', zh: '開高低收與K線' },
    body: {
      zh: [
        '一根K線記錄一段時間裡的開盤、最高、最低、收盤。實體是開與收的距離；上下影線是盤中曾經走到、但沒守住的位置。',
        '收在開盤之上，習慣畫成陽線；收在開盤之下，習慣畫成陰線。單根K線只是一段時間的摘要，不能單獨當成買賣訊號。',
      ],
      en: [
        'A candle records open, high, low, and close for a window. The body is the distance between open and close; the wicks are prices that traded and did not hold.',
        'A close above the open is usually drawn as an up candle; a close below as a down candle. One bar is a summary, not a signal.',
      ],
    },
    desk: {
      zh: '個股頁的日線、月線、年線，就是不同時間尺度的K線。TradingView 可看更細的分鐘線。',
      en: 'Daily, monthly, and annual charts on a name are the same idea at different scales. TradingView is for the finer session tape.',
    },
  },
  {
    id: 'volume',
    title: { en: 'Volume is participation', zh: '成交量是參與程度' },
    body: {
      zh: [
        '量代表有多少人在這個價位願意成交。價漲且量增，比較像有人願意用更高價接手；價漲但量縮，可能只是賣方暫時變少。',
        '量本身沒有方向。大量可以是急著買，也可以是急著賣。要跟價格一起看，不要單看「爆量」兩個字。',
      ],
      en: [
        'Volume is how much changed hands at that price. A lift on expanding volume looks like willing buyers. A lift on shrinking volume can just mean sellers stepped aside.',
        'Size has no sign. Heavy volume can be urgent buying or urgent selling. Read it with price, not as a headline by itself.',
      ],
    },
    desk: {
      zh: '動能轉折頁的「量能／20日」是把今天的量，對上過去約 20 個交易日的平均。',
      en: 'Volume vs 20d on Session Tape compares today’s size with the last twenty sessions.',
    },
  },
  {
    id: 'sessions',
    title: { en: 'Taiwan and U.S. sessions', zh: '台股與美股不是同一盤' },
    body: {
      zh: [
        '台股現金市場大約是台北時間 09:00–13:30；美股現金市場是紐約時間 09:30–16:00。你在台北晚上看到的美股，仍是對方的白天。',
        '台股收盤後，美股還可能大動；隔天開盤，台股常會消化過夜消息。不要用同一分鐘的感覺去比較兩個市場。',
      ],
      en: [
        'Taiwan cash hours are about 09:00–13:30 Taipei. U.S. cash hours are 09:30–16:00 New York. Evening Taipei is still the U.S. day session.',
        'The U.S. can move after Taiwan closes. The next Taipei open often digests that overnight tape. Do not compare the two markets as if they were the same minute.',
      ],
    },
    desk: {
      zh: '指揮台上方的世界時鐘，用來對時段，不是用來預測漲跌。',
      en: 'The world clocks on the command desk are for session time, not a forecast.',
    },
  },
  {
    id: 'index',
    title: { en: 'The index is the weather', zh: '指數是天氣，個股是行人' },
    body: {
      zh: [
        '指數（例如台灣的 0050、美國的 QQQ）代表一籃子股票的平均感覺。個股可以走得比指數好，也可以走得比較差。',
        '指數大漲時，很多股票會一起被帶動；指數大跌時，好公司也可能先被賣掉。這叫系統性風險，不是你看盤不認真。',
      ],
      en: [
        'An index (0050 in Taiwan, QQQ in the U.S.) is the weather for a basket. A single name can lead or lag that weather.',
        'When the index rips, many names are pulled with it. When it breaks, even a good company can be sold first. That is market risk, not a personal failing.',
      ],
    },
    desk: {
      zh: '動能轉折會把個股漲跌，拿來跟 0050 或 QQQ 比，標成領先、落後或同步。',
      en: 'Session Tape marks lead, lag, or in-line versus 0050 or QQQ.',
    },
  },
  {
    id: 'institutions',
    title: { en: 'Official chips are after the close', zh: '三大法人是盤後才公布' },
    body: {
      zh: [
        '台灣上市櫃的外資、投信、自營買賣超，是交易所在收盤後才彙整的官方數字，不是盤中誰在買的即時畫面。',
        '連買、連賣只描述最近幾天同一方向，不能告訴你「主力是誰」，也不能當成隔天開盤一定怎麼走。',
      ],
      en: [
        'Taiwan’s foreign, trust, and dealer nets are official after-close files from the exchange — not a live identity of who is in the name.',
        'A buy or sell streak describes recent direction. It does not name a “main force”, and it does not lock the next open.',
      ],
    },
    desk: {
      zh: '動能轉折的法人欄，只出現在台股，而且標的是證交所／櫃買的盤後日。美股沒有同一套檔。',
      en: 'Institution columns on Session Tape are Taiwan-only, dated to the official TWSE/TPEX session. U.S. names have no equivalent file.',
    },
  },
  {
    id: 'filings',
    title: { en: 'Public filings are delayed on purpose', zh: '公開申報不是即時跟單' },
    body: {
      zh: [
        '美國政治人物的持股異動、知名法人的 13F，都是依法事後公布。政治人物採購可能延後約 45 天；13F 是季報，季末後還有一段才看得到。',
        '你看到的是「他們曾經申報過什麼」，不是此刻他們的倉位。拿來當當日買賣清單，方向會反。',
      ],
      en: [
        'U.S. politician trades and 13F books are delayed by design. Political filings can lag by about 45 days; 13F is quarterly, then another lag after quarter-end.',
        'You are reading what was disclosed, not the live book. Copy-trading that print as a same-day ticket is reading the file backwards.',
      ],
    },
    desk: {
      zh: '公開申報頁一格一個人，點進去才看交易。這是法定公開資料，不是內線、也不是即時單。',
      en: 'Public Filings is one cell per person. Click for the delayed book. It is a public file, not a live ticket.',
    },
  },
  {
    id: 'risk',
    title: { en: 'Risk is the point', zh: '風險是這件事的一部分' },
    body: {
      zh: [
        '任何金融商品都可能讓本金變少。槓桿、期貨、短線追價，只是把同一件事放大。沒有穩賺的指標，也沒有不會錯的顧問。',
        '自選組合裡的成本與損益，是幫你看自己已經承擔了什麼，不是告訴你下一步該加多少。',
      ],
      en: [
        'Any instrument can take principal. Leverage and chase-trading only scale the same fact. No indicator is a lock, and no advisor is infallible.',
        'Cost and P&L in the book show what you already carry. They are not a size ticket for the next add.',
      ],
    },
    desk: {
      zh: '組合頁自己輸入數量與成本。顧問可以說「適合買進／減碼／觀望」，但不會教你怎麼下單。',
      en: 'The book is lots you typed in. The advisor may say add, trim, or wait — it will not teach you how to click buy.',
    },
  },
];

export const LEARN_INDICATORS: LearnLesson[] = [
  {
    id: 'tape-turns',
    title: { en: 'Session turns on this desk', zh: '本桌的轉折標籤' },
    body: {
      zh: [
        '動能轉折把同一交易日裡、每隔一段時間的快照拿來比。價格往上走且量跟著放大，標成轉強；價格往下走且量放大，標成轉弱。',
        '價漲但量沒跟上，是上攻縮量；價跌但量沒跟上，是回落縮量。幾乎沒動是持平。當天只有第一筆快照時，會標成首筆。',
        '這是在描述「這一盤目前怎麼走」，不是明天開盤的保證。收盤後若只剩一筆，本桌會改用當日漲跌與量能做較粗的判斷。',
      ],
      en: [
        'Session Tape compares snapshots inside the same cash day. Price lifting with expanding volume is Thrust. Price giving way with expanding volume is Press.',
        'A lift without volume is Fade. A drop without volume is Idle. Almost no change is Flat. The first snapshot of the day is First print.',
        'That is a read of this session, not a lock on the next open. After the close, a single print uses the day’s change and size as a coarser tell.',
      ],
    },
    desk: {
      zh: '看動能轉折頁上方的量價轉折，以及每一檔旁邊的標籤。',
      en: 'Read Tape turns at the top of Session Tape, then the badge on each row.',
    },
  },
  {
    id: 'rs',
    title: { en: 'Lead, lag, in line', zh: '領先、落後、同步' },
    body: {
      zh: [
        '把個股當天漲跌，減掉基準指數的漲跌。明顯高過指數叫領先，明顯低於指數叫落後，差不多叫同步。',
        '領先只表示「今天相對指數強」，不是永遠比較好。大盤崩的時候，領先也可能只是跌少一點。',
      ],
      en: [
        'Subtract the benchmark’s day change from the name’s day change. Clearly above the index is Lead; clearly below is Lag; close is In line.',
        'Lead means stronger than the index today — not better forever. In a break, lead can simply mean it fell less.',
      ],
    },
    desk: {
      zh: '台股對 0050，美股對 QQQ。基準當天若還沒對上，這一欄會先空白，不要硬看成同步。',
      en: 'Taiwan vs 0050, U.S. vs QQQ. If the benchmark is not on the same session yet, the cell stays empty — that is not “in line”.',
    },
  },
  {
    id: 'vol20',
    title: { en: 'Volume versus 20 days', zh: '量能對上 20 日' },
    body: {
      zh: [
        '大於 1 倍，表示今天的量高於近 20 日平均；小於 1 倍則偏安靜。盤中會依已經過了多少交易時間做粗略放大，避免一開盤就誤判爆量。',
        '量比是參與程度，要配價格與轉折一起看。',
      ],
      en: [
        'Above 1× means today is heavier than the last twenty sessions; below 1× is quiet. In session we scale by how much of the cash day has elapsed, so the open is not mistaken for a climax.',
        'The ratio is participation. Pair it with price and the turn badge.',
      ],
    },
  },
  {
    id: 'range',
    title: { en: 'Where you sit in the day’s range', zh: '當日位置' },
    body: {
      zh: [
        '當天最高到最低當成 0% 到 100%。收在偏高位置，表示買方較能守住高檔；收在偏低位置，表示賣壓較能把價格壓回去。',
        '這只描述「今天這根K線內部」的位置，不是週線或月線的位置。',
      ],
      en: [
        'Treat the session high–low as 0% to 100%. Holding near the high means buyers kept the upper tape; sitting near the low means sellers got the last word.',
        'It is the inside of today’s candle, not the week or the month.',
      ],
    },
    desk: {
      zh: '動能轉折表的「當日位置」。個股頁的高低區間是同一概念的數字版。',
      en: 'Day range on Session Tape. The high/low readout on a name is the same idea in prices.',
    },
  },
  {
    id: 'ma',
    title: { en: 'Moving averages', zh: '均線在說什麼' },
    body: {
      zh: [
        '均線把最近 N 天的收盤價平均起來，讓雜訊平滑一點。短均線比較貼近現價，長均線比較像中期水位。',
        '價格在均線之上，只表示最近一段平均來看偏多；均線本身會落後。黃金交叉、死亡交叉常被講得很神，實際上只是兩條平均線換位，不是保證。',
      ],
      en: [
        'A moving average smooths the last N closes. Short averages hug last price; longer averages are a slower waterline.',
        'Price above the average only means the recent mean is supportive. Averages lag. A golden or death cross is two averages swapping — not a lock.',
      ],
    },
    desk: {
      zh: '個股頁的 TradingView 可自行加上均線。本桌不把它當成下單指令。',
      en: 'Add averages on the TradingView chart of a name. This desk will not treat them as an order.',
    },
  },
  {
    id: 'rsi',
    title: { en: 'RSI in plain language', zh: 'RSI 用白話講' },
    body: {
      zh: [
        'RSI 看的是最近一段漲幅相對於跌幅有多強，數字大約在 0 到 100。偏高常被叫超買，偏低常被叫超賣。',
        '超買可以繼續漲，超賣可以繼續跌。它比較適合作為「這段已經走很急」的提醒，不適合作為單獨的買進或賣出理由。',
      ],
      en: [
        'RSI compares recent up-moves with down-moves, scaled roughly 0 to 100. High is often called overbought; low oversold.',
        'Overbought can keep rising. Oversold can keep falling. Treat it as “this stretch is stretched”, not as a standalone ticket.',
      ],
    },
  },
  {
    id: 'macd',
    title: { en: 'MACD in plain language', zh: 'MACD 用白話講' },
    body: {
      zh: [
        'MACD 是兩條不同速度的均線差距，再對這個差距做一次平滑。柱狀圖變大，表示短線動能相對長線在拉開；柱狀圖縮小，表示差距在收斂。',
        '交叉同樣會落後。它適合用來描述動能有沒有在換檔，不適合當成唯一依據。',
      ],
      en: [
        'MACD is the gap between two moving averages, then smoothed again. Expanding bars mean short-term pace is pulling away from the slower line; shrinking bars mean that gap is closing.',
        'Crosses lag. Use it to describe a shift in pace, not as the only evidence.',
      ],
    },
  },
  {
    id: 'fear',
    title: { en: 'Breadth and Fear & Greed', zh: '市場寬度與恐懼貪婪' },
    body: {
      zh: [
        '寬度在問：上漲的股票多，還是下跌的多。指數漲但多數股票沒漲，是少數權值股在撐；多數股票都漲，才比較像全面轉強。',
        '加密的恐懼貪婪是加密資金情緒的分數，不是台股或美股的分數。不要把三個市場的情緒混成同一個數字。',
      ],
      en: [
        'Breadth asks how many names are up versus down. An index lift with few leaders is a narrow tape. A lift with many names is broader.',
        'Crypto Fear & Greed is a crypto-positioning score, not a Taiwan or U.S. equity score. Do not mash the three markets into one number.',
      ],
    },
    desk: {
      zh: '市場情緒頁把台股、美股、加密分開標。指揮台免費帳只看月線熱門，完整寬度在 Premium。',
      en: 'Sentiment Desk labels Taiwan, U.S., and crypto separately. The free command desk is monthly names only; full breadth is Premium.',
    },
  },
  {
    id: 'together',
    title: { en: 'Read them together', zh: '幾個數字要一起看' },
    body: {
      zh: [
        '一個指標亮綠，不構成理由。比較穩的讀法是：價格方向、量、相對指數、法人（若是台股且已公布）是否大致同一個故事。',
        '故事互相打架時，先觀望比硬解讀更有用。本桌任何標籤都不是「明天一定漲」的證明。',
      ],
      en: [
        'One green badge is not a thesis. A sturdier read is whether price, volume, relative strength, and — for Taiwan after the close — official nets tell roughly the same story.',
        'When the story fights itself, waiting is more useful than forcing a read. No badge on this desk is proof of tomorrow.',
      ],
    },
    desk: {
      zh: '建議路徑：新手課 → 動能轉折 → 點進一檔看圖。顧問可以幫你整理立場，仍要自己承擔結果。',
      en: 'A useful path: Primer → Session Tape → open a name. The advisor can take a stance. The outcome is still yours.',
    },
  },
];

export function learnLessons(tab: LearnTab) {
  return tab === 'principles' ? LEARN_PRINCIPLES : LEARN_INDICATORS;
}
