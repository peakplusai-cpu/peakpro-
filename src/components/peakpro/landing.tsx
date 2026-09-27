'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';

import { IntroCandles } from '@/components/peakpro/intro-candles';
import { PeakProFooter } from '@/components/peakpro/footer';
import { PeakProLanguageSwitcher } from '@/components/peakpro/language-switcher';
import { PeakProLogo } from '@/components/peakpro/logo';
import { WorldClocks } from '@/components/peakpro/world-clocks';
import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';

export function PeakProLanding({ locale, signedIn }: { locale: Locale; signedIn: boolean }) {
  const [ready, setReady] = useState(false);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <IntroCandles locale={locale} onComplete={() => setReady(true)} />
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gold/10 bg-black/70 px-6 py-4 backdrop-blur-xl">
        <PeakProLogo size="sm" />
        <div className="flex items-center gap-3">
          <PeakProLanguageSwitcher />
          <Link href={signedIn ? '/app' : '/login'} className="text-xs text-zinc-300 hover:text-gold">
            {tPeakpro(locale, signedIn ? 'navApp' : 'navLogin')}
          </Link>
          <Link
            href="/subscribe"
            className="rounded-full bg-gold px-3 py-1 text-xs font-semibold text-black"
          >
            {tPeakpro(locale, 'navSubscribe')}
          </Link>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: ready ? 1 : 0.15, y: ready ? 0 : 16 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="pb-8"
      >
        <section className="flex min-h-[72vh] flex-col items-center justify-center px-6 pt-16 text-center">
          <PeakProLogo size="xl" />
          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            {tPeakpro(locale, 'tagline')}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={signedIn ? '/app' : '/login'}
              className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-black"
            >
              {tPeakpro(locale, 'heroCta')}
            </Link>
            <Link
              href="/subscribe"
              className="rounded-full border border-gold/40 px-6 py-3 text-sm text-gold"
            >
              {tPeakpro(locale, 'heroSecondary')}
            </Link>
          </div>
        </section>
        <WorldClocks locale={locale} />
      </motion.main>
      <PeakProFooter locale={locale} />
    </div>
  );
}
