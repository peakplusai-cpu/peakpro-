import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import type { DeskRegion } from '@/lib/peakpro/desk-region';
import { PEAKPRO_DISCLAIMER_EN, PEAKPRO_DISCLAIMER_ZH } from '@/lib/peakpro/disclaimer';
import type { MacroEvent, MacroEventStatus, MacroFigure } from '@/lib/peakpro/types';
import { cn } from '@/lib/utils';

function statusLabel(locale: Locale, status: MacroEventStatus) {
  if (status === 'live') return tPeakpro(locale, 'calendarLive');
  if (status === 'printed') return tPeakpro(locale, 'calendarPrinted');
  return tPeakpro(locale, 'calendarUpcoming');
}

function figureText(locale: Locale, row: MacroFigure) {
  return `${locale === 'zh' ? row.label.zh : row.label.en} ${row.value}`;
}

export function PeakProPrintReport({
  locale,
  desk,
  event,
}: {
  locale: Locale;
  desk: DeskRegion;
  event: MacroEvent | null;
}) {
  if (!event) {
    return (
      <div className="space-y-6">
        <Link href="/app" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-gold">
          <ArrowLeft className="h-4 w-4" />
          {tPeakpro(locale, 'backToDesk')}
        </Link>
        <div className="peakpro-panel px-6 py-16 text-center text-sm text-zinc-500">
          {tPeakpro(locale, 'calendarMissing')}
        </div>
      </div>
    );
  }

  const report = event.reports?.[desk];
  const title = locale === 'zh' ? report?.title.zh ?? event.title.zh : report?.title.en ?? event.title.en;
  const body = locale === 'zh' ? report?.body.zh : report?.body.en;
  const upcoming = event.status === 'upcoming';
  const stamp = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-TW' : 'en-US', {
    timeZone: event.timezone,
    dateStyle: 'full',
    timeStyle: 'short',
    timeZoneName: 'short',
  }).format(new Date(event.scheduledAt));

  return (
    <div className="space-y-8">
      <Link href="/app" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-gold">
        <ArrowLeft className="h-4 w-4" />
        {tPeakpro(locale, 'backToDesk')}
      </Link>

      <article className="peakpro-panel p-6 md:p-8">
        <div className="flex items-start justify-between gap-3">
          <p className="peakpro-kicker">{locale === 'zh' ? event.agency.zh : event.agency.en}</p>
          <span
            className={cn(
              'px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em]',
              event.status === 'live'
                ? 'border border-phosphor/40 bg-phosphor/10 text-phosphor'
                : event.status === 'printed'
                  ? 'border border-zinc-700 text-zinc-400'
                  : 'border border-gold/30 text-gold',
            )}
          >
            {statusLabel(locale, event.status)}
          </span>
        </div>
        <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-gold-antique">{stamp}</p>
        <h1 className="mt-4 font-peakpro text-3xl leading-snug text-zinc-50 md:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-zinc-500">{tPeakpro(locale, 'calendarReportLead')}</p>

        {event.previous.length > 0 ? (
          <p className="mt-6 text-sm text-zinc-400">
            {tPeakpro(locale, 'calendarPrevious')}{' '}
            {event.previous.map((row) => figureText(locale, row)).join(' · ')}
          </p>
        ) : null}
        {!upcoming && event.actual.length > 0 ? (
          <p className="mt-1 text-sm text-zinc-100">
            {tPeakpro(locale, 'calendarActual')}{' '}
            {event.actual.map((row) => figureText(locale, row)).join(' · ')}
          </p>
        ) : null}

        {upcoming ? (
          <p className="mt-8 text-sm leading-7 text-zinc-400">{tPeakpro(locale, 'calendarNotYet')}</p>
        ) : body ? (
          <div className="prose prose-invert mt-8 max-w-none whitespace-pre-wrap text-sm leading-7 text-zinc-300">
            {body}
          </div>
        ) : (
          <p className="mt-8 text-sm leading-7 text-zinc-400">{tPeakpro(locale, 'calendarNotYet')}</p>
        )}

        {event.sourceUrl ? (
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex items-center gap-2 text-sm text-gold hover:underline"
          >
            {tPeakpro(locale, 'calendarSource')}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}

        <p className="mt-8 text-[11px] leading-relaxed text-zinc-600">
          {locale === 'zh' ? PEAKPRO_DISCLAIMER_ZH : PEAKPRO_DISCLAIMER_EN}
        </p>
      </article>
    </div>
  );
}
