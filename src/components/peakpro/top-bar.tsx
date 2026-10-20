'use client';

import Link from 'next/link';

import { SignOutButton } from '@/components/peakpro/account';
import { PeakProDeskSwitcher } from '@/components/peakpro/desk-switcher';
import { PeakProLanguageSwitcher } from '@/components/peakpro/language-switcher';
import { PeakProLogo } from '@/components/peakpro/logo';
import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import type { DeskRegion } from '@/lib/peakpro/desk-region';

/** Public-page header (landing, subscribe, login). The signed-in desk uses the left rail instead. */
export function PeakProTopBar({
  locale,
  signedIn,
  desk,
}: {
  locale: Locale;
  signedIn: boolean;
  desk: DeskRegion;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-signal/15 bg-void/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <Link href="/" aria-label="PeakPro+">
          <PeakProLogo size="sm" align="left" />
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <PeakProDeskSwitcher locale={locale} desk={desk} />
          <PeakProLanguageSwitcher />
          <Link
            href={signedIn ? '/app' : '/login'}
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-ice-dim transition-colors hover:text-signal"
          >
            {tPeakpro(locale, signedIn ? 'navApp' : 'navLogin')}
          </Link>
          {signedIn ? <SignOutButton locale={locale} /> : null}
          <Link href="/subscribe" className="peakpro-btn !px-4 !py-2 text-[10px]">
            {tPeakpro(locale, 'navSubscribe')}
          </Link>
        </div>
      </div>
    </header>
  );
}
