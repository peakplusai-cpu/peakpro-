'use client';

import { useEffect, useState } from 'react';

import type { Locale } from '@/i18n/locale';
import { WORLD_CLOCKS } from '@/lib/peakpro/constants';
import { tPeakpro } from '@/lib/peakpro/copy';

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

export function WorldClocks({ locale }: { locale: Locale }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const stamp = now ?? new Date(0);

  return (
    <section className="mx-auto mt-16 w-full max-w-6xl px-6">
      <div className="mb-8 text-center">
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
