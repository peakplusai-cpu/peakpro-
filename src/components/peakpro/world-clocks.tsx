'use client';

import { useEffect, useState } from 'react';

import type { Locale } from '@/i18n/locale';
import { WORLD_CLOCKS } from '@/lib/peakpro/constants';
import type { DeskRegion } from '@/lib/peakpro/desk-region';
import { tPeakpro } from '@/lib/peakpro/copy';

const WHY_ITEMS = [
  { title: 'why1Title', body: 'why1Body' },
  { title: 'why2Title', body: 'why2Body' },
  { title: 'why3Title', body: 'why3Body' },
] as const;

const WHY_ITEMS_US = [
  { title: 'why1Title', body: 'why1BodyUs' },
  { title: 'why2Title', body: 'why2Body' },
  { title: 'why3Title', body: 'why3Body' },
] as const;

const PICK_ITEMS = [
  { title: 'pick1Title', body: 'pick1Body' },
  { title: 'pick2Title', body: 'pick2Body' },
  { title: 'pick3Title', body: 'pick3Body' },
] as const;

const PICK_ITEMS_US = [
  { title: 'pick1Title', body: 'pick1BodyUs' },
  { title: 'pick2Title', body: 'pick2Body' },
  { title: 'pick3Title', body: 'pick3Body' },
] as const;

function Manifesto({
  locale,
  kicker,
  title,
  items,
}: {
  locale: Locale;
  kicker: string;
  title: string;
  items: ReadonlyArray<{ title: string; body: string }>;
}) {
  return (
    <article className="peakpro-panel peakpro-frame p-7 sm:p-9">
      <p className="peakpro-kicker">{tPeakpro(locale, kicker)}</p>
      <h3 className="mt-4 font-peakpro text-3xl font-semibold tracking-tight text-ice sm:text-4xl">
        {tPeakpro(locale, title)}
      </h3>
      <ol className="mt-8 space-y-7">
        {items.map((item, index) => (
          <li key={item.title} className="grid grid-cols-[auto_1fr] gap-5">
            <p className="font-mono text-sm leading-7 text-signal">{String(index + 1).padStart(2, '0')}</p>
            <div>
              <p className="font-medium text-ice">{tPeakpro(locale, item.title)}</p>
              <p className="mt-2 text-sm leading-relaxed text-ice-dim">{tPeakpro(locale, item.body)}</p>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}

function formatClock(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).formatToParts(now);

  const hour = parts.find((part) => part.type === 'hour')?.value ?? '12';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  const second = parts.find((part) => part.type === 'second')?.value ?? '00';
  const dayPeriod = (parts.find((part) => part.type === 'dayPeriod')?.value ?? 'AM').toUpperCase();
  return { hour, minute, second, dayPeriod };
}

function ClockFace({
  locale,
  clock,
  stamp,
  ready,
}: {
  locale: Locale;
  clock: (typeof WORLD_CLOCKS)[number];
  stamp: Date;
  ready: boolean;
}) {
  const time = formatClock(stamp, clock.timeZone);
  return (
    <article className="peakpro-panel px-4 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal/80">
        {locale === 'zh' ? clock.countryZh : clock.countryEn}
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">{locale === 'zh' ? clock.cityZh : clock.cityEn}</p>
      <p className="mt-3 font-mono text-2xl tabular-nums tracking-tight text-ice sm:text-3xl">
        {ready ? (
          <>
            {time.hour}:{time.minute}
            <span className="text-sm text-signal">:{time.second}</span>
          </>
        ) : (
          <span className="text-zinc-700">--:--</span>
        )}
      </p>
      <p className="mt-1 font-mono text-[10px] tracking-[0.2em] text-zinc-500">{time.dayPeriod}</p>
    </article>
  );
}

export function WorldClocks({
  locale,
  desk = 'tw',
  variant = 'full',
}: {
  locale: Locale;
  desk?: DeskRegion;
  variant?: 'full' | 'hud';
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const stamp = now ?? new Date(0);
  const ready = Boolean(now);

  if (variant === 'hud') {
    return (
      <aside className="mx-auto w-full max-w-7xl px-5 pt-12">
        <p className="peakpro-kicker mb-5">
          <span className="peakpro-live" />
          {tPeakpro(locale, 'clocksTitle')}
        </p>
        <p className="-mt-3 mb-5 text-xs text-zinc-500">{tPeakpro(locale, 'clocksSub')}</p>
        <div className="flex gap-3 overflow-x-auto pb-2 [&>article]:min-w-[10.5rem] [&>article]:shrink-0">
          {WORLD_CLOCKS.map((clock) => (
            <ClockFace key={clock.id} locale={locale} clock={clock} stamp={stamp} ready={ready} />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-20">
      <div className="grid gap-6 lg:grid-cols-2">
        <Manifesto locale={locale} kicker="whyKicker" title="whyTitle" items={desk === 'us' ? WHY_ITEMS_US : WHY_ITEMS} />
        <Manifesto
          locale={locale}
          kicker="pickKicker"
          title="pickTitle"
          items={desk === 'us' ? PICK_ITEMS_US : PICK_ITEMS}
        />
      </div>
    </section>
  );
}
