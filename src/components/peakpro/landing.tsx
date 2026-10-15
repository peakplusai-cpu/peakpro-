'use client';

import Link from 'next/link';

import { IntroCandles } from '@/components/peakpro/intro-candles';
import { PeakProFooter } from '@/components/peakpro/footer';
import { PeakProDeskSwitcher } from '@/components/peakpro/desk-switcher';
import { PeakProLanguageSwitcher } from '@/components/peakpro/language-switcher';
import { PeakProLogo } from '@/components/peakpro/logo';
import { PeakProVenueTicker } from '@/components/peakpro/venue-ticker';
import { WorldClocks } from '@/components/peakpro/world-clocks';
import type { Locale } from '@/i18n/locale';
import type { DeskRegion } from '@/lib/peakpro/desk-region';
import { tPeakpro } from '@/lib/peakpro/copy';

export function PeakProLanding({
  locale,
  signedIn,
  desk = 'tw',
}: {
  locale: Locale;
  signedIn: boolean;
  desk?: DeskRegion;
}) {
  return (
    <div className="relative min-h-screen text-zinc-100">
      <IntroCandles locale={locale} onComplete={() => undefined} />
      <header className="sticky top-0 z-30 border-b border-phosphor/10 bg-ink/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <PeakProLogo size="sm" align="left" />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <PeakProDeskSwitcher locale={locale} desk={desk} />
            <PeakProLanguageSwitcher />
            <Link href={signedIn ? '/app' : '/login'} className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-300 hover:text-phosphor">
              {tPeakpro(locale, signedIn ? 'navApp' : 'navLogin')}
            </Link>
            <Link href="/subscribe" className="peakpro-btn !px-3 !py-1.5 text-[10px]">
              {tPeakpro(locale, 'navSubscribe')}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl items-stretch gap-8 px-6 py-16 lg:grid-cols-12 lg:py-24">
          <div className="peakpro-frame peakpro-sweep p-6 sm:p-10 lg:col-span-7">
            <p className="peakpro-kicker">
              <span className="peakpro-live" />
              {locale === 'zh' ? '終端連線中' : 'Terminal online'}
            </p>
            <div className="mt-8">
              <PeakProLogo size="xl" align="left" />
            </div>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              {tPeakpro(locale, 'tagline')}
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href={signedIn ? '/app' : '/login'} className="peakpro-btn">
                {tPeakpro(locale, 'heroCta')}
              </Link>
              <Link href="/subscribe" className="peakpro-btn-ghost">
                {tPeakpro(locale, 'heroSecondary')}
              </Link>
            </div>
          </div>
          <WorldClocks locale={locale} desk={desk} variant="hud" />
        </section>
        <PeakProVenueTicker />
        <WorldClocks locale={locale} desk={desk} variant="full" />
      </main>
      <PeakProFooter locale={locale} />
    </div>
  );
}
