import {
  BEA_ICS_SOURCE,
  BLS_EMPSIT_SOURCE,
  FOMC_SOURCE,
  MACRO_KIND_META,
  NY_TZ,
  buildEvent,
  eventStatus,
  firstFriday,
  formatNfpChange,
  formatPctPoint,
  formatSignedPct,
  monthNumber,
  wallTimeIso,
  windowEvents,
  mergeCalendarReports,
} from '@/lib/peakpro/macro-calendar';
import type { MacroCalendarPayload, MacroEvent, MacroEventKind, MacroFigure } from '@/lib/peakpro/types';

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const BLS_SERIES = {
  payrolls: 'CES0000000001',
  unemployment: 'LNS14000000',
  cpi: 'CUSR0000SA0',
} as const;

type BlsPoint = { year: number; month: number; value: number };

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        Accept: 'text/html,text/calendar,application/json',
        'User-Agent': BROWSER_UA,
      },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch (error) {
    console.warn('[peakpro/calendar] fetch failed', url, error);
    return null;
  }
}

function lastDayFromRange(raw: string): number | null {
  const matches = raw.match(/\d{1,2}/g);
  if (!matches?.length) return null;
  const day = Number(matches.at(-1));
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
}

function parseFomcHtml(html: string): MacroEvent[] {
  const events: MacroEvent[] = [];
  const sections = html.split(/(\d{4})\s+FOMC Meetings/i);
  for (let i = 1; i < sections.length; i += 2) {
    const year = Number(sections[i]);
    const body = sections[i + 1] ?? '';
    const rows = body.split(/<div class="[^"]*\brow\b[^"]*\bfomc-meeting\b(?!__)[^"]*"/i).slice(1);
    for (const row of rows) {
      if (/notation vote/i.test(row)) continue;
      const monthMatch =
        row.match(/fomc-meeting__month[^>]*>\s*<strong>\s*([A-Za-z]+)\s*<\/strong>/i) ??
        row.match(/<strong>\s*([A-Za-z]+)\s*<\/strong>/i);
      const dateMatch = row.match(/fomc-meeting__date[^>]*>\s*([^<]+)/i);
      const month = monthMatch ? monthNumber(monthMatch[1] ?? '') : null;
      const day = dateMatch ? lastDayFromRange(dateMatch[1] ?? '') : null;
      if (!month || !day || !Number.isFinite(year)) continue;
      const meta = MACRO_KIND_META.fomc;
      const scheduledAt = wallTimeIso(NY_TZ, year, month, day, meta.hour, meta.minute);
      const htmlLink = row.match(/href="(\/newsevents\/pressreleases\/monetary\d+a\.htm)"/i)?.[1];
      events.push(
        buildEvent('fomc', scheduledAt, {
          sourceUrl: htmlLink ? `https://www.federalreserve.gov${htmlLink}` : FOMC_SOURCE,
        }),
      );
    }
  }
  return events;
}

function unfoldIcs(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

function icsKind(summary: string): MacroEventKind | null {
  const title = summary.replace(/\\,/g, ',').replace(/\s+/g, ' ');
  if (/GDP\s*\(Advance Estimate\)/i.test(title)) return 'gdp';
  if (
    /Gross Domestic Product/i.test(title) &&
    /\(Advance Estimate\)/i.test(title) &&
    !/by State/i.test(title)
  ) {
    return 'gdp';
  }
  if (/Personal Income and Outlays/i.test(title)) return 'pce';
  return null;
}

function icsInstant(raw: string): string | null {
  const match = raw.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}.000Z`;
}

function parseBeaIcs(ics: string): MacroEvent[] {
  const events: MacroEvent[] = [];
  const blocks = unfoldIcs(ics).split(/BEGIN:VEVENT/i).slice(1);
  for (const block of blocks) {
    const summary = block.match(/SUMMARY:(.+)/i)?.[1]?.trim();
    const start = block.match(/DTSTART[^:]*:(.+)/i)?.[1]?.trim();
    if (!summary || !start) continue;
    const kind = icsKind(summary);
    const scheduledAt = icsInstant(start);
    if (!kind || !scheduledAt) continue;
    events.push(buildEvent(kind, scheduledAt, { sourceUrl: 'https://www.bea.gov/news/schedule' }));
  }
  return events;
}

function blsMonthScheduleUrl(year: number, month: number): string {
  return `https://www.bls.gov/schedule/${year}/${String(month).padStart(2, '0')}_sched.htm`;
}

function nearbyBlsMonths(now: Date): Array<{ year: number; month: number }> {
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const months: Array<{ year: number; month: number }> = [];
  for (let i = 0; i < 4; i += 1) {
    months.push({ year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() + 1 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

function parseBlsMonthHtml(html: string, year: number, sourceUrl: string): MacroEvent[] {
  const events: MacroEvent[] = [];
  const re = /<td id="d(\d{2})(\d{2})"[^>]*>([\s\S]*?)<\/td>/gi;
  for (const match of html.matchAll(re)) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 31) {
      continue;
    }
    const text = (match[3] ?? '').replace(/<[^>]+>/g, ' ');
    const kinds: MacroEventKind[] = [];
    if (/Employment Situation/i.test(text)) kinds.push('nfp');
    if (/Consumer Price Index/i.test(text)) kinds.push('cpi');
    for (const kind of kinds) {
      const meta = MACRO_KIND_META[kind];
      events.push(
        buildEvent(kind, wallTimeIso(meta.timezone, year, month, day, meta.hour, meta.minute), { sourceUrl }),
      );
    }
  }
  return events;
}

function nfpConventionEvents(now = new Date()): MacroEvent[] {
  const meta = MACRO_KIND_META.nfp;
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const events: MacroEvent[] = [];
  for (let i = 0; i < 6; i += 1) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    const friday = firstFriday(year, month);
    events.push(
      buildEvent(
        'nfp',
        wallTimeIso(meta.timezone, friday.year, friday.month, friday.day, meta.hour, meta.minute),
        { sourceUrl: BLS_EMPSIT_SOURCE },
      ),
    );
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return events;
}

function parseBlsSeries(raw: unknown): BlsPoint[] {
  if (!raw || typeof raw !== 'object') return [];
  const data = (raw as { data?: Array<Record<string, string>> }).data ?? [];
  return data
    .map((row) => {
      const year = Number(row.year);
      const month = Number(String(row.period ?? '').replace(/^M/i, ''));
      const value = Number(row.value);
      if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12 || !Number.isFinite(value)) {
        return null;
      }
      return { year, month, value };
    })
    .filter((row): row is BlsPoint => Boolean(row))
    .sort((a, b) => a.year - b.year || a.month - b.month);
}

function pointAt(series: BlsPoint[], year: number, month: number): BlsPoint | null {
  return series.find((row) => row.year === year && row.month === month) ?? null;
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function referenceMonth(scheduledAt: string): { year: number; month: number } {
  const date = new Date(scheduledAt);
  return shiftMonth(date.getUTCFullYear(), date.getUTCMonth() + 1, -1);
}

function nfpFigures(series: Record<string, BlsPoint[]>, year: number, month: number): MacroFigure[] {
  const jobs = pointAt(series[BLS_SERIES.payrolls] ?? [], year, month);
  const priorJobs = pointAt(series[BLS_SERIES.payrolls] ?? [], ...tuple(shiftMonth(year, month, -1)));
  const jobless = pointAt(series[BLS_SERIES.unemployment] ?? [], year, month);
  const figures: MacroFigure[] = [];
  if (jobs && priorJobs) {
    figures.push({
      label: { en: 'Payrolls', zh: '非農就業' },
      value: formatNfpChange(jobs.value - priorJobs.value),
    });
  }
  if (jobless) {
    figures.push({
      label: { en: 'Unemployment', zh: '失業率' },
      value: formatPctPoint(jobless.value),
    });
  }
  return figures;
}

function tuple(row: { year: number; month: number }): [number, number] {
  return [row.year, row.month];
}

function cpiFigures(series: Record<string, BlsPoint[]>, year: number, month: number): MacroFigure[] {
  const now = pointAt(series[BLS_SERIES.cpi] ?? [], year, month);
  const yearAgo = pointAt(series[BLS_SERIES.cpi] ?? [], ...tuple(shiftMonth(year, month, -12)));
  const prior = pointAt(series[BLS_SERIES.cpi] ?? [], ...tuple(shiftMonth(year, month, -1)));
  const figures: MacroFigure[] = [];
  if (now && yearAgo && yearAgo.value !== 0) {
    figures.push({
      label: { en: 'CPI YoY', zh: 'CPI 年增' },
      value: formatSignedPct(((now.value - yearAgo.value) / yearAgo.value) * 100),
    });
  }
  if (now && prior && prior.value !== 0) {
    figures.push({
      label: { en: 'CPI MoM', zh: 'CPI 月增' },
      value: formatSignedPct(((now.value - prior.value) / prior.value) * 100),
    });
  }
  return figures;
}

async function blsSeriesMap(): Promise<Record<string, BlsPoint[]>> {
  try {
    const year = new Date().getUTCFullYear();
    const response = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'User-Agent': BROWSER_UA },
      body: JSON.stringify({
        seriesid: Object.values(BLS_SERIES),
        startyear: String(year - 1),
        endyear: String(year),
      }),
    });
    if (!response.ok) return {};
    const json = (await response.json()) as {
      Results?: { series?: Array<{ seriesID?: string; data?: Array<Record<string, string>> }> };
    };
    const map: Record<string, BlsPoint[]> = {};
    for (const row of json.Results?.series ?? []) {
      if (row.seriesID) map[row.seriesID] = parseBlsSeries(row);
    }
    return map;
  } catch (error) {
    console.warn('[peakpro/calendar] BLS actuals skipped', error);
    return {};
  }
}

function attachPrints(event: MacroEvent, series: Record<string, BlsPoint[]>, nowMs: number): MacroEvent {
  const status = eventStatus(event.scheduledAt, nowMs);
  const ref = referenceMonth(event.scheduledAt);
  const priorRef = shiftMonth(ref.year, ref.month, -1);
  let previous: MacroFigure[] = event.previous;
  let actual: MacroFigure[] = event.actual;
  if (event.kind === 'nfp') {
    const priorPrint = nfpFigures(series, priorRef.year, priorRef.month);
    if (priorPrint.length) previous = priorPrint;
    if (status === 'printed' || status === 'live') {
      const print = nfpFigures(series, ref.year, ref.month);
      if (print.length) actual = print;
    }
  }
  if (event.kind === 'cpi') {
    const priorPrint = cpiFigures(series, priorRef.year, priorRef.month);
    if (priorPrint.length) previous = priorPrint;
    if (status === 'printed' || status === 'live') {
      const print = cpiFigures(series, ref.year, ref.month);
      if (print.length) actual = print;
    }
  }
  return { ...event, status, previous, actual: status === 'upcoming' ? [] : actual };
}

export async function harvestMacroCalendar(prior?: MacroCalendarPayload | null): Promise<MacroCalendarPayload> {
  const nowMs = Date.now();
  const blsMonths = nearbyBlsMonths(new Date(nowMs));
  const [fomcHtml, beaIcs, series, blsHtml] = await Promise.all([
    fetchText(FOMC_SOURCE),
    fetchText(BEA_ICS_SOURCE),
    blsSeriesMap(),
    Promise.all(blsMonths.map(({ year, month }) => fetchText(blsMonthScheduleUrl(year, month)))),
  ]);

  const harvested: MacroEvent[] = [];
  if (fomcHtml) harvested.push(...parseFomcHtml(fomcHtml));
  if (beaIcs) harvested.push(...parseBeaIcs(beaIcs));
  const blsEvents = blsMonths.flatMap((spec, index) => {
    const html = blsHtml[index];
    return html ? parseBlsMonthHtml(html, spec.year, blsMonthScheduleUrl(spec.year, spec.month)) : [];
  });
  const nfpOfficial = blsEvents.filter((event) => event.kind === 'nfp');
  harvested.push(
    ...(windowEvents(nfpOfficial, nowMs).length ? nfpOfficial : nfpConventionEvents(new Date(nowMs))),
  );
  harvested.push(...blsEvents.filter((event) => event.kind === 'cpi'));

  const merged = windowEvents(harvested.map((event) => attachPrints(event, series, nowMs)), nowMs);
  if (merged.length === 0 && prior?.events?.length) {
    return {
      asOf: prior.asOf,
      events: mergeCalendarReports(
        windowEvents(
          prior.events.map((event) => attachPrints(event, series, nowMs)),
          nowMs,
        ),
        prior,
      ),
    };
  }
  return {
    asOf: new Date(nowMs).toISOString(),
    events: mergeCalendarReports(merged, prior),
  };
}
