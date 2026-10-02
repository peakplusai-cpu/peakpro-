import { EQUITY_UNIVERSE, TAPE_TW_BENCH, TAPE_US_BENCH } from '@/lib/peakpro/constants';
import { marketCalendarDate, sessionElapsed, tapeMarketFor, type TapeMarket } from '@/lib/peakpro/session-clock';
import type { OhlcBar } from '@/lib/peakpro/types';

export type TapeTurn = 'thrust' | 'fade' | 'press' | 'idle' | 'first' | 'flat';
export type TapeRs = 'lead' | 'lag' | 'inline';

export type SessionPrint = {
  symbol: string;
  name: string;
  market: TapeMarket;
  session_date: string;
  scraped_at: string;
  price: number | null;
  change_pct: number | null;
  volume: number | null;
  day_open: number | null;
  day_high: number | null;
  day_low: number | null;
  prev_close: number | null;
  currency: 'TWD' | 'USD';
};

export type InstitutionalPrint = {
  trade_date: string;
  symbol: string;
  name: string;
  foreign_net: number;
  trust_net: number;
  dealer_net: number;
  total_net: number;
  source: string;
};

export type TapeInst = {
  date: string;
  foreignNet: number;
  trustNet: number;
  dealerNet: number;
  totalNet: number;
  streak: number;
};

export type TapeRow = {
  symbol: string;
  name: string;
  market: TapeMarket;
  inBook: boolean;
  inDesk: boolean;
  currency: 'TWD' | 'USD';
  last: number | null;
  changePct: number | null;
  volume: number | null;
  volumeRatio: number | null;
  rangePos: number | null;
  turn: TapeTurn;
  rs: TapeRs;
  rsPct: number | null;
  benchmark: string;
  prints: number;
  scrapedAt: string | null;
  path: Array<{ t: string; c: number }>;
  inst: TapeInst | null;
};

export type TapeDesk = {
  asOf: string | null;
  twDate: string;
  usDate: string;
  instDate: string | null;
  benches: {
    taiwan: { symbol: string; changePct: number | null };
    us: { symbol: string; changePct: number | null };
  };
  rows: TapeRow[];
  summary: {
    twLead: number;
    twLag: number;
    usLead: number;
    usLag: number;
    bookThrust: number;
    bookPress: number;
  };
};

const DESK = new Set<string>(EQUITY_UNIVERSE.map((row) => row.symbol));

export function classifyTurn(prev: SessionPrint | undefined, last: SessionPrint | undefined): TapeTurn {
  if (!last) return 'flat';
  if (!prev || prev.session_date !== last.session_date) return 'first';
  const dChg = (last.change_pct ?? 0) - (prev.change_pct ?? 0);
  const volGrow =
    last.volume != null && prev.volume != null && prev.volume > 0 && last.volume > prev.volume * 1.06;
  if (Math.abs(dChg) < 0.12) return 'flat';
  if (dChg >= 0.12) return volGrow ? 'thrust' : 'fade';
  return volGrow ? 'press' : 'idle';
}

export function classifyRs(changePct: number | null, benchPct: number | null): { rs: TapeRs; rsPct: number | null } {
  if (changePct == null || benchPct == null) return { rs: 'inline', rsPct: null };
  const rsPct = changePct - benchPct;
  if (rsPct > 0.4) return { rs: 'lead', rsPct };
  if (rsPct < -0.4) return { rs: 'lag', rsPct };
  return { rs: 'inline', rsPct };
}

export function averagePriorVolume(bars: OhlcBar[], sessionDate: string, lookback = 20) {
  const prior = bars.filter((bar) => bar.t < sessionDate && typeof bar.v === 'number' && (bar.v ?? 0) > 0);
  const window = prior.slice(-lookback);
  if (window.length < 5) return null;
  const sum = window.reduce((acc, bar) => acc + (bar.v ?? 0), 0);
  return sum / window.length;
}

export function volumeRatio(today: number | null, avg20: number | null, elapsed: number) {
  if (today == null || avg20 == null || avg20 <= 0) return null;
  const fraction = Math.min(1, Math.max(elapsed, 0.12));
  return today / (avg20 * fraction);
}

export function rangePosition(price: number | null, low: number | null, high: number | null) {
  if (price == null || low == null || high == null) return null;
  const span = high - low;
  if (span <= 0) return 0.5;
  return Math.min(1, Math.max(0, (price - low) / span));
}

export function institutionalStreak(history: InstitutionalPrint[]) {
  if (history.length === 0) return { latest: null as InstitutionalPrint | null, streak: 0 };
  const ordered = [...history].sort((a, b) => (a.trade_date < b.trade_date ? 1 : -1));
  const latest = ordered[0];
  if (!latest || latest.total_net === 0) return { latest, streak: 0 };
  const sign = latest.total_net > 0 ? 1 : -1;
  let streak = 0;
  for (const row of ordered) {
    if (row.total_net === 0 || Math.sign(row.total_net) !== sign) break;
    streak += sign;
  }
  return { latest, streak };
}

export function latestPrintsForDate(prints: SessionPrint[], sessionDate: string) {
  const bySymbol = new Map<string, SessionPrint[]>();
  for (const print of prints) {
    if (print.session_date !== sessionDate) continue;
    const list = bySymbol.get(print.symbol) ?? [];
    list.push(print);
    bySymbol.set(print.symbol, list);
  }
  for (const list of bySymbol.values()) {
    list.sort((a, b) => a.scraped_at.localeCompare(b.scraped_at));
  }
  return bySymbol;
}

export function buildTapeDesk(input: {
  now?: Date;
  prints: SessionPrint[];
  institutional: InstitutionalPrint[];
  dailyBars: Map<string, { name: string; bars: OhlcBar[] }>;
  bookSymbols: string[];
  extraSymbols?: string[];
}): TapeDesk {
  const now = input.now ?? new Date();
  const twDate = marketCalendarDate(now, 'taiwan');
  const usDate = marketCalendarDate(now, 'us');
  const book = new Set(input.bookSymbols);
  const wanted = new Set<string>([
    ...EQUITY_UNIVERSE.map((row) => row.symbol),
    ...input.bookSymbols,
    ...(input.extraSymbols ?? []),
  ]);

  const twPrints = latestPrintsForDate(input.prints, twDate);
  const usPrints = latestPrintsForDate(input.prints, usDate);
  const twBench = twPrints.get(TAPE_TW_BENCH)?.at(-1) ?? null;
  const usBench = usPrints.get(TAPE_US_BENCH)?.at(-1) ?? null;

  const instBySymbol = new Map<string, InstitutionalPrint[]>();
  for (const row of input.institutional) {
    const list = instBySymbol.get(row.symbol) ?? [];
    list.push(row);
    instBySymbol.set(row.symbol, list);
  }

  const rows: TapeRow[] = [];
  for (const symbol of wanted) {
    if (symbol === TAPE_TW_BENCH || symbol === TAPE_US_BENCH) continue;
    const market = tapeMarketFor(symbol);
    const sessionDate = market === 'taiwan' ? twDate : usDate;
    const session = (market === 'taiwan' ? twPrints : usPrints).get(symbol) ?? [];
    const last = session.at(-1);
    const prev = session.length > 1 ? session.at(-2) : undefined;
    const daily = input.dailyBars.get(symbol);
    const elapsed = last ? sessionElapsed(new Date(last.scraped_at), market) : sessionElapsed(now, market);
    const avg20 = daily ? averagePriorVolume(daily.bars, sessionDate) : null;
    const bench = market === 'taiwan' ? twBench : usBench;
    const changePct = last?.change_pct ?? null;
    const rs = classifyRs(changePct, bench?.change_pct ?? null);
    const instPack = market === 'taiwan' ? institutionalStreak(instBySymbol.get(symbol) ?? []) : { latest: null, streak: 0 };
    const inst = instPack.latest
      ? {
          date: instPack.latest.trade_date,
          foreignNet: instPack.latest.foreign_net,
          trustNet: instPack.latest.trust_net,
          dealerNet: instPack.latest.dealer_net,
          totalNet: instPack.latest.total_net,
          streak: instPack.streak,
        }
      : null;

    rows.push({
      symbol,
      name: last?.name || daily?.name || symbol,
      market,
      inBook: book.has(symbol),
      inDesk: DESK.has(symbol),
      currency: last?.currency ?? (market === 'taiwan' ? 'TWD' : 'USD'),
      last: last?.price ?? null,
      changePct,
      volume: last?.volume ?? null,
      volumeRatio: volumeRatio(last?.volume ?? null, avg20, elapsed),
      rangePos: rangePosition(last?.price ?? null, last?.day_low ?? null, last?.day_high ?? null),
      turn: classifyTurn(prev, last),
      rs: rs.rs,
      rsPct: rs.rsPct,
      benchmark: market === 'taiwan' ? TAPE_TW_BENCH : TAPE_US_BENCH,
      prints: session.length,
      scrapedAt: last?.scraped_at ?? null,
      path: session
        .filter((print) => print.price != null)
        .map((print) => ({ t: print.scraped_at, c: print.price as number })),
      inst,
    });
  }

  rows.sort((a, b) => {
    if (a.inBook !== b.inBook) return a.inBook ? -1 : 1;
    if (a.market !== b.market) return a.market === 'taiwan' ? -1 : 1;
    return (b.changePct ?? -999) - (a.changePct ?? -999);
  });

  const tw = rows.filter((row) => row.market === 'taiwan');
  const us = rows.filter((row) => row.market === 'us');
  const bookRows = rows.filter((row) => row.inBook);
  const stamps = rows.map((row) => row.scrapedAt).filter((value): value is string => Boolean(value));
  const instDates = rows.map((row) => row.inst?.date).filter((value): value is string => Boolean(value));

  return {
    asOf: stamps.sort().at(-1) ?? null,
    twDate,
    usDate,
    instDate: instDates.sort().at(-1) ?? null,
    benches: {
      taiwan: { symbol: TAPE_TW_BENCH, changePct: twBench?.change_pct ?? null },
      us: { symbol: TAPE_US_BENCH, changePct: usBench?.change_pct ?? null },
    },
    rows,
    summary: {
      twLead: tw.filter((row) => row.rs === 'lead').length,
      twLag: tw.filter((row) => row.rs === 'lag').length,
      usLead: us.filter((row) => row.rs === 'lead').length,
      usLag: us.filter((row) => row.rs === 'lag').length,
      bookThrust: bookRows.filter((row) => row.turn === 'thrust').length,
      bookPress: bookRows.filter((row) => row.turn === 'press').length,
    },
  };
}

export function formatAdvisorTape(desk: TapeDesk) {
  const lines = desk.rows.slice(0, 20).map((row) => {
    const inst =
      row.inst != null
        ? ` inst_total=${row.inst.totalNet} streak=${row.inst.streak} (${row.inst.date})`
        : row.market === 'taiwan'
          ? ' inst=pending'
          : ' inst=n/a';
    return `${row.symbol} ${row.name}: chg=${row.changePct ?? 'n/a'} turn=${row.turn} rs=${row.rs} vs ${row.benchmark}${inst}`;
  });
  return [
    `SESSION_TAPE as_of=${desk.asOf ?? 'none'} tw=${desk.twDate} us=${desk.usDate} inst=${desk.instDate ?? 'none'}`,
    'Volume-price turns from 3-hour snapshots. Institutional numbers are official TWSE/TPEX after the close — not live chip data, not main-force identity.',
    lines.length ? lines.join('\n') : '(no session prints yet)',
  ].join('\n');
}
