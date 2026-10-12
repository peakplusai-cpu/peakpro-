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
    <article className="rounded-3xl border border-gold/20 bg-[#0d0d0d] p-6 peakpro-hairline sm:p-8">
      <p className="text-[10px] uppercase tracking-[0.36em] text-gold-antique">{tPeakpro(locale, kicker)}</p>
      <h3 className="mt-3 font-peakpro text-2xl text-gold">{tPeakpro(locale, title)}</h3>
      <ol className="mt-6 space-y-5">
        {items.map((item, index) => (
          <li key={item.title}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold">
              {String(index + 1).padStart(2, '0')} · {tPeakpro(locale, item.title)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{tPeakpro(locale, item.body)}</p>
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

const PICK_ITEMS_US = [
  { title: 'pick1Title', body: 'pick1BodyUs' },
  { title: 'pick2Title', body: 'pick2Body' },
  { title: 'pick3Title', body: 'pick3Body' },
] as const;

export function WorldClocks({ locale, desk = 'tw' }: { locale: Locale; desk?: DeskRegion }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const stamp = now ?? new Date(0);

  return (
    <section className="mx-auto mt-16 w-full max-w-6xl px-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Manifesto locale={locale} kicker="whyKicker" title="whyTitle" items={desk === 'us' ? WHY_ITEMS_US : WHY_ITEMS} />
        <Manifesto
          locale={locale}
          kicker="pickKicker"
          title="pickTitle"
          items={desk === 'us' ? PICK_ITEMS_US : PICK_ITEMS}
        />
      </div>
      <div className="mb-8 mt-16 text-center">
        <h2 className="text-sm uppercase tracking-[0.42em] text-gold">{tPeakpro(locale, 'clocksTitle')}</h2>
        <p className="mt-3 text-sm text-zinc-400">{tPeakpro(locale, 'clocksSub')}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {WORLD_CLOCKS.map((clock) => {
          const time = formatClock(stamp, clock.timeZone);
          return (
            <article
              key={clock.id}
              className="rounded-2xl border border-[#D4AF37]/35 bg-[#0d0d0d] px-4 py-4"
            >
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#C5A059]">
                {locale === 'zh' ? clock.countryZh : clock.countryEn}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {locale === 'zh' ? clock.cityZh : clock.cityEn}
              </p>
              <p className="mt-3 font-peakpro text-2xl tabular-nums text-zinc-50">
                {now ? (
                  <>
                    {time.hour}:{time.minute}
                    <span className="text-sm text-zinc-500">:{time.second}</span>
                  </>
                ) : (
                  <span className="text-zinc-600">--:--</span>
                )}
              </p>
              <p className="mt-1 text-xs font-semibold tracking-[0.2em] text-[#D4AF37]">{time.dayPeriod}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
