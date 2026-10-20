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
    <div className="relative min-h-screen text-gold">
      <IntroCandles locale={locale} onComplete={() => undefined} />
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 pl-8">
          <PeakProLogo size="sm" align="left" />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <PeakProDeskSwitcher locale={locale} desk={desk} />
            <PeakProLanguageSwitcher />
            <Link
              href={signedIn ? '/app' : '/login'}
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold/70 hover:text-phosphor"
            >
              {tPeakpro(locale, signedIn ? 'navApp' : 'navLogin')}
            </Link>
            <Link href="/subscribe" className="peakpro-btn !px-4 !py-2 text-[10px]">
              {tPeakpro(locale, 'navSubscribe')}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative mx-auto flex min-h-[86vh] max-w-7xl flex-col justify-end px-6 pb-16 pl-8 pt-20">
          <p className="peakpro-kicker">
            <span className="peakpro-live" />
            {locale === 'zh' ? '延遲倉儲 · 官方公布' : 'Delayed warehouse · official prints'}
          </p>
          <PeakProLogo size="xl" align="left" className="mt-6" />
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-gold/60 sm:text-xl">
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
          <WorldClocks locale={locale} desk={desk} variant="hud" />
        </section>
        <PeakProVenueTicker />
        <WorldClocks locale={locale} desk={desk} variant="full" />
      </main>
      <PeakProFooter locale={locale} />
    </div>
  );
}
