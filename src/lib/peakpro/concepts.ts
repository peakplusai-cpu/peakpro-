export type ConceptMarket = 'taiwan' | 'us' | 'other';

export type LocalePair = { zh: string; en: string };

export type ConceptSupplier = {
  symbol: string;
  name: LocalePair;
  supply: LocalePair;
  market: ConceptMarket;
};

export type ConceptAnchor = {
  id: string;
  symbol: string;
  name: LocalePair;
  sector: LocalePair;
  market: 'taiwan' | 'us';
  suppliers: ConceptSupplier[];
};

function pair(zh: string, en: string): LocalePair {
  return { zh, en };
}

function link(
  symbol: string,
  nameZh: string,
  nameEn: string,
  supplyZh: string,
  supplyEn: string,
  market: ConceptMarket,
): ConceptSupplier {
  return {
    symbol,
    name: pair(nameZh, nameEn),
    supply: pair(supplyZh, supplyEn),
    market,
  };
}

export const CONCEPT_ANCHORS: ConceptAnchor[] = [
  {
    id: '2330.TW',
    symbol: '2330.TW',
    name: pair('台積電', 'TSMC'),
    sector: pair('晶圓代工', 'Foundry'),
    market: 'taiwan',
    suppliers: [
      link('6488.TWO', '環球晶', 'GlobalWafers', '矽晶圓', 'Silicon wafers', 'taiwan'),
      link('3532.TW', '台勝科', 'Taisil', '矽晶圓', 'Silicon wafers', 'taiwan'),
      link('3711.TW', '日月光投控', 'ASE Technology', '封裝測試', 'Packaging and test', 'taiwan'),
      link('3037.TW', '欣興', 'Unimicron', 'ABF 載板', 'ABF substrates', 'taiwan'),
      link('8046.TW', '南電', 'Nan Ya PCB', 'IC 載板', 'IC substrates', 'taiwan'),
      link('3653.TW', '健策', 'Jentech', '均熱片／液冷板', 'Heat spreaders / cold plates', 'taiwan'),
      link('ASML', 'ASML', 'ASML', 'EUV 曝光機', 'EUV lithography tools', 'other'),
      link('AMAT', '應用材料', 'Applied Materials', '薄膜與製程設備', 'Deposition and process tools', 'us'),
    ],
  },
  {
    id: '2317.TW',
    symbol: '2317.TW',
    name: pair('鴻海', 'Hon Hai'),
    sector: pair('電子代工', 'Electronics manufacturing'),
    market: 'taiwan',
    suppliers: [
      link('2354.TW', '鴻準', 'Foxconn Technology', '機殼與散熱', 'Casings and thermal', 'taiwan'),
      link('2308.TW', '台達電', 'Delta Electronics', '電源與散熱', 'Power and cooling', 'taiwan'),
      link('3017.TW', '奇鋐', 'Asia Vital Components', '伺服器散熱', 'Server thermal modules', 'taiwan'),
      link('2059.TW', '川湖', 'King Slide', '機櫃滑軌', 'Rack slides', 'taiwan'),
      link('3037.TW', '欣興', 'Unimicron', 'PCB／載板', 'PCB / substrates', 'taiwan'),
      link('NVDA', '輝達', 'NVIDIA', 'AI GPU（客戶／共同設計）', 'AI GPUs (customer / co-design)', 'us'),
    ],
  },
  {
    id: '2454.TW',
    symbol: '2454.TW',
    name: pair('聯發科', 'MediaTek'),
    sector: pair('IC 設計', 'IC design'),
    market: 'taiwan',
    suppliers: [
      link('2330.TW', '台積電', 'TSMC', '先進製程代工', 'Advanced foundry', 'taiwan'),
      link('3711.TW', '日月光投控', 'ASE Technology', '封裝測試', 'Packaging and test', 'taiwan'),
      link('2379.TW', '瑞昱', 'Realtek', '網通／多媒體 IC', 'Connectivity / media ICs', 'taiwan'),
      link('3034.TW', '聯詠', 'Novatek', '驅動 IC', 'Display driver ICs', 'taiwan'),
      link('QCOM', '高通', 'Qualcomm', '手機晶片同業', 'Handset-chip peer', 'us'),
      link('2337.TW', '旺宏', 'Macronix', 'NOR／ROM 記憶體', 'NOR / ROM memory', 'taiwan'),
    ],
  },
  {
    id: '2382.TW',
    symbol: '2382.TW',
    name: pair('廣達', 'Quanta'),
    sector: pair('筆電／伺服器代工', 'Notebook / server ODM'),
    market: 'taiwan',
    suppliers: [
      link('NVDA', '輝達', 'NVIDIA', 'AI GPU', 'AI GPUs', 'us'),
      link('2308.TW', '台達電', 'Delta Electronics', '電源模組', 'Power modules', 'taiwan'),
      link('3017.TW', '奇鋐', 'Asia Vital Components', '散熱模組', 'Thermal modules', 'taiwan'),
      link('3324.TW', '雙鴻', 'Auras Technology', '水冷／均熱板', 'Liquid cooling / vapor chambers', 'taiwan'),
      link('3037.TW', '欣興', 'Unimicron', '高階 PCB', 'High-end PCB', 'taiwan'),
      link('2377.TW', '微星', 'MSI', '主機板與準系統', 'Boards and barebones', 'taiwan'),
    ],
  },
  {
    id: '2308.TW',
    symbol: '2308.TW',
    name: pair('台達電', 'Delta Electronics'),
    sector: pair('電源與自動化', 'Power and automation'),
    market: 'taiwan',
    suppliers: [
      link('2327.TW', '國巨', 'Yageo', '被動元件', 'Passives', 'taiwan'),
      link('2303.TW', '聯電', 'UMC', '電源管理 IC 代工', 'PMIC foundry', 'taiwan'),
      link('2379.TW', '瑞昱', 'Realtek', '電源／網通控制 IC', 'Power / networking ICs', 'taiwan'),
      link('1504.TW', '東元', 'TECO', '馬達與工業設備', 'Motors and industrial gear', 'taiwan'),
      link('TSLA', '特斯拉', 'Tesla', 'EV 電源客戶', 'EV power customer', 'us'),
      link('NVDA', '輝達', 'NVIDIA', '資料中心電源客戶', 'Data-center power customer', 'us'),
    ],
  },
  {
    id: '2412.TW',
    symbol: '2412.TW',
    name: pair('中華電', 'Chunghwa Telecom'),
    sector: pair('電信', 'Telecom'),
    market: 'taiwan',
    suppliers: [
      link('3045.TW', '台灣大', 'Taiwan Mobile', '行動電信同業', 'Mobile-telecom peer', 'taiwan'),
      link('4904.TW', '遠傳', 'Far EasTone', '行動電信同業', 'Mobile-telecom peer', 'taiwan'),
      link('2345.TW', '智邦', 'Accton', '交換器與網通設備', 'Switches and networking gear', 'taiwan'),
      link('6285.TW', '啟碁', 'WNC', '天線與網通模組', 'Antennas and RF modules', 'taiwan'),
      link('NOK', '諾基亞', 'Nokia', '基地台設備', 'Radio access gear', 'us'),
      link('CSCO', '思科', 'Cisco', '骨幹網通設備', 'Core networking gear', 'us'),
    ],
  },
  {
    id: '2881.TW',
    symbol: '2881.TW',
    name: pair('富邦金', 'Fubon Financial'),
    sector: pair('金控', 'Financial holding'),
    market: 'taiwan',
    suppliers: [
      link('8454.TW', '富邦媒', 'momo.com', '電商關係企業', 'E-commerce affiliate', 'taiwan'),
      link('3045.TW', '台灣大', 'Taiwan Mobile', '電信關係企業', 'Telecom affiliate', 'taiwan'),
      link('2882.TW', '國泰金', 'Cathay Financial', '金控同業', 'Financial-holding peer', 'taiwan'),
      link('2891.TW', '中信金', 'CTBC Financial', '金控同業', 'Financial-holding peer', 'taiwan'),
      link('2880.TW', '華南金', 'Hua Nan Financial', '金控同業', 'Financial-holding peer', 'taiwan'),
      link('JPM', '摩根大通', 'JPMorgan', '國際金融同業', 'Global banking peer', 'us'),
    ],
  },
  {
    id: '2882.TW',
    symbol: '2882.TW',
    name: pair('國泰金', 'Cathay Financial'),
    sector: pair('金控', 'Financial holding'),
    market: 'taiwan',
    suppliers: [
      link('2881.TW', '富邦金', 'Fubon Financial', '金控同業', 'Financial-holding peer', 'taiwan'),
      link('2891.TW', '中信金', 'CTBC Financial', '金控同業', 'Financial-holding peer', 'taiwan'),
      link('2884.TW', '玉山金', 'E.SUN Financial', '金控同業', 'Financial-holding peer', 'taiwan'),
      link('2886.TW', '兆豐金', 'Mega Financial', '金控同業', 'Financial-holding peer', 'taiwan'),
      link('2633.TW', '台灣高鐵', 'THSRC', '運輸相關持股／業務', 'Transport-related name', 'taiwan'),
      link('BRK-B', '波克夏', 'Berkshire Hathaway', '大型保險同業', 'Large insurer peer', 'us'),
    ],
  },
  {
    id: '2891.TW',
    symbol: '2891.TW',
    name: pair('中信金', 'CTBC Financial'),
    sector: pair('金控', 'Financial holding'),
    market: 'taiwan',
    suppliers: [
      link('2881.TW', '富邦金', 'Fubon Financial', '金控同業', 'Financial-holding peer', 'taiwan'),
      link('2882.TW', '國泰金', 'Cathay Financial', '金控同業', 'Financial-holding peer', 'taiwan'),
      link('2886.TW', '兆豐金', 'Mega Financial', '金控同業', 'Financial-holding peer', 'taiwan'),
      link('5871.TW', '中租-KY', 'Chailease', '租賃同業', 'Leasing peer', 'taiwan'),
      link('5876.TW', '上海商銀', 'SCSB', '銀行同業', 'Banking peer', 'taiwan'),
      link('JPM', '摩根大通', 'JPMorgan', '國際銀行同業', 'Global banking peer', 'us'),
    ],
  },
  {
    id: '3711.TW',
    symbol: '3711.TW',
    name: pair('日月光投控', 'ASE Technology'),
    sector: pair('封裝測試', 'Packaging and test'),
    market: 'taiwan',
    suppliers: [
      link('2330.TW', '台積電', 'TSMC', '晶圓客戶', 'Foundry customer', 'taiwan'),
      link('2454.TW', '聯發科', 'MediaTek', 'IC 設計客戶', 'Fabless customer', 'taiwan'),
      link('3037.TW', '欣興', 'Unimicron', 'ABF 載板', 'ABF substrates', 'taiwan'),
      link('8046.TW', '南電', 'Nan Ya PCB', 'IC 載板', 'IC substrates', 'taiwan'),
      link('6239.TW', '力成', 'Powertech', '封測同業', 'OSAT peer', 'taiwan'),
      link('AMKR', 'Amkor', 'Amkor', '封測同業', 'OSAT peer', 'us'),
    ],
  },
  {
    id: '2303.TW',
    symbol: '2303.TW',
    name: pair('聯電', 'UMC'),
    sector: pair('成熟製程代工', 'Mature-node foundry'),
    market: 'taiwan',
    suppliers: [
      link('5347.TW', '世界先進', 'Vanguard', '成熟製程代工同業', 'Mature foundry peer', 'taiwan'),
      link('2330.TW', '台積電', 'TSMC', '晶圓代工同業', 'Foundry peer', 'taiwan'),
      link('3711.TW', '日月光投控', 'ASE Technology', '封裝測試', 'Packaging and test', 'taiwan'),
      link('6488.TWO', '環球晶', 'GlobalWafers', '矽晶圓', 'Silicon wafers', 'taiwan'),
      link('AMAT', '應用材料', 'Applied Materials', '製程設備', 'Process tools', 'us'),
      link('LRCX', '拉姆研究', 'Lam Research', '蝕刻設備', 'Etch tools', 'us'),
    ],
  },
  {
    id: '6669.TW',
    symbol: '6669.TW',
    name: pair('緯穎', 'Wiwynn'),
    sector: pair('雲端伺服器', 'Cloud servers'),
    market: 'taiwan',
    suppliers: [
      link('NVDA', '輝達', 'NVIDIA', 'AI GPU', 'AI GPUs', 'us'),
      link('3231.TW', '緯創', 'Wistron', '集團組裝／主機板', 'Group assembly / boards', 'taiwan'),
      link('2308.TW', '台達電', 'Delta Electronics', '電源', 'Power supplies', 'taiwan'),
      link('3017.TW', '奇鋐', 'Asia Vital Components', '散熱', 'Thermal modules', 'taiwan'),
      link('3324.TW', '雙鴻', 'Auras Technology', '水冷', 'Liquid cooling', 'taiwan'),
      link('SMCI', '超微電腦', 'Super Micro', 'AI 伺服器同業', 'AI-server peer', 'us'),
    ],
  },
  {
    id: '3231.TW',
    symbol: '3231.TW',
    name: pair('緯創', 'Wistron'),
    sector: pair('電子代工', 'Electronics manufacturing'),
    market: 'taiwan',
    suppliers: [
      link('6669.TW', '緯穎', 'Wiwynn', '雲端伺服器子公司', 'Cloud-server subsidiary', 'taiwan'),
      link('AAPL', '蘋果', 'Apple', '消費電子客戶', 'Consumer-electronics customer', 'us'),
      link('NVDA', '輝達', 'NVIDIA', 'AI 伺服器客戶', 'AI-server customer', 'us'),
      link('2308.TW', '台達電', 'Delta Electronics', '電源', 'Power supplies', 'taiwan'),
      link('2356.TW', '英業達', 'Inventec', '伺服器代工同業', 'Server ODM peer', 'taiwan'),
      link('2382.TW', '廣達', 'Quanta', '伺服器代工同業', 'Server ODM peer', 'taiwan'),
    ],
  },
  {
    id: '2345.TW',
    symbol: '2345.TW',
    name: pair('智邦', 'Accton'),
    sector: pair('網通設備', 'Networking equipment'),
    market: 'taiwan',
    suppliers: [
      link('NVDA', '輝達', 'NVIDIA', '高速交換／AI 網通', 'High-speed / AI networking', 'us'),
      link('AVGO', '博通', 'Broadcom', '交換器晶片', 'Switch silicon', 'us'),
      link('3661.TW', '世芯-KY', 'Alchip', '客製化 ASIC', 'Custom ASICs', 'taiwan'),
      link('4966.TW', '譜瑞-KY', 'Parade', '高速傳輸 IC', 'High-speed ICs', 'taiwan'),
      link('CSCO', '思科', 'Cisco', '網通設備同業／客戶', 'Networking peer / customer', 'us'),
      link('ANET', 'Arista', 'Arista', '資料中心交換同業', 'Data-center switch peer', 'us'),
    ],
  },
  {
    id: '2886.TW',
    symbol: '2886.TW',
    name: pair('兆豐金', 'Mega Financial'),
    sector: pair('金控', 'Financial holding'),
    market: 'taiwan',
    suppliers: [
      link('2881.TW', '富邦金', 'Fubon Financial', '金控同業', 'Financial-holding peer', 'taiwan'),
      link('2882.TW', '國泰金', 'Cathay Financial', '金控同業', 'Financial-holding peer', 'taiwan'),
      link('2891.TW', '中信金', 'CTBC Financial', '金控同業', 'Financial-holding peer', 'taiwan'),
      link('2834.TW', '臺企銀', 'Taiwan Business Bank', '公股銀行同業', 'Government-linked bank peer', 'taiwan'),
      link('2801.TW', '彰銀', 'Chang Hwa Bank', '公股銀行同業', 'Government-linked bank peer', 'taiwan'),
      link('JPM', '摩根大通', 'JPMorgan', '國際銀行同業', 'Global banking peer', 'us'),
    ],
  },
  {
    id: '3008.TW',
    symbol: '3008.TW',
    name: pair('大立光', 'Largan'),
    sector: pair('光學鏡頭', 'Optical lenses'),
    market: 'taiwan',
    suppliers: [
      link('AAPL', '蘋果', 'Apple', '手機鏡頭客戶', 'Handset-lens customer', 'us'),
      link('3406.TW', '玉晶光', 'Genius Electronic Optical', '鏡頭同業', 'Lens peer', 'taiwan'),
      link('3535.TW', '晶彩科', 'Favite', '光學檢測設備', 'Optical inspection gear', 'taiwan'),
      link('2474.TW', '可成', 'Catcher', '金屬機殼', 'Metal casings', 'taiwan'),
      link('2317.TW', '鴻海', 'Hon Hai', '整機組裝', 'Final assembly', 'taiwan'),
      link('QCOM', '高通', 'Qualcomm', '影像處理晶片', 'Image-signal chips', 'us'),
    ],
  },
  {
    id: '2357.TW',
    symbol: '2357.TW',
    name: pair('華碩', 'ASUS'),
    sector: pair('品牌電腦', 'PC brand'),
    market: 'taiwan',
    suppliers: [
      link('NVDA', '輝達', 'NVIDIA', '獨立顯卡 GPU', 'Discrete GPUs', 'us'),
      link('AMD', '超微', 'AMD', 'CPU／GPU', 'CPUs / GPUs', 'us'),
      link('INTC', '英特爾', 'Intel', 'CPU', 'CPUs', 'us'),
      link('2376.TW', '技嘉', 'Gigabyte', '主機板／顯卡同業', 'Board / GPU-card peer', 'taiwan'),
      link('2377.TW', '微星', 'MSI', '電競硬體同業', 'Gaming-hardware peer', 'taiwan'),
      link('2308.TW', '台達電', 'Delta Electronics', '電源供應器', 'PSUs', 'taiwan'),
    ],
  },
  {
    id: '2379.TW',
    symbol: '2379.TW',
    name: pair('瑞昱', 'Realtek'),
    sector: pair('IC 設計', 'IC design'),
    market: 'taiwan',
    suppliers: [
      link('2330.TW', '台積電', 'TSMC', '晶圓代工', 'Foundry', 'taiwan'),
      link('2303.TW', '聯電', 'UMC', '成熟製程代工', 'Mature-node foundry', 'taiwan'),
      link('3711.TW', '日月光投控', 'ASE Technology', '封裝測試', 'Packaging and test', 'taiwan'),
      link('2454.TW', '聯發科', 'MediaTek', '網通／多媒體同業', 'Connectivity / media peer', 'taiwan'),
      link('2345.TW', '智邦', 'Accton', '網通設備客戶', 'Networking customer', 'taiwan'),
      link('CSCO', '思科', 'Cisco', '網通設備客戶', 'Networking customer', 'us'),
    ],
  },
  {
    id: '3034.TW',
    symbol: '3034.TW',
    name: pair('聯詠', 'Novatek'),
    sector: pair('驅動 IC', 'Display driver ICs'),
    market: 'taiwan',
    suppliers: [
      link('2330.TW', '台積電', 'TSMC', '晶圓代工', 'Foundry', 'taiwan'),
      link('3711.TW', '日月光投控', 'ASE Technology', '封裝測試', 'Packaging and test', 'taiwan'),
      link('2409.TW', '友達', 'AUO', '面板客戶', 'Panel customer', 'taiwan'),
      link('3481.TW', '群創', 'Innolux', '面板客戶', 'Panel customer', 'taiwan'),
      link('AAPL', '蘋果', 'Apple', '消費電子客戶', 'Consumer-electronics customer', 'us'),
      link('2454.TW', '聯發科', 'MediaTek', 'IC 設計同業', 'Fabless peer', 'taiwan'),
    ],
  },
  {
    id: '2327.TW',
    symbol: '2327.TW',
    name: pair('國巨', 'Yageo'),
    sector: pair('被動元件', 'Passives'),
    market: 'taiwan',
    suppliers: [
      link('2492.TW', '華新科', 'Walsin Technology', 'MLCC 同業', 'MLCC peer', 'taiwan'),
      link('3044.TW', '健鼎', 'Tripod', 'PCB 客戶', 'PCB customer', 'taiwan'),
      link('2308.TW', '台達電', 'Delta Electronics', '電源客戶', 'Power customer', 'taiwan'),
      link('2317.TW', '鴻海', 'Hon Hai', 'EMS 客戶', 'EMS customer', 'taiwan'),
      link('AAPL', '蘋果', 'Apple', '消費電子終端', 'Consumer-electronics end demand', 'us'),
      link('TSLA', '特斯拉', 'Tesla', '車用被動元件需求', 'Auto passives demand', 'us'),
    ],
  },
  {
    id: 'NVDA',
    symbol: 'NVDA',
    name: pair('輝達', 'NVIDIA'),
    sector: pair('AI 運算', 'AI compute'),
    market: 'us',
    suppliers: [
      link('2330.TW', '台積電', 'TSMC', '先進製程與 CoWoS', 'Advanced foundry and CoWoS', 'taiwan'),
      link('000660.KS', 'SK 海力士', 'SK Hynix', 'HBM 記憶體', 'HBM memory', 'other'),
      link('AVGO', '博通', 'Broadcom', '網通與客製化晶片', 'Networking / custom silicon', 'us'),
      link('SMCI', '超微電腦', 'Super Micro', 'AI 伺服器組裝', 'AI server assembly', 'us'),
      link('2317.TW', '鴻海', 'Hon Hai', '伺服器代工', 'Server EMS', 'taiwan'),
      link('6669.TW', '緯穎', 'Wiwynn', '雲端伺服器', 'Cloud servers', 'taiwan'),
      link('ASML', 'ASML', 'ASML', 'EUV 曝光（經由晶圓廠）', 'EUV via foundries', 'other'),
    ],
  },
  {
    id: 'AAPL',
    symbol: 'AAPL',
    name: pair('蘋果', 'Apple'),
    sector: pair('消費電子', 'Consumer electronics'),
    market: 'us',
    suppliers: [
      link('2330.TW', '台積電', 'TSMC', '應用處理器代工', 'AP foundry', 'taiwan'),
      link('2317.TW', '鴻海', 'Hon Hai', '整機組裝', 'Final assembly', 'taiwan'),
      link('3008.TW', '大立光', 'Largan', '手機鏡頭', 'Handset lenses', 'taiwan'),
      link('QCOM', '高通', 'Qualcomm', '基頻／射頻', 'Modem / RF', 'us'),
      link('AVGO', '博通', 'Broadcom', '無線與客製化晶片', 'Wireless / custom chips', 'us'),
      link('SWKS', 'Skyworks', 'Skyworks', '射頻前端', 'RF front-end', 'us'),
    ],
  },
  {
    id: 'MSFT',
    symbol: 'MSFT',
    name: pair('微軟', 'Microsoft'),
    sector: pair('雲端與軟體', 'Cloud and software'),
    market: 'us',
    suppliers: [
      link('NVDA', '輝達', 'NVIDIA', '雲端 GPU', 'Cloud GPUs', 'us'),
      link('2330.TW', '台積電', 'TSMC', '自研／夥伴晶片代工', 'Custom / partner foundry', 'taiwan'),
      link('AMZN', '亞馬遜', 'Amazon', '雲端同業', 'Cloud peer', 'us'),
      link('GOOGL', 'Alphabet', 'Alphabet', '雲端同業', 'Cloud peer', 'us'),
      link('SMCI', '超微電腦', 'Super Micro', 'AI 伺服器', 'AI servers', 'us'),
      link('ORCL', '甲骨文', 'Oracle', '企業軟體／雲同業', 'Enterprise software / cloud peer', 'us'),
    ],
  },
  {
    id: 'GOOGL',
    symbol: 'GOOGL',
    name: pair('Alphabet', 'Alphabet'),
    sector: pair('搜尋與雲端', 'Search and cloud'),
    market: 'us',
    suppliers: [
      link('NVDA', '輝達', 'NVIDIA', '訓練／推論 GPU', 'Train / infer GPUs', 'us'),
      link('2330.TW', '台積電', 'TSMC', 'TPU 代工', 'TPU foundry', 'taiwan'),
      link('AVGO', '博通', 'Broadcom', '客製化加速晶片', 'Custom accelerators', 'us'),
      link('META', 'Meta', 'Meta', '廣告與內容同業', 'Ads / content peer', 'us'),
      link('MSFT', '微軟', 'Microsoft', '雲端同業', 'Cloud peer', 'us'),
      link('2317.TW', '鴻海', 'Hon Hai', '資料中心組裝', 'Data-center assembly', 'taiwan'),
    ],
  },
  {
    id: 'AMZN',
    symbol: 'AMZN',
    name: pair('亞馬遜', 'Amazon'),
    sector: pair('電商與雲端', 'Commerce and cloud'),
    market: 'us',
    suppliers: [
      link('NVDA', '輝達', 'NVIDIA', 'AWS GPU', 'AWS GPUs', 'us'),
      link('2330.TW', '台積電', 'TSMC', '自研晶片代工', 'Custom-chip foundry', 'taiwan'),
      link('MSFT', '微軟', 'Microsoft', '雲端同業', 'Cloud peer', 'us'),
      link('WMT', '沃爾瑪', 'Walmart', '零售同業', 'Retail peer', 'us'),
      link('UPS', '聯合包裹', 'UPS', '物流', 'Logistics', 'us'),
      link('6669.TW', '緯穎', 'Wiwynn', '雲端伺服器', 'Cloud servers', 'taiwan'),
    ],
  },
  {
    id: 'META',
    symbol: 'META',
    name: pair('Meta', 'Meta'),
    sector: pair('社群與廣告', 'Social and ads'),
    market: 'us',
    suppliers: [
      link('NVDA', '輝達', 'NVIDIA', 'AI 訓練 GPU', 'AI training GPUs', 'us'),
      link('2330.TW', '台積電', 'TSMC', 'MTIA／夥伴代工', 'MTIA / partner foundry', 'taiwan'),
      link('GOOGL', 'Alphabet', 'Alphabet', '數位廣告同業', 'Digital-ads peer', 'us'),
      link('AMZN', '亞馬遜', 'Amazon', '雲與廣告同業', 'Cloud / ads peer', 'us'),
      link('AVGO', '博通', 'Broadcom', '客製化加速晶片', 'Custom accelerators', 'us'),
      link('2317.TW', '鴻海', 'Hon Hai', 'XR／伺服器組裝', 'XR / server assembly', 'taiwan'),
    ],
  },
  {
    id: 'AVGO',
    symbol: 'AVGO',
    name: pair('博通', 'Broadcom'),
    sector: pair('網通與客製化晶片', 'Networking and custom silicon'),
    market: 'us',
    suppliers: [
      link('2330.TW', '台積電', 'TSMC', '先進製程代工', 'Advanced foundry', 'taiwan'),
      link('3711.TW', '日月光投控', 'ASE Technology', '封裝測試', 'Packaging and test', 'taiwan'),
      link('AAPL', '蘋果', 'Apple', '無線晶片客戶', 'Wireless-chip customer', 'us'),
      link('GOOGL', 'Alphabet', 'Alphabet', '客製化 ASIC 客戶', 'Custom-ASIC customer', 'us'),
      link('CSCO', '思科', 'Cisco', '網通晶片客戶', 'Networking-chip customer', 'us'),
      link('NVDA', '輝達', 'NVIDIA', 'AI 網通互補', 'AI networking complement', 'us'),
    ],
  },
  {
    id: 'TSLA',
    symbol: 'TSLA',
    name: pair('特斯拉', 'Tesla'),
    sector: pair('電動車', 'Electric vehicles'),
    market: 'us',
    suppliers: [
      link('NVDA', '輝達', 'NVIDIA', '自駕運算（部分車款）', 'Autonomy compute (some models)', 'us'),
      link('2330.TW', '台積電', 'TSMC', '車用／自駕晶片代工', 'Auto / FSD foundry', 'taiwan'),
      link('ALB', 'Albemarle', 'Albemarle', '鋰原料', 'Lithium', 'us'),
      link('2308.TW', '台達電', 'Delta Electronics', '電源與充電', 'Power and charging', 'taiwan'),
      link('GM', '通用汽車', 'General Motors', '車廠同業', 'Auto OEM peer', 'us'),
      link('F', '福特', 'Ford', '車廠同業', 'Auto OEM peer', 'us'),
    ],
  },
  {
    id: 'BRK-B',
    symbol: 'BRK-B',
    name: pair('波克夏', 'Berkshire Hathaway'),
    sector: pair('控股與保險', 'Holding and insurance'),
    market: 'us',
    suppliers: [
      link('AAPL', '蘋果', 'Apple', '公開持股', 'Public holding', 'us'),
      link('AXP', '美國運通', 'American Express', '公開持股', 'Public holding', 'us'),
      link('KO', '可口可樂', 'Coca-Cola', '公開持股', 'Public holding', 'us'),
      link('BAC', '美國銀行', 'Bank of America', '公開持股', 'Public holding', 'us'),
      link('OXY', '西方石油', 'Occidental', '能源持股', 'Energy holding', 'us'),
      link('CVX', '雪佛龍', 'Chevron', '能源持股', 'Energy holding', 'us'),
    ],
  },
  {
    id: 'LLY',
    symbol: 'LLY',
    name: pair('禮來', 'Eli Lilly'),
    sector: pair('製藥', 'Pharma'),
    market: 'us',
    suppliers: [
      link('TMO', '賽默飛', 'Thermo Fisher', '實驗與製程設備', 'Lab and process tools', 'us'),
      link('DHR', '丹納赫', 'Danaher', '生命科學工具', 'Life-science tools', 'us'),
      link('NVO', '諾和諾德', 'Novo Nordisk', '減重／代謝同業', 'Obesity / metabolic peer', 'us'),
      link('PFE', '輝瑞', 'Pfizer', '大型藥廠同業', 'Big-pharma peer', 'us'),
      link('JNJ', '嬌生', 'Johnson & Johnson', '大型藥廠同業', 'Big-pharma peer', 'us'),
      link('UNH', '聯合健康', 'UnitedHealth', '給付／通路', 'Payer / channel', 'us'),
    ],
  },
  {
    id: 'JPM',
    symbol: 'JPM',
    name: pair('摩根大通', 'JPMorgan'),
    sector: pair('銀行', 'Banking'),
    market: 'us',
    suppliers: [
      link('BAC', '美國銀行', 'Bank of America', '大型銀行同業', 'Large-bank peer', 'us'),
      link('GS', '高盛', 'Goldman Sachs', '投行同業', 'Investment-bank peer', 'us'),
      link('MS', '摩根士丹利', 'Morgan Stanley', '投行同業', 'Investment-bank peer', 'us'),
      link('V', 'Visa', 'Visa', '支付網路', 'Payment network', 'us'),
      link('MA', '萬事達', 'Mastercard', '支付網路', 'Payment network', 'us'),
      link('BRK-B', '波克夏', 'Berkshire Hathaway', '保險與控股同業', 'Insurance / holding peer', 'us'),
    ],
  },
  {
    id: 'WMT',
    symbol: 'WMT',
    name: pair('沃爾瑪', 'Walmart'),
    sector: pair('零售', 'Retail'),
    market: 'us',
    suppliers: [
      link('PG', '寶僑', 'Procter & Gamble', '日用品供應', 'Staples supply', 'us'),
      link('KO', '可口可樂', 'Coca-Cola', '飲料供應', 'Beverage supply', 'us'),
      link('PEP', '百事', 'PepsiCo', '飲料與零食供應', 'Beverage / snack supply', 'us'),
      link('COST', '好市多', 'Costco', '倉儲零售同業', 'Warehouse-retail peer', 'us'),
      link('TGT', '塔吉特', 'Target', '綜合零售同業', 'General-merchandise peer', 'us'),
      link('AMZN', '亞馬遜', 'Amazon', '電商同業', 'E-commerce peer', 'us'),
    ],
  },
  {
    id: 'V',
    symbol: 'V',
    name: pair('Visa', 'Visa'),
    sector: pair('支付網路', 'Payment network'),
    market: 'us',
    suppliers: [
      link('MA', '萬事達', 'Mastercard', '卡組織同業', 'Card-network peer', 'us'),
      link('AXP', '美國運通', 'American Express', '卡組織同業', 'Card-network peer', 'us'),
      link('JPM', '摩根大通', 'JPMorgan', '發卡銀行', 'Issuing bank', 'us'),
      link('PYPL', 'PayPal', 'PayPal', '數位錢包同業', 'Digital-wallet peer', 'us'),
      link('ADYEY', 'Adyen', 'Adyen', '收單／閘道', 'Acquiring / gateway', 'other'),
      link('FI', 'Fiserv', 'Fiserv', '收單與處理', 'Acquiring and processing', 'us'),
    ],
  },
  {
    id: 'XOM',
    symbol: 'XOM',
    name: pair('埃克森美孚', 'ExxonMobil'),
    sector: pair('能源', 'Energy'),
    market: 'us',
    suppliers: [
      link('SLB', 'Schlumberger', 'SLB', '油田服務', 'Oilfield services', 'us'),
      link('HAL', '哈里伯頓', 'Halliburton', '油田服務', 'Oilfield services', 'us'),
      link('BKR', '貝克休斯', 'Baker Hughes', '油田設備', 'Oilfield equipment', 'us'),
      link('CVX', '雪佛龍', 'Chevron', '國際油公司業', 'Integrated-oil peer', 'us'),
      link('COP', '康菲', 'ConocoPhillips', '上游同業', 'Upstream peer', 'us'),
      link('OXY', '西方石油', 'Occidental', '上游同業', 'Upstream peer', 'us'),
    ],
  },
  {
    id: 'ORCL',
    symbol: 'ORCL',
    name: pair('甲骨文', 'Oracle'),
    sector: pair('企業軟體與雲', 'Enterprise software and cloud'),
    market: 'us',
    suppliers: [
      link('NVDA', '輝達', 'NVIDIA', '雲端 GPU', 'Cloud GPUs', 'us'),
      link('AMZN', '亞馬遜', 'Amazon', '雲端同業', 'Cloud peer', 'us'),
      link('MSFT', '微軟', 'Microsoft', '資料庫／雲同業', 'Database / cloud peer', 'us'),
      link('CRM', 'Salesforce', 'Salesforce', '企業軟體同業', 'Enterprise-software peer', 'us'),
      link('SAP', 'SAP', 'SAP', 'ERP 同業', 'ERP peer', 'us'),
      link('2330.TW', '台積電', 'TSMC', '雲端晶片代工', 'Cloud-chip foundry', 'taiwan'),
    ],
  },
  {
    id: 'MA',
    symbol: 'MA',
    name: pair('萬事達', 'Mastercard'),
    sector: pair('支付網路', 'Payment network'),
    market: 'us',
    suppliers: [
      link('V', 'Visa', 'Visa', '卡組織同業', 'Card-network peer', 'us'),
      link('AXP', '美國運通', 'American Express', '卡組織同業', 'Card-network peer', 'us'),
      link('JPM', '摩根大通', 'JPMorgan', '發卡銀行', 'Issuing bank', 'us'),
      link('PYPL', 'PayPal', 'PayPal', '數位錢包同業', 'Digital-wallet peer', 'us'),
      link('FI', 'Fiserv', 'Fiserv', '收單與處理', 'Acquiring and processing', 'us'),
      link('GPN', 'Global Payments', 'Global Payments', '收單同業', 'Acquiring peer', 'us'),
    ],
  },
  {
    id: 'UNH',
    symbol: 'UNH',
    name: pair('聯合健康', 'UnitedHealth'),
    sector: pair('醫療保險', 'Managed care'),
    market: 'us',
    suppliers: [
      link('ELV', 'Elevance', 'Elevance Health', '醫療保險同業', 'Managed-care peer', 'us'),
      link('CVS', 'CVS Health', 'CVS Health', '保險與藥局通路', 'Payer / pharmacy channel', 'us'),
      link('CI', 'Cigna', 'Cigna', '醫療保險同業', 'Managed-care peer', 'us'),
      link('LLY', '禮來', 'Eli Lilly', '高價藥給付標的', 'High-cost drug exposure', 'us'),
      link('ISRG', '直覺外科', 'Intuitive Surgical', '手術機器人設備', 'Surgical robotics', 'us'),
      link('TMO', '賽默飛', 'Thermo Fisher', '診斷與生命科學', 'Diagnostics / life science', 'us'),
    ],
  },
  {
    id: 'COST',
    symbol: 'COST',
    name: pair('好市多', 'Costco'),
    sector: pair('倉儲零售', 'Warehouse retail'),
    market: 'us',
    suppliers: [
      link('WMT', '沃爾瑪', 'Walmart', '零售同業', 'Retail peer', 'us'),
      link('TGT', '塔吉特', 'Target', '零售同業', 'Retail peer', 'us'),
      link('PG', '寶僑', 'Procter & Gamble', '日用品供應', 'Staples supply', 'us'),
      link('KO', '可口可樂', 'Coca-Cola', '飲料供應', 'Beverage supply', 'us'),
      link('PEP', '百事', 'PepsiCo', '飲料與零食供應', 'Beverage / snack supply', 'us'),
      link('AMZN', '亞馬遜', 'Amazon', '電商同業', 'E-commerce peer', 'us'),
    ],
  },
  {
    id: 'HD',
    symbol: 'HD',
    name: pair('家得寶', 'Home Depot'),
    sector: pair('建材零售', 'Home improvement'),
    market: 'us',
    suppliers: [
      link('LOW', 'Lowe’s', 'Lowe’s', '建材零售同業', 'Home-improvement peer', 'us'),
      link('SWK', 'Stanley Black & Decker', 'Stanley Black & Decker', '工具供應', 'Tools supply', 'us'),
      link('MAS', 'Masco', 'Masco', '建材與水龍頭', 'Building products', 'us'),
      link('SHW', '宣偉', 'Sherwin-Williams', '塗料供應', 'Paint supply', 'us'),
      link('WMT', '沃爾瑪', 'Walmart', '綜合零售同業', 'General-merchandise peer', 'us'),
      link('COST', '好市多', 'Costco', '倉儲零售同業', 'Warehouse-retail peer', 'us'),
    ],
  },
  {
    id: 'PG',
    symbol: 'PG',
    name: pair('寶僑', 'Procter & Gamble'),
    sector: pair('日用品', 'Household staples'),
    market: 'us',
    suppliers: [
      link('UL', '聯合利華', 'Unilever', '日用品同業', 'Staples peer', 'us'),
      link('CL', '高露潔', 'Colgate-Palmolive', '日用品同業', 'Staples peer', 'us'),
      link('KMB', '金百利', 'Kimberly-Clark', '紙品同業', 'Tissue peer', 'us'),
      link('WMT', '沃爾瑪', 'Walmart', '零售通路', 'Retail channel', 'us'),
      link('COST', '好市多', 'Costco', '倉儲通路', 'Warehouse channel', 'us'),
      link('AMZN', '亞馬遜', 'Amazon', '電商通路', 'E-commerce channel', 'us'),
    ],
  },
];

export function conceptAnchors(market: 'taiwan' | 'us') {
  return CONCEPT_ANCHORS.filter((row) => row.market === market);
}

export function findConceptAnchor(id: string) {
  return CONCEPT_ANCHORS.find((row) => row.id === id) ?? null;
}

export function conceptDeskHref(row: { symbol: string; market: ConceptMarket }) {
  if (row.market === 'taiwan') return `/app/taiwan/${encodeURIComponent(row.symbol)}`;
  if (row.market === 'us') return `/app/us/${encodeURIComponent(row.symbol)}`;
  return null;
}

export function conceptNameForSymbol(symbol: string): LocalePair | null {
  const key = symbol.trim().toUpperCase();
  const anchor = CONCEPT_ANCHORS.find((row) => row.id.toUpperCase() === key || row.symbol.toUpperCase() === key);
  if (anchor) return anchor.name;
  for (const row of CONCEPT_ANCHORS) {
    const hit = row.suppliers.find((item) => item.symbol.toUpperCase() === key);
    if (hit) return hit.name;
  }
  return null;
}
