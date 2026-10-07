import { createHmac, timingSafeEqual } from 'crypto';

import { LEARN_QUIZ_POINTS, LEARN_QUIZ_SIZE } from '@/lib/peakpro/constants';
import { taipeiDay } from '@/lib/peakpro/advisor-quota';
import type { LocaleText, PublicQuizItem, QuizCategory, QuizWrongItem } from '@/lib/peakpro/learn-quiz-types';

export type { PublicQuizItem, QuizWrongItem } from '@/lib/peakpro/learn-quiz-types';

export type QuizQuestion = {
  id: string;
  category: QuizCategory;
  prompt: LocaleText;
  choices: [LocaleText, LocaleText, LocaleText, LocaleText];
  correct: 0 | 1 | 2 | 3;
  explain: LocaleText;
};

type TokenPayload = {
  u: string;
  d: string;
  ids: string[];
  order: number[][];
  exp: number;
};

const BANK: QuizQuestion[] = [
  {
    id: 'm-own',
    category: 'market',
    prompt: {
      zh: '買進一股，最接近下面哪一句？',
      en: 'Buying one share is closest to which idea?',
    },
    choices: [
      { zh: '買到公司的一小片所有權', en: 'A slice of ownership in the company' },
      { zh: '保證價格會往上的合約', en: 'A contract that the price must rise' },
      { zh: '向交易所借錢', en: 'A loan from the exchange' },
      { zh: '買進公司明年的營收', en: 'Buying next year’s revenue' },
    ],
    correct: 0,
    explain: {
      zh: '股票是所有權的一小片。價格是此刻成交價，不是公司成績單，更不是保證上漲的合約。',
      en: 'A share is ownership. The last print is a meeting price, not a grade and not a guarantee.',
    },
  },
  {
    id: 'm-print',
    category: 'market',
    prompt: {
      zh: '股價當下為什麼會漲？',
      en: 'Why does a last print go up in the moment?',
    },
    choices: [
      { zh: '因為公司一定變好了', en: 'Because the company must have improved' },
      { zh: '因為買方比賣方更急著成交', en: 'Because buyers are more urgent than sellers' },
      { zh: '因為成交量變少', en: 'Because volume shrank' },
      { zh: '因為指數休市', en: 'Because the index is closed' },
    ],
    correct: 1,
    explain: {
      zh: '每一筆成交都是買賣雙方同意同一個價。買的人比較急，價格容易往上；賣的人比較急，價格容易往下。',
      en: 'A print is a bid meeting an offer. Urgent buyers lift the tape; urgent sellers give it way.',
    },
  },
  {
    id: 'm-candle',
    category: 'market',
    prompt: {
      zh: '一根K線的「實體」主要在記什麼？',
      en: 'What does a candle’s body mainly record?',
    },
    choices: [
      { zh: '成交量', en: 'Volume' },
      { zh: '開盤與收盤的距離', en: 'The distance between open and close' },
      { zh: '本益比', en: 'The P/E ratio' },
      { zh: '法人身分', en: 'Who the institution was' },
    ],
    correct: 1,
    explain: {
      zh: '實體是開與收的距離；影線才是盤中曾經走到、沒守住的高與低。單根K線不是買賣訊號。',
      en: 'The body is open-to-close. Wicks are the high and low that did not hold. One bar is not a signal.',
    },
  },
  {
    id: 'm-volume',
    category: 'market',
    prompt: {
      zh: '關於成交量，哪一句最正確？',
      en: 'Which statement about volume is most true?',
    },
    choices: [
      { zh: '爆量一定是有人在買', en: 'A volume spike always means buying' },
      { zh: '量本身沒有方向，要跟價格一起看', en: 'Volume has no sign; read it with price' },
      { zh: '量小代表一定會跌', en: 'Low volume means the name must fall' },
      { zh: '量只在美股有意義', en: 'Volume only matters in the U.S.' },
    ],
    correct: 1,
    explain: {
      zh: '量大可以是急著買，也可以是急著賣。要配價格方向來看，不要單看「爆量」。',
      en: 'Heavy volume can be urgent buying or urgent selling. Pair it with price.',
    },
  },
  {
    id: 'm-session',
    category: 'market',
    prompt: {
      zh: '台股收盤時，美股通常是什麼狀態？',
      en: 'When Taiwan’s cash market closes, what is usually true of the U.S. cash tape?',
    },
    choices: [
      { zh: '也剛好收盤', en: 'It closes at the same minute' },
      { zh: '還在白天、之後仍可能大動', en: 'It is still the U.S. day and can still move a lot' },
      { zh: '已經休市一週', en: 'It has been closed for a week' },
      { zh: '只交易黃金', en: 'It only trades gold' },
    ],
    correct: 1,
    explain: {
      zh: '台股約台北 09:00–13:30；美股是紐約 09:30–16:00。台北下午到晚上，美股白天還在走，隔天開盤常會消化過夜消息。',
      en: 'Taiwan is ~09:00–13:30 Taipei; U.S. cash is 09:30–16:00 New York. Evening Taipei is still the U.S. day.',
    },
  },
  {
    id: 'm-index',
    category: 'market',
    prompt: {
      zh: '指數大跌時，好公司的股價也可能先被賣掉。這比較接近哪種風險？',
      en: 'When the index breaks, even a good company can be sold first. That is closest to:',
    },
    choices: [
      { zh: '系統性風險（市場天氣）', en: 'Market / systematic risk' },
      { zh: '一定是財報造假', en: 'Proof the accounts are false' },
      { zh: '只有台股才有', en: 'A Taiwan-only rule' },
      { zh: '均線失效', en: 'Moving averages stopping' },
    ],
    correct: 0,
    explain: {
      zh: '指數是一籃子的天氣。天氣變差時，很多股票會一起被賣，這叫系統性風險，不是你看盤不認真。',
      en: 'The index is the weather for a basket. A break can sell good names first. That is market risk.',
    },
  },
  {
    id: 'm-own2',
    category: 'market',
    prompt: {
      zh: '公司基本面很好，股價卻下跌。這可能嗎？',
      en: 'Can a healthy company still see its share price fall?',
    },
    choices: [
      { zh: '不可能，價格等於成績單', en: 'No — price is the report card' },
      { zh: '可能，利率、資金、消息、情緒都會影響成交價', en: 'Yes — rates, flows, news, and mood still set the print' },
      { zh: '只有沒掛牌才會', en: 'Only if it is unlisted' },
      { zh: '只有加密貨幣會', en: 'Only in crypto' },
    ],
    correct: 1,
    explain: {
      zh: '價格是成交價，不是公司「應該值多少」。健康的公司仍可能因利率、資金或情緒而下跌。',
      en: 'The print is not a grade. A solid business can still fall on rates, liquidity, or mood.',
    },
  },
  {
    id: 'm-wick',
    category: 'market',
    prompt: {
      zh: 'K線的上影線通常表示什麼？',
      en: 'An upper wick usually means:',
    },
    choices: [
      { zh: '盤中曾走到更高、但沒守住', en: 'Price traded higher and did not hold' },
      { zh: '法人一定在賣', en: 'Institutions must be selling' },
      { zh: '明天必跌', en: 'Tomorrow must fall' },
      { zh: '沒有成交', en: 'Nothing traded' },
    ],
    correct: 0,
    explain: {
      zh: '影線是這段時間內曾經出現、收盤沒守住的高或低。它是摘要，不是隔日保證。',
      en: 'A wick is a high or low that traded and did not hold into the close. It is a summary, not a next-day lock.',
    },
  },
  {
    id: 'i-thrust',
    category: 'indicator',
    prompt: {
      zh: '本桌「轉強」比較接近哪一種盤中狀況？',
      en: 'On this desk, Thrust is closest to:',
    },
    choices: [
      { zh: '價格往上、量也放大', en: 'Price lifting with expanding volume' },
      { zh: '價格往下、量放大', en: 'Price giving way with expanding volume' },
      { zh: '價格不動', en: 'Price unchanged' },
      { zh: '只有第一筆快照', en: 'Only the first snapshot of the day' },
    ],
    correct: 0,
    explain: {
      zh: '轉強是價上且量增。價下且量增是轉弱。價漲量沒跟上是上攻縮量。幾乎沒動是持平。',
      en: 'Thrust is a lift on expanding volume. Press is a drop on expanding volume. Fade is a lift without volume. Flat is almost no change.',
    },
  },
  {
    id: 'i-press',
    category: 'indicator',
    prompt: {
      zh: '「轉弱」比較像哪一句？',
      en: 'Press is closest to:',
    },
    choices: [
      { zh: '價跌、量縮', en: 'Price down, volume shrinking' },
      { zh: '價跌、量放大', en: 'Price down, volume expanding' },
      { zh: '價漲、量放大', en: 'Price up, volume expanding' },
      { zh: '相對指數領先', en: 'Leading the index' },
    ],
    correct: 1,
    explain: {
      zh: '轉弱是價格往下走且量跟著放大，比較像賣方變急。價跌但量沒跟上，本桌標回落縮量。',
      en: 'Press is a drop with expanding volume. A drop without volume is Idle on this desk.',
    },
  },
  {
    id: 'i-rs',
    category: 'indicator',
    prompt: {
      zh: '「領先」在本桌是怎麼來的？',
      en: 'How does this desk mark Lead?',
    },
    choices: [
      { zh: '股價創新高', en: 'A new high' },
      { zh: '當天漲跌明顯高過基準指數', en: 'The day’s change is clearly above the benchmark' },
      { zh: '法人連買', en: 'A buy streak in institutions' },
      { zh: 'RSI 低於 30', en: 'RSI under 30' },
    ],
    correct: 1,
    explain: {
      zh: '把個股當天漲跌減掉 0050 或 QQQ。明顯高過指數叫領先，明顯低於叫落後。領先只表示今天相對強，大盤崩時也可能只是跌少一點。',
      en: 'Subtract the 0050 or QQQ change. Clearly above is Lead; below is Lag. Lead is stronger today, not forever — in a break it can simply mean it fell less.',
    },
  },
  {
    id: 'i-vol20',
    category: 'indicator',
    prompt: {
      zh: '量能／20日大於 1 倍，表示什麼？',
      en: 'Volume vs 20d above 1× means:',
    },
    choices: [
      { zh: '今天的量高於近 20 個交易日平均', en: 'Today is heavier than the last twenty sessions' },
      { zh: '一定會漲', en: 'The name must rise' },
      { zh: '法人一定買超', en: 'Institutions must be net buyers' },
      { zh: 'RSI 超買', en: 'RSI is overbought' },
    ],
    correct: 0,
    explain: {
      zh: '這是參與程度，不是方向。盤中還會依已經過了多少交易時間做粗略放大，避免一開盤誤判爆量。',
      en: 'It is participation, not direction. In session we scale by elapsed cash hours so the open is not mistaken for a climax.',
    },
  },
  {
    id: 'i-range',
    category: 'indicator',
    prompt: {
      zh: '「當日位置」偏高（接近 100%）比較像？',
      en: 'A day-range position near 100% is closer to:',
    },
    choices: [
      { zh: '收在當天區間的高檔附近', en: 'Holding near the session high' },
      { zh: '收在年線低點', en: 'The yearly low' },
      { zh: '成交量為零', en: 'Zero volume' },
      { zh: '領先保證', en: 'A lock on lead' },
    ],
    correct: 0,
    explain: {
      zh: '把當天最高到最低當成 0% 到 100%。偏高表示買方較能守住高檔。這只看今天這根K線內部，不是週線位置。',
      en: 'Session high–low is 0% to 100%. Near the high means buyers kept the upper tape. It is today’s candle, not the week.',
    },
  },
  {
    id: 'i-ma',
    category: 'indicator',
    prompt: {
      zh: '均線最該被理解成什麼？',
      en: 'A moving average is best understood as:',
    },
    choices: [
      { zh: '未來價格的保證', en: 'A guarantee of future price' },
      { zh: '把最近 N 天收盤價平滑後的水位，會落後現價', en: 'A smoothed waterline of the last N closes; it lags' },
      { zh: '法人名單', en: 'A list of institutions' },
      { zh: '即時分鐘價', en: 'A live minute print' },
    ],
    correct: 1,
    explain: {
      zh: '短均線較貼近現價，長均線較像中期水位。黃金交叉只是兩條平均線換位，不是保證。',
      en: 'Short averages hug last price; longer ones are slower. A golden cross is two averages swapping, not a lock.',
    },
  },
  {
    id: 'i-rsi',
    category: 'indicator',
    prompt: {
      zh: 'RSI 被叫「超買」時，哪句較正確？',
      en: 'When RSI is called overbought, which is more accurate?',
    },
    choices: [
      { zh: '必須立刻賣出，否則必跌', en: 'You must sell or it will fall' },
      { zh: '這段已經走得偏急，但仍可能繼續漲', en: 'The stretch is stretched, but it can keep rising' },
      { zh: '公司基本面變差', en: 'The business has worsened' },
      { zh: '成交量一定為零', en: 'Volume must be zero' },
    ],
    correct: 1,
    explain: {
      zh: 'RSI 看最近漲幅相對跌幅。超買可以繼續漲，超賣可以繼續跌。它是「走很急」的提醒，不是單獨的買賣理由。',
      en: 'RSI compares recent up-moves with down-moves. Overbought can keep rising. Treat it as stretched, not as a ticket.',
    },
  },
  {
    id: 'i-macd',
    category: 'indicator',
    prompt: {
      zh: 'MACD 柱狀圖變大，比較像在說？',
      en: 'Expanding MACD bars are closer to saying:',
    },
    choices: [
      { zh: '短線動能相對長線在拉開', en: 'Short-term pace is pulling away from the slower line' },
      { zh: '明天一定漲停', en: 'A limit-up tomorrow' },
      { zh: '公開申報剛出爐', en: 'A filing just posted' },
      { zh: '沒有成交', en: 'No trades' },
    ],
    correct: 0,
    explain: {
      zh: 'MACD 是兩條均線的差距再平滑一次。柱變大是差距在拉開；縮小是在收斂。交叉同樣會落後。',
      en: 'MACD is a smoothed gap between two averages. Expanding bars mean the gap is widening. Crosses lag.',
    },
  },
  {
    id: 'i-together',
    category: 'indicator',
    prompt: {
      zh: '只用一個指標亮綠，夠不夠當理由？',
      en: 'Is one green badge enough for a thesis?',
    },
    choices: [
      { zh: '夠，單一指標不會錯', en: 'Yes — one indicator cannot be wrong' },
      { zh: '不夠，價格、量、相對強度最好大致同一個故事', en: 'No — price, volume, and relative strength should tell roughly the same story' },
      { zh: '只要 RSI 低於 30 就買', en: 'Buy whenever RSI is under 30' },
      { zh: '只要均線向上就加槓桿', en: 'Leverage whenever the average slopes up' },
    ],
    correct: 1,
    explain: {
      zh: '一個綠燈不構成理由。故事互相打架時，先觀望比硬解讀有用。本桌標籤不是明天必漲的證明。',
      en: 'One green badge is not a thesis. When the story fights itself, waiting is more useful. No badge locks tomorrow.',
    },
  },
  {
    id: 'i-first',
    category: 'indicator',
    prompt: {
      zh: '動能轉折標成「首筆」，通常代表？',
      en: 'A First print badge usually means:',
    },
    choices: [
      { zh: '這檔當天還沒有第二筆可比較的快照', en: 'There is not yet a second snapshot to compare' },
      { zh: '保證轉強', en: 'Thrust is guaranteed' },
      { zh: '法人已公布', en: 'Institutions already posted' },
      { zh: '相對指數落後', en: 'It is lagging the index' },
    ],
    correct: 0,
    explain: {
      zh: '轉折是同一交易日裡多筆快照互比。只有第一筆時，還沒辦法談轉強或轉弱。',
      en: 'Turns compare snapshots inside the same cash day. The first print has nothing yet to compare.',
    },
  },
  {
    id: 'g-inst',
    category: 'general',
    prompt: {
      zh: '台灣三大法人買賣超，什麼時候才看得到官方數字？',
      en: 'When do official Taiwan three-institution nets show up?',
    },
    choices: [
      { zh: '盤中即時、可看到是誰在買', en: 'Live in session, with names attached' },
      { zh: '收盤後由交易所彙整公布', en: 'After the close, compiled by the exchange' },
      { zh: '開盤前十分鐘', en: 'Ten minutes before the open' },
      { zh: '只在美股盤中', en: 'Only during the U.S. session' },
    ],
    correct: 1,
    explain: {
      zh: '外資、投信、自營是證交所／櫃買盤後官方檔，不是盤中主力身分。連買連賣只描述方向，不鎖隔日開盤。',
      en: 'Foreign, trust, and dealer nets are official after-close files — not a live identity. A streak is direction, not the next open.',
    },
  },
  {
    id: 'g-13f',
    category: 'general',
    prompt: {
      zh: '美國 13F 與政治人物持股申報，為什麼不能當日跟單？',
      en: 'Why are 13F and U.S. politician filings not same-day copy-trades?',
    },
    choices: [
      { zh: '因為依法是事後公布，本來就有延遲', en: 'They are delayed by design' },
      { zh: '因為他們從不交易股票', en: 'Because they never trade stocks' },
      { zh: '因為只申報台股', en: 'Because they only file Taiwan names' },
      { zh: '因為數字是即時的，怕你搶先', en: 'Because the file is live and they fear front-running' },
    ],
    correct: 0,
    explain: {
      zh: '政治人物申報可能延後約 45 天；13F 是季報，季末後還要再等。你看到的是曾經申報過什麼，不是此刻倉位。',
      en: 'Political filings can lag ~45 days; 13F is quarterly plus another lag. You are reading a disclosure, not the live book.',
    },
  },
  {
    id: 'g-risk',
    category: 'general',
    prompt: {
      zh: '關於風險，哪一句最接近本課的立場？',
      en: 'Which line is closest to this primer’s stance on risk?',
    },
    choices: [
      { zh: '選對指標就不會虧', en: 'The right indicator cannot lose' },
      { zh: '任何金融商品都可能讓本金變少', en: 'Any instrument can take principal' },
      { zh: '顧問不會錯', en: 'An advisor cannot be wrong' },
      { zh: '只有槓桿才有風險', en: 'Only leverage has risk' },
    ],
    correct: 1,
    explain: {
      zh: '槓桿只是把同一件事放大。沒有穩賺的指標，也沒有不會錯的顧問。組合損益是看你已承擔什麼，不是下單指令。',
      en: 'Leverage only scales the same fact. No indicator is a lock. Book P&L shows what you already carry, not a ticket.',
    },
  },
  {
    id: 'g-fear',
    category: 'general',
    prompt: {
      zh: '加密恐懼貪婪指數，能不能直接拿來當台股或美股的情緒？',
      en: 'Can crypto Fear & Greed be used as Taiwan or U.S. equity mood?',
    },
    choices: [
      { zh: '可以，三個市場是同一個分數', en: 'Yes — one score covers all three' },
      { zh: '不行，那是加密資金情緒，要分開看', en: 'No — it is crypto positioning; keep the markets separate' },
      { zh: '只對台股有效', en: 'Only for Taiwan' },
      { zh: '只在週日有效', en: 'Only on Sundays' },
    ],
    correct: 1,
    explain: {
      zh: '寬度問的是上漲家數。加密恐懼貪婪是加密倉位情緒。本桌把台股、美股、加密分開標，不要混成一個數字。',
      en: 'Breadth is how many names are up. Crypto Fear & Greed is a crypto score. This desk labels the three markets separately.',
    },
  },
  {
    id: 'g-bench',
    category: 'general',
    prompt: {
      zh: '本桌台股相對強度預設對哪一個基準？',
      en: 'What is the default Taiwan relative-strength benchmark on this desk?',
    },
    choices: [
      { zh: 'QQQ', en: 'QQQ' },
      { zh: '0050', en: '0050' },
      { zh: '比特幣', en: 'Bitcoin' },
      { zh: '黃金期貨', en: 'Gold futures' },
    ],
    correct: 1,
    explain: {
      zh: '台股對 0050，美股對 QQQ。基準當天若還沒對上，領先／落後會先空白，不要硬看成同步。',
      en: 'Taiwan vs 0050, U.S. vs QQQ. If the benchmark is missing for that session, the cell stays empty — that is not “in line”.',
    },
  },
  {
    id: 'g-us-inst',
    category: 'general',
    prompt: {
      zh: '美股個股在動能轉折頁，有沒有台灣那套三大法人檔？',
      en: 'Do U.S. names on Session Tape have a TWSE-style three-institution file?',
    },
    choices: [
      { zh: '有，即時顯示誰在買', en: 'Yes, live with names' },
      { zh: '沒有同一套證交所檔', en: 'No equivalent exchange file' },
      { zh: '只有科技股有', en: 'Only tech names' },
      { zh: '週末才有', en: 'Only on weekends' },
    ],
    correct: 1,
    explain: {
      zh: '三大法人是台灣上市櫃的盤後官方數字。美股沒有同一套檔，不要把 13F 當成盤中法人。',
      en: 'Three-institution nets are a Taiwan after-close file. The U.S. has no equivalent; 13F is not a live chip tape.',
    },
  },
  {
    id: 'g-copy',
    category: 'general',
    prompt: {
      zh: '在公開申報頁看到川普或某法人買了某檔，下一步最不該做的是？',
      en: 'You see a delayed Trump or 13F buy. What is the worst next step?',
    },
    choices: [
      { zh: '當成今天的即時跟單清單', en: 'Treat it as a live copy-trade list for today' },
      { zh: '先記住這是法定延遲資料', en: 'Remember the file is delayed by statute' },
      { zh: '點進去看申報內容', en: 'Open the cell and read the disclosure' },
      { zh: '對照自己的風險承受度', en: 'Check it against your own risk' },
    ],
    correct: 0,
    explain: {
      zh: '那是事後公開資料。拿來當當日買賣清單，方向會反。教育用途可以看，不是內線、也不是即時單。',
      en: 'It is a lagged public file. Using it as a same-day ticket is reading it backwards.',
    },
  },
  {
    id: 'g-advisor',
    category: 'general',
    prompt: {
      zh: '桌面顧問說「適合買進」，代表什麼？',
      en: 'If the desk advisor says “add / 適合買進”, that means:',
    },
    choices: [
      { zh: '已經幫你下好單', en: 'The order is already placed' },
      { zh: '這是立場，不是券商下單教學', en: 'It is a stance, not a broker ticket' },
      { zh: '保證獲利', en: 'Profit is guaranteed' },
      { zh: '必須全倉買進', en: 'You must go all-in' },
    ],
    correct: 1,
    explain: {
      zh: '顧問可以說適合買進／減碼／觀望，但不會教你點哪個鍵、買幾股。結果仍要自己承擔。',
      en: 'The advisor may say add, trim, or wait. It will not teach you how to click buy, and the outcome is still yours.',
    },
  },
  {
    id: 'g-cache',
    category: 'general',
    prompt: {
      zh: '想看更接近盤中的分鐘價，本課建議怎麼做？',
      en: 'For a closer minute tape, what does the primer point you to?',
    },
    choices: [
      { zh: '只看三小時快照就好，不要開圖', en: 'Only the three-hour snapshot; never open a chart' },
      { zh: '點進個股頁的即時圖', en: 'Open the live chart on the name' },
      { zh: '等三大法人盤中更新', en: 'Wait for live institution IDs' },
      { zh: '看 13F 就等於分鐘線', en: 'Treat 13F as a minute chart' },
    ],
    correct: 1,
    explain: {
      zh: '本桌多數數字大約三小時補一次。要看分鐘價，進個股或加密頁的 TradingView。',
      en: 'Most desk prints refresh about every three hours. For a minute tape, open the TradingView chart on the name.',
    },
  },
];

function secret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.CRON_SECRET?.trim() || 'peakpro-learn-quiz';
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function byId(id: string) {
  return BANK.find((row) => row.id === id) ?? null;
}

export function signQuizToken(payload: TokenPayload) {
  const json = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = createHmac('sha256', secret()).update(json).digest('base64url');
  return `${json}.${mac}`;
}

export function readQuizToken(token: string): TokenPayload | null {
  const [json, mac] = token.split('.');
  if (!json || !mac) return null;
  const expected = createHmac('sha256', secret()).update(json).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(json, 'base64url').toString('utf8')) as TokenPayload;
    if (!payload?.u || !Array.isArray(payload.ids) || payload.ids.length !== LEARN_QUIZ_SIZE) return null;
    if (payload.d !== taipeiDay()) return null;
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function startQuiz(userId: string): { token: string; questions: PublicQuizItem[] } {
  const pools: Record<QuizCategory, QuizQuestion[]> = {
    indicator: shuffle(BANK.filter((row) => row.category === 'indicator')),
    market: shuffle(BANK.filter((row) => row.category === 'market')),
    general: shuffle(BANK.filter((row) => row.category === 'general')),
  };
  const picked = shuffle([
    ...pools.indicator.slice(0, 4),
    ...pools.market.slice(0, 3),
    ...pools.general.slice(0, 3),
  ]).slice(0, LEARN_QUIZ_SIZE);

  const order = picked.map((question) => shuffle([0, 1, 2, 3]));
  const questions = picked.map((question, index) => ({
    id: question.id,
    category: question.category,
    prompt: question.prompt,
    choices: order[index].map((slot) => question.choices[slot]),
  }));

  const token = signQuizToken({
    u: userId,
    d: taipeiDay(),
    ids: picked.map((row) => row.id),
    order,
    exp: Date.now() + 2 * 60 * 60 * 1000,
  });
  return { token, questions };
}

export function gradeQuiz(
  payload: TokenPayload,
  answers: Record<string, number>,
): {
  score: number;
  total: number;
  correctCount: number;
  wrong: QuizWrongItem[];
} {
  const wrong: QuizWrongItem[] = [];
  let correctCount = 0;
  payload.ids.forEach((id, index) => {
    const question = byId(id);
    const perm = payload.order[index] ?? [0, 1, 2, 3];
    if (!question) return;
    const picked = answers[id];
    const pickedOriginal = typeof picked === 'number' ? perm[picked] : undefined;
    if (pickedOriginal === question.correct) {
      correctCount += 1;
      return;
    }
    wrong.push({
      id,
      index: index + 1,
      prompt: question.prompt,
      picked:
        typeof pickedOriginal === 'number' && pickedOriginal >= 0 && pickedOriginal <= 3
          ? question.choices[pickedOriginal]
          : null,
      correct: question.choices[question.correct],
      explain: question.explain,
    });
  });
  return {
    score: correctCount * LEARN_QUIZ_POINTS,
    total: LEARN_QUIZ_SIZE * LEARN_QUIZ_POINTS,
    correctCount,
    wrong,
  };
}
