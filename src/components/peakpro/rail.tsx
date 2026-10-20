'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { SignOutButton, TierBadge } from '@/components/peakpro/account';
import { PeakProDeskSwitcher } from '@/components/peakpro/desk-switcher';
import { PeakProLanguageSwitcher } from '@/components/peakpro/language-switcher';
import { PeakProLogo } from '@/components/peakpro/logo';
import type { Locale } from '@/i18n/locale';
import { canAccessModule } from '@/lib/peakpro/access';
import type { PeakProModule } from '@/lib/peakpro/constants';
import { MODULE_HREF, moduleLabel, tPeakpro } from '@/lib/peakpro/copy';
import { modulesForDesk, type DeskRegion } from '@/lib/peakpro/desk-region';
import type { PeakProTier } from '@/lib/peakpro/types';
import { cn } from '@/lib/utils';

type RailProps = {
  locale: Locale;
  tier: PeakProTier;
  signedIn: boolean;
  trial?: boolean;
  expiresAt?: string | null;
  desk: DeskRegion;
};

function RailBody({ locale, tier, signedIn, trial, expiresAt, desk }: RailProps) {
  const pathname = usePathname();
  const modules = modulesForDesk(desk);

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-5">
        <Link href="/" aria-label="PeakPro+">
          <PeakProLogo size="sm" align="left" />
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <PeakProDeskSwitcher locale={locale} desk={desk} />
          <PeakProLanguageSwitcher />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Desk modules">
        <ul className="space-y-0.5">
          {modules.map((moduleId, index) => {
            const href = MODULE_HREF[moduleId];
            const active =
              moduleId === 'overview' ? pathname === '/app' : pathname === href || pathname.startsWith(`${href}/`);
            const locked =
              !canAccessModule(tier, moduleId as PeakProModule) && moduleId !== 'overview' && moduleId !== 'learn';
            return (
              <li key={moduleId}>
                <Link
                  href={signedIn ? href : '/login'}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 px-3 py-2 text-[13px] transition-colors',
                    active
                      ? 'bg-signal/10 text-ice'
                      : 'text-zinc-400 hover:bg-signal/5 hover:text-ice',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'absolute inset-y-1 left-0 w-0.5 transition-all',
                      active
                        ? 'bg-signal shadow-[0_0_12px_rgba(77,240,255,0.9)]'
                        : 'bg-transparent group-hover:bg-signal/40',
                    )}
                  />
                  <span
                    className={cn(
                      'w-5 font-mono text-[10px] tabular-nums',
                      active ? 'text-signal' : 'text-zinc-600 group-hover:text-signal/70',
                    )}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 truncate">{moduleLabel(locale, moduleId)}</span>
                  {locked ? <Lock className="h-3 w-3 shrink-0 text-plasma/80" /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-signal/15 px-5 py-4">
        {signedIn ? (
          <>
            <TierBadge locale={locale} tier={tier} trial={trial} expiresAt={expiresAt} />
            <div className="flex items-center justify-between gap-3">
              <Link href="/subscribe" className="peakpro-btn-ghost !px-3 !py-1.5 text-[10px]">
                {tPeakpro(locale, 'navSubscribe')}
              </Link>
              <SignOutButton locale={locale} />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/login"
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-ice-dim hover:text-signal"
            >
              {tPeakpro(locale, 'navLogin')}
            </Link>
            <Link href="/subscribe" className="peakpro-btn !px-3 !py-1.5 text-[10px]">
              {tPeakpro(locale, 'navSubscribe')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/** Desk sidebar on desktop; top bar + slide-over drawer on mobile. */
export function PeakProRail(props: RailProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-signal/15 bg-void/80 px-4 backdrop-blur-md lg:hidden">
        <Link href="/" aria-label="PeakPro+">
          <PeakProLogo size="sm" align="left" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label="Menu"
          aria-expanded={open}
          className="p-2 text-signal"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-void/70 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 border-r border-signal/15 bg-void/90 backdrop-blur-xl transition-transform duration-300 lg:z-30 lg:w-64 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <RailBody {...props} />
      </aside>
    </>
  );
}
