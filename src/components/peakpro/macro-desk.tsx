'use client';

import { useEffect, useState } from 'react';

import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import { eventStatus } from '@/lib/peakpro/macro-calendar';
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
  const stamp = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-TW' : 'en-US', {
    timeZone: event.timezone,
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(new Date(event.scheduledAt));
  return (
    <p suppressHydrationWarning className="text-[11px] uppercase tracking-[0.18em] text-gold-antique">
      {stamp}
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
        <h2 className="text-xs uppercase tracking-[0.32em] text-gold">{tPeakpro(locale, 'calendarTitle')}</h2>
        {tPeakpro(locale, 'calendarLead') ? (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">{tPeakpro(locale, 'calendarLead')}</p>
        ) : null}
      </div>
      {events.length === 0 ? (
        <p className="rounded-2xl border border-gold/15 px-6 py-10 text-center text-sm text-zinc-500">
          {tPeakpro(locale, 'calendarEmpty')}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => {
            const status = now == null ? event.status : eventStatus(event.scheduledAt, now);
            const remain = now == null ? 0 : new Date(event.scheduledAt).getTime() - now;
            const parts = remainParts(remain);
            return (
              <article key={event.id} className="rounded-3xl border border-gold/15 bg-black/60 px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <EventStamp locale={locale} event={event} />
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]',
                      status === 'live'
                        ? 'border border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                        : status === 'printed'
                          ? 'border border-zinc-700 text-zinc-400'
                          : 'border border-gold/30 text-gold',
                    )}
                  >
                    {statusLabel(locale, status)}
                  </span>
                </div>
                <h3 className="mt-3 font-peakpro text-xl text-gold">
                  {locale === 'zh' ? event.title.zh : event.title.en}
                </h3>
                <p className="mt-1 text-xs text-zinc-500">{locale === 'zh' ? event.agency.zh : event.agency.en}</p>
                {status === 'upcoming' && now != null && remain > 0 ? (
                  <p className="mt-4 font-peakpro text-2xl tabular-nums text-white">
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
              </article>
            );
          })}
        </div>
      )}
      {tPeakpro(locale, 'calendarFoot') ? (
        <p className="text-[11px] leading-relaxed text-zinc-600">{tPeakpro(locale, 'calendarFoot')}</p>
      ) : null}
    </section>
  );
}
