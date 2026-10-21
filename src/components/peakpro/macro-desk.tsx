'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';

import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import { eventStatus, formatEventStamp } from '@/lib/peakpro/macro-calendar';
import type { MacroEvent, MacroEventStatus, MacroFigure } from '@/lib/peakpro/types';
import { cn } from '@/lib/utils';

function remainParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function statusLabel(locale: Locale, status: MacroEventStatus) {
  if (status === 'live') return tPeakpro(locale, 'calendarLive');
  if (status === 'printed') return tPeakpro(locale, 'calendarPrinted');
  return tPeakpro(locale, 'calendarUpcoming');
}

function figureText(locale: Locale, row: MacroFigure) {
  return `${locale === 'zh' ? row.label.zh : row.label.en} ${row.value}`;
}

function EventStamp({ locale, event }: { locale: Locale; event: MacroEvent }) {
  return (
    <p suppressHydrationWarning className="font-mono text-[11px] uppercase tracking-[0.18em] text-ice-dim">
      {formatEventStamp(locale, event)}
    </p>
  );
}

export function PeakProMacroDesk({ locale, events }: { locale: Locale; events: MacroEvent[] }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="peakpro-kicker">{tPeakpro(locale, 'calendarTitle')}</h2>
      </div>
      {events.length === 0 ? (
        <p className="peakpro-panel px-6 py-10 text-center text-sm text-zinc-500">
          {tPeakpro(locale, 'calendarEmpty')}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => {
            const status = now == null ? event.status : eventStatus(event.scheduledAt, now);
            const remain = now == null ? 0 : new Date(event.scheduledAt).getTime() - now;
            const parts = remainParts(remain);
            const inner = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <EventStamp locale={locale} event={event} />
                  <span
                    className={cn(
                      'px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em]',
                      status === 'live'
                        ? 'border border-signal/40 bg-signal/10 text-signal'
                        : status === 'printed'
                          ? 'border border-zinc-700 text-zinc-400'
                          : 'border border-plasma/40 text-plasma',
                    )}
                  >
                    {statusLabel(locale, status)}
                  </span>
                </div>
                <h3 className="mt-3 font-peakpro text-xl font-semibold tracking-tight text-ice">
                  {locale === 'zh' ? event.title.zh : event.title.en}
                </h3>
                <p className="mt-1 text-xs text-zinc-500">{locale === 'zh' ? event.agency.zh : event.agency.en}</p>
                {status === 'upcoming' && now != null && remain > 0 ? (
                  <p className="mt-4 font-mono text-2xl tabular-nums text-signal">
                    {parts.days > 0 ? `${parts.days}d ` : ''}
                    {pad(parts.hours)}:{pad(parts.minutes)}:{pad(parts.seconds)}
                  </p>
                ) : null}
                {event.previous.length > 0 ? (
                  <p className="mt-3 text-sm text-zinc-400">
                    {tPeakpro(locale, 'calendarPrevious')}{' '}
                    {event.previous.map((row) => figureText(locale, row)).join(' · ')}
                  </p>
                ) : null}
                {status !== 'upcoming' && event.actual.length > 0 ? (
                  <p className="mt-1 text-sm text-zinc-100">
                    {tPeakpro(locale, 'calendarActual')}{' '}
                    {event.actual.map((row) => figureText(locale, row)).join(' · ')}
                  </p>
                ) : null}
                <p className="mt-4 inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-signal">
                  {tPeakpro(locale, 'calendarOpen')}
                  <ChevronRight className="h-3.5 w-3.5" />
                </p>
              </>
            );
            return (
              <Link
                key={event.id}
                href={`/app/prints/${encodeURIComponent(event.id)}`}
                className="peakpro-panel relative z-[1] block cursor-pointer px-5 py-5"
              >
                {inner}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
