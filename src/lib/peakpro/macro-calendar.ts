import type { DeskRegion } from '@/lib/peakpro/desk-region';
import type {
  MacroCalendarPayload,
  MacroEvent,
  MacroEventKind,
  MacroEventStatus,
  MacroFigure,
  MacroLocaleText,
} from '@/lib/peakpro/types';

export const NY_TZ = 'America/New_York';
export const FOMC_SOURCE = 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm';
export const BEA_ICS_SOURCE = 'https://www.bea.gov/news/schedule/ics/online-calendar-subscription.ics';
export const BLS_EMPSIT_SOURCE = 'https://www.bls.gov/schedule/news_release/empsit.htm';

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

type KindMeta = {
  desks: DeskRegion[];
  timezone: string;
  hour: number;
  minute: number;
  title: MacroLocaleText;
  agency: MacroLocaleText;
};

export const MACRO_KIND_META: Record<MacroEventKind, KindMeta> = {
  nfp: {
    desks: ['tw', 'us'],
    timezone: NY_TZ,
    hour: 8,
    minute: 30,
    title: { en: 'Employment Situation', zh: '非農就業與失業率' },
    agency: { en: 'BLS', zh: '美國勞工統計局' },
  },
  cpi: {
    desks: ['tw', 'us'],
    timezone: NY_TZ,
    hour: 8,
    minute: 30,
    title: { en: 'Consumer Price Index', zh: '消費者物價指數' },
    agency: { en: 'BLS', zh: '美國勞工統計局' },
  },
  pce: {
    desks: ['tw', 'us'],
    timezone: NY_TZ,
    hour: 8,
    minute: 30,
    title: { en: 'Personal Income and Outlays', zh: '個人所得與支出（PCE）' },
    agency: { en: 'BEA', zh: '美國經濟分析局' },
  },
  gdp: {
    desks: ['tw', 'us'],
    timezone: NY_TZ,
    hour: 8,
    minute: 30,
    title: { en: 'GDP Advance Estimate', zh: 'GDP 初值' },
    agency: { en: 'BEA', zh: '美國經濟分析局' },
  },
  fomc: {
    desks: ['tw', 'us'],
    timezone: NY_TZ,
    hour: 14,
    minute: 0,
    title: { en: 'FOMC decision', zh: 'FOMC 利率決議' },
    agency: { en: 'Federal Reserve', zh: '聯準會' },
  },
};

const LIVE_AFTER_MS = 20 * 60 * 1000;
const WINDOW_PAST_MS = 48 * 60 * 60 * 1000;
const WINDOW_FUTURE_MS = 28 * 24 * 60 * 60 * 1000;
const DESK_LIMIT = 8;

function zoneOffsetMs(timeZone: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcMs));
  const raw = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = raw.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/i);
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? '0');
  const sign = hours < 0 || Object.is(hours, -0) ? -1 : 1;
  return (hours * 60 + sign * minutes) * 60_000;
}

export function wallTimeIso(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): string {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);
  const first = naive - zoneOffsetMs(timeZone, naive);
  return new Date(naive - zoneOffsetMs(timeZone, first)).toISOString();
}

export function firstFriday(year: number, month: number): { year: number; month: number; day: number } {
  const weekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const day = 1 + ((5 - weekday + 7) % 7);
  return { year, month, day };
}

export function eventStatus(scheduledAt: string, nowMs = Date.now()): MacroEventStatus {
  const start = new Date(scheduledAt).getTime();
  if (!Number.isFinite(start)) return 'upcoming';
  if (nowMs < start) return 'upcoming';
  if (nowMs < start + LIVE_AFTER_MS) return 'live';
  return 'printed';
}

export function makeEventId(kind: MacroEventKind, scheduledAt: string): string {
  return `${kind}-${scheduledAt.slice(0, 10)}`;
}

export function buildEvent(
  kind: MacroEventKind,
  scheduledAt: string,
  extra?: Partial<Pick<MacroEvent, 'sourceUrl' | 'previous' | 'actual' | 'status'>>,
): MacroEvent {
  const meta = MACRO_KIND_META[kind];
  return {
    id: makeEventId(kind, scheduledAt),
    kind,
    desks: [...meta.desks],
    title: meta.title,
    agency: meta.agency,
    timezone: meta.timezone,
    scheduledAt,
    status: extra?.status ?? eventStatus(scheduledAt),
    previous: extra?.previous ?? [],
    actual: extra?.actual ?? [],
    sourceUrl: extra?.sourceUrl ?? null,
  };
}

export function monthNumber(name: string): number | null {
  const key = name.trim().toLowerCase();
  return MONTHS[key] ?? null;
}

export function eventsForDesk(payload: MacroCalendarPayload | null | undefined, desk: DeskRegion): MacroEvent[] {
  return windowEvents((payload?.events ?? []).filter((event) => event.desks.includes(desk)));
}

export function calendarNeedsPrintRefresh(
  payload: MacroCalendarPayload | null | undefined,
  nowMs = Date.now(),
): boolean {
  return (payload?.events ?? []).some((event) => {
    const start = new Date(event.scheduledAt).getTime();
    if (!Number.isFinite(start)) return false;
    const status = eventStatus(event.scheduledAt, nowMs);
    if (status === 'live') return true;
    if (status === 'upcoming' && start - nowMs > 0 && start - nowMs < 2 * 60 * 60 * 1000) return true;
    if (
      (event.kind === 'nfp' || event.kind === 'cpi') &&
      status === 'printed' &&
      event.actual.length === 0 &&
      nowMs - start < 36 * 60 * 60 * 1000
    ) {
      return true;
    }
    return false;
  });
}

export function windowEvents(events: MacroEvent[], nowMs = Date.now()): MacroEvent[] {
  const start = nowMs - WINDOW_PAST_MS;
  const end = nowMs + WINDOW_FUTURE_MS;
  const seen = new Set<string>();
  return events
    .filter((event) => {
      const at = new Date(event.scheduledAt).getTime();
      return Number.isFinite(at) && at >= start && at <= end;
    })
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt) || a.kind.localeCompare(b.kind))
    .filter((event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    })
    .slice(0, DESK_LIMIT);
}

export function isMacroCalendarPayload(value: unknown): value is MacroCalendarPayload {
  if (!value || typeof value !== 'object') return false;
  const row = value as MacroCalendarPayload;
  return typeof row.asOf === 'string' && Array.isArray(row.events);
}

export function calendarFromRow(payload: unknown): MacroCalendarPayload | null {
  return isMacroCalendarPayload(payload) ? payload : null;
}

function figureLine(figures: MacroFigure[]): string {
  return figures.map((row) => `${row.label.en} ${row.value}`).join('; ') || 'n/a';
}

export function formatAdvisorCalendar(payload: MacroCalendarPayload | null | undefined, desk: DeskRegion): string {
  const events = eventsForDesk(payload, desk);
  if (events.length === 0) return 'SESSION_CALENDAR: none in this window';
  const lines = events.map((event) => {
    const stamp = event.scheduledAt;
    const prior = event.previous.length ? ` previous=${figureLine(event.previous)}` : '';
    const actual = event.actual.length ? ` actual=${figureLine(event.actual)}` : '';
    return `- ${stamp} ${event.kind} ${event.status}${prior}${actual}`;
  });
  return [
    'SESSION_CALENDAR: high-impact official prints only. No consensus forecast on this desk.',
    ...lines,
  ].join('\n');
}

export function formatNfpChange(thousands: number): string {
  const rounded = Math.round(thousands);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toLocaleString('en-US')}k`;
}

export function formatPctPoint(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function formatSignedPct(value: number, digits = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}
