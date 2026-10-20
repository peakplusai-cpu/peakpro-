'use client';

import { useEffect, useState } from 'react';

import type { Locale } from '@/i18n/locale';
import { WORLD_CLOCKS } from '@/lib/peakpro/constants';
import type { DeskRegion } from '@/lib/peakpro/desk-region';
import { tPeakpro } from '@/lib/peakpro/copy';
import { cn } from '@/lib/utils';

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
    <article>
      <p className="peakpro-kicker">{tPeakpro(locale, kicker)}</p>
      <h3 className="mt-4 font-peakpro text-4xl tracking-tight text-gold sm:text-5xl">
        {tPeakpro(locale, title)}
      </h3>
      <ol className="mt-10 space-y-8">
        {items.map((item, index) => (
          <li key={item.title} className="grid grid-cols-[auto_1fr] gap-5">
            <p className="font-peakpro text-3xl leading-none text-phosphor">
              {String(index + 1).padStart(2, '0')}
            </p>
            <div>
              <p className="font-medium text-gold">{tPeakpro(locale, item.title)}</p>
              <p className="mt-2 text-sm leading-relaxed text-gold/55">{tPeakpro(locale, item.body)}</p>
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
  large = false,
}: {
  locale: Locale;
  clock: (typeof WORLD_CLOCKS)[number];
  stamp: Date;
  ready: boolean;
  large?: boolean;
}) {
  const time = formatClock(stamp, clock.timeZone);
  return (
    <article className={cn(large ? 'min-w-[9.5rem]' : 'border-t border-white/10 pt-4')}>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold/40">
        {locale === 'zh' ? clock.countryZh : clock.countryEn}
      </p>
      <p className="mt-1 text-xs text-gold/35">{locale === 'zh' ? clock.cityZh : clock.cityEn}</p>
      <p
        className={cn(
          'mt-3 font-peakpro tabular-nums tracking-tight text-gold',
          large ? 'text-4xl sm:text-5xl' : 'text-3xl',
        )}
      >
        {ready ? (
          <>
            {time.hour}:{time.minute}
            <span className="text-lg text-phosphor">:{time.second}</span>
          </>
        ) : (
          <span className="text-gold/20">--:--</span>
        )}
      </p>
      <p className="mt-1 font-mono text-[10px] tracking-[0.2em] text-gold/40">{time.dayPeriod}</p>
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
      <aside className="mt-16 border-t border-white/10 pt-8">
        <p className="peakpro-kicker mb-6">
          <span className="peakpro-live" />
          {tPeakpro(locale, 'clocksTitle')}
        </p>
        <div className="flex gap-8 overflow-x-auto pb-2">
          {WORLD_CLOCKS.map((clock) => (
            <ClockFace key={clock.id} locale={locale} clock={clock} stamp={stamp} ready={ready} large />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-24 pl-8">
      <div className="grid gap-16 lg:grid-cols-2">
        <Manifesto locale={locale} kicker="whyKicker" title="whyTitle" items={desk === 'us' ? WHY_ITEMS_US : WHY_ITEMS} />
        <Manifesto
          locale={locale}
          kicker="pickKicker"
          title="pickTitle"
          items={desk === 'us' ? PICK_ITEMS_US : PICK_ITEMS}
        />
      </div>
      <div className="mb-10 mt-24">
        <h2 className="font-peakpro text-4xl text-gold">{tPeakpro(locale, 'clocksTitle')}</h2>
        <p className="mt-3 max-w-2xl text-sm text-gold/50">{tPeakpro(locale, 'clocksSub')}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
        {WORLD_CLOCKS.map((clock) => (
          <ClockFace key={clock.id} locale={locale} clock={clock} stamp={stamp} ready={ready} />
        ))}
      </div>
    </section>
  );
}
