'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, LogOut } from 'lucide-react';

import { peakproSignOut } from '@/app/login/actions';
import { PeakProLanguageSwitcher } from '@/components/peakpro/language-switcher';
import { PeakProLogo } from '@/components/peakpro/logo';
import type { Locale } from '@/i18n/locale';
import { canAccessModule } from '@/lib/peakpro/access';
import { PEAKPRO_MODULES, type PeakProModule } from '@/lib/peakpro/constants';
import { MODULE_HREF, moduleLabel, tPeakpro } from '@/lib/peakpro/copy';
import type { PeakProTier } from '@/lib/peakpro/types';
import { cn } from '@/lib/utils';

export function PeakProNav({
  locale,
  tier,
  signedIn,
  compact = false,
}: {
  locale: Locale;
  tier: PeakProTier;
  signedIn: boolean;
  compact?: boolean;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-gold/15 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="shrink-0">
          <PeakProLogo size="sm" />
        </Link>
        <PeakProLanguageSwitcher />
        <div className="flex items-center gap-2 text-xs">
          {signedIn ? (
            <>
              <span
                className={cn(
                  'hidden rounded-full border px-2.5 py-1 sm:inline',
                  tier === 'premium'
                    ? 'border-gold/40 text-gold'
                    : 'border-zinc-700 text-zinc-400',
                )}
              >
                {tPeakpro(locale, tier === 'premium' ? 'premiumBadge' : 'freeBadge')}
              </span>
              <Link
                href="/subscribe"
                className="rounded-full border border-gold/30 px-3 py-1 text-gold hover:bg-gold/10"
              >
                {tPeakpro(locale, 'navSubscribe')}
              </Link>
              <form action={peakproSignOut}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-200"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tPeakpro(locale, 'navSignOut')}</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-zinc-300 hover:text-gold">
                {tPeakpro(locale, 'navLogin')}
              </Link>
              <Link
                href="/subscribe"
                className="rounded-full bg-gold px-3 py-1 font-semibold text-black"
              >
                {tPeakpro(locale, 'navSubscribe')}
              </Link>
            </>
          )}
        </div>
      </div>
      {compact ? null : (
        <nav className="overflow-x-auto border-t border-gold/10">
          <div className="mx-auto flex max-w-7xl gap-1 px-3 py-2">
            {PEAKPRO_MODULES.map((moduleId) => {
              const href = MODULE_HREF[moduleId];
              const active =
                moduleId === 'overview'
                  ? pathname === '/app'
                  : pathname === href;
              const locked = !canAccessModule(tier, moduleId as PeakProModule) && moduleId !== 'overview';
              return (
                <Link
                  key={moduleId}
                  href={signedIn ? href : '/login'}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] tracking-wide transition-colors',
                    active
                      ? 'bg-gold text-black'
                      : 'text-zinc-400 hover:bg-gold/10 hover:text-gold',
                  )}
                >
                  {locked ? <Lock className="h-3 w-3" /> : null}
                  {moduleLabel(locale, moduleId)}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
