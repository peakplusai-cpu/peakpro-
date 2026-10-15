'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, LogOut } from 'lucide-react';

import { peakproSignOut } from '@/app/login/actions';
import { PeakProDeskSwitcher } from '@/components/peakpro/desk-switcher';
import { PeakProLanguageSwitcher } from '@/components/peakpro/language-switcher';
import { PeakProLogo } from '@/components/peakpro/logo';
import type { Locale } from '@/i18n/locale';
import { canAccessModule, premiumExpiresInDays } from '@/lib/peakpro/access';
import type { PeakProModule } from '@/lib/peakpro/constants';
import { modulesForDesk, type DeskRegion } from '@/lib/peakpro/desk-region';
import { MODULE_HREF, moduleLabel, tPeakpro } from '@/lib/peakpro/copy';
import type { PeakProTier } from '@/lib/peakpro/types';
import { cn } from '@/lib/utils';

export function PeakProNav({
  locale,
  tier,
  signedIn,
  trial = false,
  expiresAt = null,
  desk = 'tw',
  compact = false,
}: {
  locale: Locale;
  tier: PeakProTier;
  signedIn: boolean;
  trial?: boolean;
  expiresAt?: string | null;
  desk?: DeskRegion;
  compact?: boolean;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-phosphor/10 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="shrink-0">
          <PeakProLogo size="sm" align="left" />
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <PeakProDeskSwitcher locale={locale} desk={desk} />
          <PeakProLanguageSwitcher />
        </div>
        <div className="flex items-center gap-2 text-xs">
          {signedIn ? (
            <>
              <span
                className={cn(
                  'peakpro-chip hidden sm:inline-flex',
                  tier === 'premium' ? 'text-gold border-gold/30' : 'text-zinc-400',
                )}
              >
                {tier === 'premium' && trial
                  ? tPeakpro(locale, 'trialDaysLeft').replace(
                      '{n}',
                      String(premiumExpiresInDays(expiresAt) ?? 0),
                    )
                  : tPeakpro(locale, tier === 'premium' ? 'premiumBadge' : 'freeBadge')}
              </span>
              <Link href="/subscribe" className="peakpro-btn-ghost !px-3 !py-1.5 text-[10px]">
                {tPeakpro(locale, 'navSubscribe')}
              </Link>
              <form action={peakproSignOut}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500 hover:text-phosphor"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tPeakpro(locale, 'navSignOut')}</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-300 hover:text-phosphor">
                {tPeakpro(locale, 'navLogin')}
              </Link>
              <Link href="/subscribe" className="peakpro-btn !px-3 !py-1.5 text-[10px]">
                {tPeakpro(locale, 'navSubscribe')}
              </Link>
            </>
          )}
        </div>
      </div>
      {compact ? null : (
        <nav className="overflow-x-auto border-t border-phosphor/10">
          <div className="mx-auto flex max-w-7xl gap-1 px-3 py-1">
            {modulesForDesk(desk).map((moduleId) => {
              const href = MODULE_HREF[moduleId];
              const active =
                moduleId === 'overview'
                  ? pathname === '/app'
                  : pathname === href || pathname.startsWith(`${href}/`);
              const locked =
                !canAccessModule(tier, moduleId as PeakProModule) &&
                moduleId !== 'overview' &&
                moduleId !== 'learn';
              return (
                <Link
                  key={moduleId}
                  href={signedIn ? href : '/login'}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors',
                    active
                      ? 'border-phosphor text-phosphor'
                      : 'border-transparent text-zinc-500 hover:border-gold/50 hover:text-gold',
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
