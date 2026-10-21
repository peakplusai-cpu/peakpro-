import { completeOpenRouterText, getOpenRouterApiKey } from '@/lib/peakpro/advisor-openrouter';
import { NAME_NOTES_SYMBOL } from '@/lib/peakpro/constants';
import { peakproAdmin } from '@/lib/peakpro/db';
import type { DeskRegion } from '@/lib/peakpro/desk-region';
import { eventsForDesk, eventStatus, formatAdvisorCalendar } from '@/lib/peakpro/macro-calendar';
import { projectBars } from '@/lib/peakpro/forecast';
import { formatPct, formatPx } from '@/lib/peakpro/format';
import type {
  FilingsPayload,
  MacroEvent,
  MarketDataRow,
  NameDeskLean,
  NameDeskNote,
  NameNotesPayload,
  NewsCacheRow,
  PeakProCacheSnapshot,
} from '@/lib/peakpro/types';

const inflight = new Map<string, Promise<NameDeskNote>>();
const NOTE_CAP = 48;

function isNameNotesPayload(value: unknown): value is NameNotesPayload {
  if (!value || typeof value !== 'object') return false;
  const row = value as NameNotesPayload;
  return typeof row.asOf === 'string' && Boolean(row.notes) && typeof row.notes === 'object';
}

function dailyRow(cache: PeakProCacheSnapshot, symbol: string): MarketDataRow | undefined {
  return (
    cache.equities.find((row) => row.symbol === symbol && row.timeframe === 'daily') ??
    cache.equities.find((row) => row.symbol === symbol)
  );
}

function needlesFor(symbol: string, name: string): string[] {
  const base = symbol.replace(/\.(TW|TWO)$/i, '');
  const parts = name.split(/[\s,/（）()]+/).filter((part) => part.length >= 2);
  return [...new Set([symbol, base, name, ...parts])];
}

export function newsForName(cache: PeakProCacheSnapshot, symbol: string, name: string): NewsCacheRow[] {
  const keys = needlesFor(symbol, name).map((key) => key.toLowerCase());
  return cache.news
    .filter((item) => {
      const blob = `${item.title} ${item.title_zh} ${item.summary} ${item.summary_zh}`.toLowerCase();
      return keys.some((key) => key.length >= 2 && blob.includes(key));
    })
    .slice(0, 6);
}

export function filingsForName(cache: PeakProCacheSnapshot, symbol: string): string[] {
  const ticker = symbol.replace(/\.(TW|TWO)$/i, '').toUpperCase();
  const payload = cache.filings?.payload as unknown as FilingsPayload | undefined;
  if (!payload) return [];
  const trades = (payload.trades ?? [])
    .filter((row) => row.ticker.toUpperCase() === ticker)
    .slice(0, 4)
    .map((row) => `${row.traded ?? 'n/a'} ${row.person} ${row.side} ${row.ticker} ${row.amount}`);
  const books = (payload.books ?? [])
    .flatMap((book) =>
      (book.holdings ?? [])
        .filter((row) => row.ticker.toUpperCase() === ticker)
        .slice(0, 2)
        .map((row) => `${book.name} 13F ${row.ticker} $${row.valueUsd000}k`),
    )
    .slice(0, 3);
  return [...trades, ...books];
}

export function nameFiguresHash(
  cache: PeakProCacheSnapshot,
  desk: DeskRegion,
  symbol: string,
): string {
  const row = dailyRow(cache, symbol);
  const prints = eventsForDesk(cache.calendar, desk).map((event) => ({
    id: event.id,
    status: eventStatus(event.scheduledAt),
    actual: event.actual,
  }));
  const news = newsForName(cache, symbol, row?.payload.name ?? symbol).map((item) => item.id);
  return JSON.stringify({
    v: 2,
    last: row?.payload.last ?? null,
    changePct: row?.payload.changePct ?? null,
    prints,
    news,
  });
}

export function noteFits(note: NameDeskNote | null | undefined, hash: string): boolean {
  return Boolean(note && note.figuresHash === hash);
}

function projectionLines(row: MarketDataRow | undefined): { en: string; zh: string } {
  const projection = row ? projectBars(row.payload.bars, 'daily') : null;
  if (!row || !projection) return { en: '', zh: '' };
  const end = projection.bars[projection.bars.length - 1];
  const cur = row.payload.currency;
  const n = projection.bars.length;
  const range = `${formatPx(end.lo, cur)} – ${formatPx(end.hi, cur)}`;
  const move = formatPct(projection.movePct);
  return {
    en: `Model path next ${n} sessions: median ${formatPx(end.c, cur)} (${move}), 1σ ${range}.`,
    zh: `模型路徑：未來 ${n} 個交易日中位 ${formatPx(end.c, cur)}（${move}），1σ 區間 ${range}。`,
  };
}

function fallbackLean(changePct: number | undefined): NameDeskLean {
  if (changePct == null || !Number.isFinite(changePct)) return 'wait';
  if (changePct >= 1.5) return 'add';
  if (changePct <= -1.5) return 'trim';
  return 'wait';
}

function printLines(events: MacroEvent[], locale: 'en' | 'zh'): string {
  if (events.length === 0) return locale === 'zh' ? '這一窗沒有高影響官方公布。' : 'No high-impact official prints in this window.';
  return events
    .map((event) => {
      const title = locale === 'zh' ? event.title.zh : event.title.en;
      const actual =
        event.actual.length > 0
          ? event.actual.map((row) => `${locale === 'zh' ? row.label.zh : row.label.en} ${row.value}`).join(', ')
          : locale === 'zh'
            ? '尚無公布值'
            : 'no actual in warehouse';
      return `${title} · ${event.status} · ${actual}`;
    })
    .join('\n');
}

export function buildFallbackNameNote(
  cache: PeakProCacheSnapshot,
  desk: DeskRegion,
  symbol: string,
): NameDeskNote {
  const row = dailyRow(cache, symbol);
  const name = row?.payload.name ?? symbol;
  const changePct = row?.payload.changePct;
  const lean = fallbackLean(changePct);
  const { en: projEn, zh: projZh } = projectionLines(row);
  const last = row ? `${formatPx(row.payload.last, row.payload.currency)} (${formatPct(row.payload.changePct)})` : 'n/a';
  const events = eventsForDesk(cache.calendar, desk);
  const news = newsForName(cache, symbol, name);
  const filings = filingsForName(cache, symbol);
  const newsEn = news.length ? news.map((item) => `- ${item.source}: ${item.title}`).join('\n') : 'None in cache for this name.';
  const newsZh = news.length
    ? news.map((item) => `- ${item.source}: ${item.title_zh || item.title}`).join('\n')
    : '倉內沒有點到這檔的標題。';

  return {
    symbol,
    generatedAt: new Date().toISOString(),
    figuresHash: nameFiguresHash(cache, desk, symbol),
    source: 'template',
    lean,
    title: {
      en: `${name} — desk note`,
      zh: `${name} — 桌面筆記`,
    },
    body: {
      en: [
        `Tape: ${symbol} ${name} last ${last}.`,
        `Stance: ${lean}.${projEn ? ` ${projEn}` : ''}`,
        `Official prints in this window:\n${printLines(events, 'en')}`,
        `Headlines that mention this name:\n${newsEn}`,
        filings.length ? `Public filings in cache:\n${filings.join('\n')}` : 'No cached filing rows for this ticker.',
      ].join('\n\n'),
      zh: [
        `走勢：${symbol} ${name} 最新 ${last}。`,
        `論點：${lean === 'add' ? '偏多' : lean === 'trim' ? '偏空' : '觀望'}。${projZh}`,
        `這一窗官方公布：\n${printLines(events, 'zh')}`,
        `點到這檔的標題：\n${newsZh}`,
        filings.length ? `倉內公開申報：\n${filings.join('\n')}` : '倉內沒有這檔的申報列。',
      ].join('\n\n'),
    },
  };
}

function parseNote(text: string, fallback: NameDeskNote): Pick<NameDeskNote, 'lean' | 'title' | 'body'> {
  const leanMatch = text.match(/LEAN:\s*(add|trim|wait)/i);
  const lean = (leanMatch?.[1]?.toLowerCase() as NameDeskLean | undefined) ?? fallback.lean;
  const stripped = text.replace(/LEAN:\s*(add|trim|wait)\s*/i, '').trim();
  const [english, chinese] = stripped.split(/---+/);
  const en = english?.trim() || fallback.body.en;
  const zh = chinese?.trim() || fallback.body.zh;
  const enTitle = en.split('\n').find((line) => line.trim())?.replace(/^#+\s*/, '').slice(0, 120);
  const zhTitle = zh.split('\n').find((line) => line.trim())?.replace(/^#+\s*/, '').slice(0, 120);
  return {
    lean,
    title: { en: enTitle || fallback.title.en, zh: zhTitle || fallback.title.zh },
    body: { en, zh },
  };
}

async function generateNameNote(
  cache: PeakProCacheSnapshot,
  desk: DeskRegion,
  symbol: string,
): Promise<NameDeskNote> {
  const fallback = buildFallbackNameNote(cache, desk, symbol);
  const row = dailyRow(cache, symbol);
  const name = row?.payload.name ?? symbol;
  const news = newsForName(cache, symbol, name);
  const filings = filingsForName(cache, symbol);
  const { en: projEn } = projectionLines(row);
  const user = [
    `NAME ${symbol} ${name}`,
    `warehouse last=${row ? formatPx(row.payload.last, row.payload.currency) : 'n/a'} change=${row ? formatPct(row.payload.changePct) : 'n/a'}`,
    projEn ? `PROJECTION ${projEn}` : 'PROJECTION n/a',
    formatAdvisorCalendar(cache.calendar, desk),
    'HEADLINES mentioning this name:',
    news.length ? news.map((item) => `- ${item.source}: ${item.title} | ${item.title_zh}`).join('\n') : '(none)',
    'FILINGS in cache for this ticker:',
    filings.length ? filings.join('\n') : '(none)',
  ].join('\n');

  const text = await completeOpenRouterText(
    [
      {
        role: 'system',
        content:
          'You write a post-tape desk note for one listed name. First line exactly: LEAN: add  or LEAN: trim  or LEAN: wait. Then English with headings Tape, What hit it, Read. Then a line of ---. Then Traditional Chinese (Taiwan). Use only the warehouse last, the PROJECTION line (a statistical extrapolation of the daily bars, quote it as the model path), official prints, cached headlines, and cached public filings. Take a clear add/trim/wait stance and say why. Never invent earnings, analyst targets, or "institutions are buying". Tight. No emoji. No disclaimer line.',
      },
      { role: 'user', content: user.slice(0, 4000) },
    ],
    { maxTokens: 900, timeoutMs: 12_000 },
  );
  if (!text) return fallback;
  return {
    ...fallback,
    generatedAt: new Date().toISOString(),
    source: 'model',
    ...parseNote(text, fallback),
  };
}

export async function readStoredNameNote(symbol: string): Promise<NameDeskNote | null> {
  return (await readNotesPayload()).notes[symbol] ?? null;
}

async function readNotesPayload(): Promise<NameNotesPayload> {
  const admin = peakproAdmin();
  const { data } = await admin.from('market_data').select('payload').eq('symbol', NAME_NOTES_SYMBOL).maybeSingle();
  return isNameNotesPayload(data?.payload) ? data.payload : { asOf: new Date().toISOString(), notes: {} };
}

async function writeNote(note: NameDeskNote) {
  const payload = await readNotesPayload();
  const notes = { ...payload.notes, [note.symbol]: note };
  const keys = Object.keys(notes);
  if (keys.length > NOTE_CAP) {
    const drop = keys
      .map((key) => notes[key])
      .filter((row): row is NameDeskNote => Boolean(row))
      .sort((a, b) => a.generatedAt.localeCompare(b.generatedAt))
      .slice(0, keys.length - NOTE_CAP);
    for (const row of drop) delete notes[row.symbol];
  }
  const admin = peakproAdmin();
  const { error } = await admin.from('market_data').upsert(
    {
      asset_class: 'ranking',
      symbol: NAME_NOTES_SYMBOL,
      timeframe: 'weekly',
      payload: { asOf: new Date().toISOString(), notes },
      last_updated: new Date().toISOString(),
    },
    { onConflict: 'asset_class,symbol,timeframe' },
  );
  if (error) {
    console.warn('[peakpro/name-note] upsert failed', error.message);
    return;
  }
  try {
    const { revalidateTag } = await import('next/cache');
    revalidateTag('peakpro-warehouse');
  } catch {
    // optional
  }
}

export async function ensureNameDeskNote(
  cache: PeakProCacheSnapshot,
  desk: DeskRegion,
  symbol: string,
  options?: { upgradeTemplate?: boolean },
): Promise<NameDeskNote> {
  const hash = nameFiguresHash(cache, desk, symbol);
  const stored = (await readNotesPayload()).notes[symbol];
  if (noteFits(stored, hash)) {
    const skip =
      stored.source === 'model' || !options?.upgradeTemplate || !getOpenRouterApiKey();
    if (skip) return stored;
  }

  const key = `${symbol}:${desk}:${hash}`;
  const pending = inflight.get(key);
  const run = pending ?? generateNameNote(cache, desk, symbol);
  if (!pending) inflight.set(key, run);
  try {
    const note = await run;
    await writeNote(note);
    return note;
  } finally {
    inflight.delete(key);
  }
}
