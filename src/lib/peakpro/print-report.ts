import { completeOpenRouterText, getOpenRouterApiKey } from '@/lib/peakpro/advisor-openrouter';
import { buildAdvisorDeskContext } from '@/lib/peakpro/advisor-prompt';
import { readPeakProCache } from '@/lib/peakpro/cache';
import { MACRO_CALENDAR_SYMBOL } from '@/lib/peakpro/constants';
import { peakproAdmin } from '@/lib/peakpro/db';
import { asEquityDesk, stripTaiwanCache, type DeskRegion } from '@/lib/peakpro/desk-region';
import {
  emptyReports,
  eventStatus,
  figuresHash,
  isMacroCalendarPayload,
  reportFits,
} from '@/lib/peakpro/macro-calendar';
import type {
  MacroCalendarPayload,
  MacroEvent,
  MacroFigure,
  MacroPrintReport,
  PeakProCacheSnapshot,
} from '@/lib/peakpro/types';

const inflight = new Map<string, Promise<MacroPrintReport>>();

function figureLine(locale: 'en' | 'zh', figures: MacroFigure[]): string {
  if (figures.length === 0) return locale === 'zh' ? '尚無官方數列' : 'Official series not on the desk';
  return figures.map((row) => `${locale === 'zh' ? row.label.zh : row.label.en} ${row.value}`).join(' · ');
}

function noInventedPrint(kind: MacroEvent['kind'], locale: 'en' | 'zh'): string {
  if (kind === 'nfp' || kind === 'cpi') {
    return locale === 'zh'
      ? '非農／CPI 只寫 BLS 已公布的數字。沒有數列就不填數字，也不補市場預估。'
      : 'NFP/CPI uses BLS figures already on the desk. No series, no invented print, no consensus.';
  }
  return locale === 'zh'
    ? 'FOMC、GDP、PCE 本桌不自填利率或成長數字。聲明以官方來源為準。'
    : 'This desk does not invent an FOMC rate or a GDP/PCE print. Use the agency source for the statement.';
}

export function buildFallbackPrintReport(event: MacroEvent): MacroPrintReport {
  const previousEn = figureLine('en', event.previous);
  const previousZh = figureLine('zh', event.previous);
  const actualEn = event.actual.length
    ? figureLine('en', event.actual)
    : 'No official actual on the desk yet.';
  const actualZh = event.actual.length ? figureLine('zh', event.actual) : '尚無公布值。';

  return {
    generatedAt: new Date().toISOString(),
    figuresHash: figuresHash(event),
    source: 'template',
    title: {
      en: `${event.title.en} — desk note`,
      zh: `${event.title.zh} — 桌面報告`,
    },
    body: {
      en: [
        `Print: ${event.title.en} (${event.agency.en})`,
        `Scheduled: ${event.scheduledAt} (${event.timezone})`,
        `Status: ${event.status}`,
        `Previous: ${previousEn}`,
        `Actual: ${actualEn}`,
        noInventedPrint(event.kind, 'en'),
        'Tape: last prints on this desk only.',
      ].join('\n\n'),
      zh: [
        `數據：${event.title.zh}（${event.agency.zh}）`,
        `時間：${event.scheduledAt}（${event.timezone}）`,
        `狀態：${event.status}`,
        `前值：${previousZh}`,
        `公布值：${actualZh}`,
        noInventedPrint(event.kind, 'zh'),
        '走勢只引用本桌最新價。',
      ].join('\n\n'),
    },
  };
}

function parseLocalizedNote(text: string, fallback: MacroPrintReport): Pick<MacroPrintReport, 'title' | 'body'> {
  const [english, chinese] = text.split(/---+/);
  const en = english?.trim() || fallback.body.en;
  const zh = chinese?.trim() || fallback.body.zh;
  const enTitle = en.split('\n').find((line) => line.trim())?.replace(/^#+\s*/, '').slice(0, 120);
  const zhTitle = zh.split('\n').find((line) => line.trim())?.replace(/^#+\s*/, '').slice(0, 120);
  return {
    title: {
      en: enTitle || fallback.title.en,
      zh: zhTitle || fallback.title.zh,
    },
    body: { en, zh },
  };
}

async function generatePrintReport(
  event: MacroEvent,
  desk: DeskRegion,
  cache: PeakProCacheSnapshot,
): Promise<MacroPrintReport> {
  const fallback = buildFallbackPrintReport(event);
  const deskCache = stripTaiwanCache(cache, desk);
  const printBlock = [
    `PRINT id=${event.id} kind=${event.kind} status=${event.status}`,
    `scheduledAt=${event.scheduledAt} timezone=${event.timezone} agency=${event.agency.en}`,
    `previous=${figureLine('en', event.previous)}`,
    `actual=${event.actual.length ? figureLine('en', event.actual) : 'NONE'}`,
    `sourceUrl=${event.sourceUrl ?? 'none'}`,
    noInventedPrint(event.kind, 'en'),
  ].join('\n');

  const text = await completeOpenRouterText(
    [
      {
        role: 'system',
        content:
          'You are a sell-side desk writing a post-print note for a private terminal. Write English first, then a line of ---, then Traditional Chinese (Taiwan). Use only the PRINT block and the desk tape. Headings: Print, Tape, Read. If actual is NONE, say the official series is not on the desk yet — do not invent a rate, payrolls, CPI, GDP, or PCE figure, and do not invent consensus. Never mention warehouse, delay, lag, or cache to the reader. Stance language is allowed (add / trim / wait). No disclaimer line. Tight. No emoji. No "as an AI".',
      },
      {
        role: 'user',
        content: `${printBlock}\n\nDESK TAPE:\n${buildAdvisorDeskContext(deskCache, desk).slice(0, 3500)}`,
      },
    ],
    { maxTokens: 900, timeoutMs: 12_000 },
  );

  if (!text) return fallback;
  return {
    generatedAt: new Date().toISOString(),
    figuresHash: figuresHash(event),
    source: 'model',
    ...parseLocalizedNote(text, fallback),
  };
}

async function readCalendarPayload(): Promise<MacroCalendarPayload | null> {
  const admin = peakproAdmin();
  const { data } = await admin.from('market_data').select('payload').eq('symbol', MACRO_CALENDAR_SYMBOL).maybeSingle();
  return isMacroCalendarPayload(data?.payload) ? data.payload : null;
}

async function writeCalendarPayload(payload: MacroCalendarPayload) {
  const admin = peakproAdmin();
  const { error } = await admin.from('market_data').upsert(
    {
      asset_class: 'ranking',
      symbol: MACRO_CALENDAR_SYMBOL,
      timeframe: 'weekly',
      payload,
      last_updated: new Date().toISOString(),
    },
    { onConflict: 'asset_class,symbol,timeframe' },
  );
  if (error) {
    console.warn('[peakpro/print-report] calendar upsert failed', error.message);
    return;
  }
  try {
    const { revalidateTag } = await import('next/cache');
    revalidateTag('peakpro-warehouse');
  } catch {
    // local cache tag optional
  }
}

async function patchEventReport(eventId: string, desk: DeskRegion, report: MacroPrintReport) {
  const payload = await readCalendarPayload();
  if (!payload) return;
  const key = asEquityDesk(desk);
  await writeCalendarPayload({
    ...payload,
    events: payload.events.map((event) => {
      if (event.id !== eventId) return event;
      return {
        ...event,
        reports: {
          ...(event.reports ?? emptyReports()),
          [key]: report,
        },
      };
    }),
  });
}

export async function ensureDeskPrintReport(
  event: MacroEvent,
  desk: DeskRegion,
  cache?: PeakProCacheSnapshot,
  options?: { upgradeTemplate?: boolean },
): Promise<MacroEvent> {
  const status = eventStatus(event.scheduledAt);
  if (status === 'upcoming') {
    return { ...event, status, reports: { tw: null, us: null } };
  }
  const current = { ...event, status };
  const key = asEquityDesk(desk);
  const existing = current.reports?.[key];
  if (reportFits(current, desk) && existing) {
    const skipUpgrade =
      existing.source === 'model' || !options?.upgradeTemplate || !getOpenRouterApiKey();
    if (skipUpgrade) return current;
  }

  const inflightKey = `${event.id}:${key}`;
  const pending = inflight.get(inflightKey);
  const run = pending ??
    (async () => {
      const snapshot = cache ?? (await readPeakProCache());
      return generatePrintReport(current, desk, snapshot);
    })();
  if (!pending) inflight.set(inflightKey, run);

  try {
    const report = await run;
    await patchEventReport(event.id, desk, report);
    return {
      ...current,
      reports: {
        ...(current.reports ?? emptyReports()),
        [key]: report,
      },
    };
  } finally {
    inflight.delete(inflightKey);
  }
}

export async function fillDeskPrintReports(desk: DeskRegion): Promise<number> {
  const [payload, cache] = await Promise.all([readCalendarPayload(), readPeakProCache()]);
  if (!payload) return 0;
  const key = asEquityDesk(desk);
  let filled = 0;
  for (const event of payload.events) {
    if (!event.desks.includes(key)) continue;
    const status = eventStatus(event.scheduledAt);
    if (status === 'upcoming') continue;
    if (reportFits(event, desk)) continue;
    await ensureDeskPrintReport(event, desk, cache);
    filled += 1;
  }
  return filled;
}
