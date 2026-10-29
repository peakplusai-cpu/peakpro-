import Link from 'next/link';
import type { ReactNode } from 'react';

import { SignOutButton } from '@/components/peakpro/account';
import { BitgetMark, BitgetRegisterCta } from '@/components/peakpro/bitget-brand';
import { PeakProFooter } from '@/components/peakpro/footer';
import { PeakProLanguageSwitcher } from '@/components/peakpro/language-switcher';
import { PeakProProvider } from '@/components/peakpro/provider';
import type { Locale } from '@/i18n/locale';
import { TRADE_APP_PATH, TRADE_PATH } from '@/lib/peakpro/constants';
import { tPeakpro } from '@/lib/peakpro/copy';
import type { PeakProSession } from '@/lib/peakpro/types';

function TradeTopBar({ locale, signedIn }: { locale: Locale; signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-signal/15 bg-void/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <Link href={TRADE_PATH} className="flex items-center gap-2.5 text-ice" aria-label={tPeakpro(locale, 'tradeBrand')}>
          <BitgetMark className="h-7 w-7" />
          <span className="font-peakpro text-lg font-bold uppercase tracking-[0.08em]">{tPeakpro(locale, 'tradeBrand')}</span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <PeakProLanguageSwitcher />
          <Link
            href={signedIn ? TRADE_APP_PATH : `/login?redirect=${encodeURIComponent(TRADE_APP_PATH)}`}
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-ice-dim transition-colors hover:text-signal"
          >
            {tPeakpro(locale, signedIn ? 'navApp' : 'navLogin')}
          </Link>
          {signedIn ? <SignOutButton locale={locale} next={TRADE_PATH} /> : null}
        </div>
      </div>
    </header>
  );
}

export function TradeShell({
  locale,
  session,
  children,
  register,
}: {
  locale: Locale;
  session: PeakProSession | null;
  children: ReactNode;
  register?: boolean;
}) {
  const signedIn = Boolean(session?.userId);
  return (
    <PeakProProvider
      session={
        session ?? {
          userId: null,
          email: null,
          tier: 'free',
          expiresAt: null,
          revoked: false,
          trial: false,
          customerId: null,
          subscriptionId: null,
        }
      }
      activeModule="overview"
    >
      <div className="relative min-h-screen text-ice">
        <TradeTopBar locale={locale} signedIn={signedIn} />
        <main className="peakpro-rise mx-auto max-w-6xl px-5 pb-10 pt-10 lg:px-10">
          {children}
          {register ? (
            <div className="mt-10">
              <BitgetRegisterCta locale={locale} />
            </div>
          ) : null}
        </main>
        <PeakProFooter locale={locale} />
      </div>
    </PeakProProvider>
  );
}
