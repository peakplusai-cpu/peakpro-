'use client';

import { LogOut } from 'lucide-react';

import { peakproSignOut } from '@/app/login/actions';
import type { Locale } from '@/i18n/locale';
import { premiumExpiresInDays } from '@/lib/peakpro/access';
import { tPeakpro } from '@/lib/peakpro/copy';
import type { PeakProTier } from '@/lib/peakpro/types';
import { cn } from '@/lib/utils';

export function TierBadge({
  locale,
  tier,
  trial = false,
  expiresAt = null,
  className,
}: {
  locale: Locale;
  tier: PeakProTier;
  trial?: boolean;
  expiresAt?: string | null;
  className?: string;
}) {
  const premium = tier === 'premium';
  const label =
    premium && trial
      ? tPeakpro(locale, 'trialDaysLeft').replace('{n}', String(premiumExpiresInDays(expiresAt) ?? 0))
      : tPeakpro(locale, premium ? 'premiumBadge' : 'freeBadge');
  return (
    <span
      className={cn(
        'peakpro-chip',
        premium ? 'border-plasma/50 bg-plasma/10 text-plasma' : 'border-zinc-700 bg-transparent text-zinc-400',
        className,
      )}
    >
      {label}
    </span>
  );
}

export function SignOutButton({
  locale,
  className,
  next,
}: {
  locale: Locale;
  className?: string;
  next?: string;
}) {
  return (
    <form action={peakproSignOut}>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <button
        type="submit"
        className={cn(
          'inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500 transition-colors hover:text-signal',
          className,
        )}
      >
        <LogOut className="h-3.5 w-3.5" />
        {tPeakpro(locale, 'navSignOut')}
      </button>
    </form>
  );
}
