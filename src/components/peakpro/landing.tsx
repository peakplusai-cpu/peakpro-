import Link from 'next/link';

import { IntroBoot } from '@/components/peakpro/intro-boot';
import { PeakProFooter } from '@/components/peakpro/footer';
import { PeakProLogo } from '@/components/peakpro/logo';
import { VenueRadar } from '@/components/peakpro/radar';
import { PeakProTopBar } from '@/components/peakpro/top-bar';
import { PeakProVenueTicker } from '@/components/peakpro/venue-ticker';
import { WorldClocks } from '@/components/peakpro/world-clocks';
import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import type { DeskRegion } from '@/lib/peakpro/desk-region';

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
    <div className="relative min-h-screen text-ice">
      <IntroBoot locale={locale} />
      <PeakProTopBar locale={locale} signedIn={signedIn} desk={desk} />

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:pb-24 lg:pt-24">
          <div>
            <p className="peakpro-kicker peakpro-rise" style={{ '--i': 0 } as React.CSSProperties}>
              <span className="peakpro-live" />
              {locale === 'zh' ? '延遲倉儲 · 官方公布' : 'Delayed warehouse · official prints'}
            </p>
            <PeakProLogo size="xl" align="left" className="peakpro-rise mt-6" />
            <p
              className="peakpro-rise mt-8 max-w-xl text-lg leading-relaxed text-ice-dim sm:text-xl"
              style={{ '--i': 2 } as React.CSSProperties}
            >
              {tPeakpro(locale, 'tagline')}
            </p>
            <div
              className="peakpro-rise mt-10 flex flex-wrap items-center gap-4"
              style={{ '--i': 3 } as React.CSSProperties}
            >
              <Link href={signedIn ? '/app' : '/login'} className="peakpro-btn">
                {tPeakpro(locale, 'heroCta')}
              </Link>
              <Link href="/subscribe" className="peakpro-btn-ghost">
                {tPeakpro(locale, 'heroSecondary')}
              </Link>
            </div>
          </div>
          <VenueRadar className="peakpro-rise" />
        </section>

        <PeakProVenueTicker />
        <WorldClocks locale={locale} desk={desk} variant="hud" />
        <WorldClocks locale={locale} desk={desk} variant="full" />
      </main>
      <PeakProFooter locale={locale} />
    </div>
  );
}
