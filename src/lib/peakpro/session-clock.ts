import { isTaiwanSymbol } from '@/lib/peakpro/yahoo';

export type TapeMarket = 'taiwan' | 'us';

const TW_OPEN = 9 * 60;
const TW_CLOSE = 13 * 60 + 30;
const US_OPEN = 9 * 60 + 30;
const US_CLOSE = 16 * 60;

function zonedParts(at: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    weekday: parts.weekday,
  };
}

export function tapeMarketFor(symbol: string): TapeMarket {
  return isTaiwanSymbol(symbol) ? 'taiwan' : 'us';
}

export function marketTimeZone(market: TapeMarket) {
  return market === 'taiwan' ? 'Asia/Taipei' : 'America/New_York';
}

export function marketCalendarDate(at: Date, market: TapeMarket) {
  return zonedParts(at, marketTimeZone(market)).date;
}

export function sessionWindow(market: TapeMarket) {
  return market === 'taiwan'
    ? { open: TW_OPEN, close: TW_CLOSE, span: TW_CLOSE - TW_OPEN }
    : { open: US_OPEN, close: US_CLOSE, span: US_CLOSE - US_OPEN };
}

/** 0 before the open, 1 after the close, otherwise elapsed fraction of the cash session. */
export function sessionElapsed(at: Date, market: TapeMarket) {
  const { minutes } = zonedParts(at, marketTimeZone(market));
  const { open, close, span } = sessionWindow(market);
  if (minutes <= open) return 0;
  if (minutes >= close) return 1;
  return (minutes - open) / span;
}

export function isWeekendInMarket(at: Date, market: TapeMarket) {
  const { weekday } = zonedParts(at, marketTimeZone(market));
  return weekday === 'Sat' || weekday === 'Sun';
}

export function taipeiCalendarDate(at = new Date()) {
  return marketCalendarDate(at, 'taiwan');
}

/** Last weekday session that has actually started (or last Friday on a weekend). */
export function activeSessionDate(at: Date, market: TapeMarket) {
  const { minutes, weekday } = zonedParts(at, marketTimeZone(market));
  const { open } = sessionWindow(market);
  if (weekday !== 'Sat' && weekday !== 'Sun' && minutes >= open) {
    return marketCalendarDate(at, market);
  }
  let cursor = new Date(at.getTime());
  for (let i = 0; i < 8; i += 1) {
    cursor = new Date(cursor.getTime() - 86_400_000);
    const part = zonedParts(cursor, marketTimeZone(market));
    if (part.weekday !== 'Sat' && part.weekday !== 'Sun') return part.date;
  }
  return marketCalendarDate(at, market);
}

export function previousCalendarDates(from: string, count: number) {
  const dates: string[] = [];
  const cursor = new Date(`${from}T12:00:00+08:00`);
  for (let i = 0; i < count; i += 1) {
    const y = cursor.getUTCFullYear();
    const m = String(cursor.getUTCMonth() + 1).padStart(2, '0');
    const d = String(cursor.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return dates;
}

export function toRocSlashDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return '';
  return `${year - 1911}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}
