import type { ReactNode } from 'react';

import { PeakProFooter } from '@/components/peakpro/footer';
import { PeakProModuleView } from '@/components/peakpro/modules';
import { PeakProNav } from '@/components/peakpro/nav';
import { PeakProProvider } from '@/components/peakpro/provider';
import type { Locale } from '@/i18n/locale';
import type { PeakProModule } from '@/lib/peakpro/constants';
import { getDeskRegion } from '@/lib/peakpro/desk-region-server';
import { tPeakpro } from '@/lib/peakpro/copy';
import type { PeakProCacheSnapshot, PeakProSession } from '@/lib/peakpro/types';

export async function PeakProAppShell({
  locale,
  session,
  moduleId,
  cache,
  notice,
  highlight,
  children,
}: {
  locale: Locale;
  session: PeakProSession;
  moduleId: PeakProModule;
  cache: PeakProCacheSnapshot;
  notice?: 'revoked' | 'success' | null;
  highlight?: string;
  children?: ReactNode;
}) {
  const desk = await getDeskRegion();
  return (
    <PeakProProvider
      session={session}
      activeModule={moduleId}
      usdTwd={desk === 'us' ? null : cache.usdTwd}
      desk={desk}
    >
      <div className="min-h-screen bg-black text-zinc-100">
        <PeakProNav
          locale={locale}
          tier={session.tier}
          signedIn={Boolean(session.userId)}
          trial={session.trial}
          expiresAt={session.expiresAt}
          desk={desk}
        />
        <main className="mx-auto max-w-6xl px-4 py-10">
          {notice === 'revoked' ? (
            <p className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {tPeakpro(locale, 'revokedNotice')}
            </p>
          ) : null}
          {notice === 'success' ? (
            <p className="mb-6 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
              {tPeakpro(locale, session.trial ? 'trialStarted' : 'paymentSuccess')}
            </p>
          ) : null}
          {cache.lastUpdated ? (
            <p className="mb-8 text-[11px] uppercase tracking-[0.28em] text-zinc-500">
              {tPeakpro(locale, 'lastPrint')}:{' '}
              {new Date(cache.lastUpdated).toLocaleString(locale === 'zh' ? 'zh-TW' : 'en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          ) : null}
          {children ?? (
            <PeakProModuleView
              locale={locale}
              tier={session.tier}
              moduleId={moduleId}
              cache={cache}
              highlight={highlight}
              desk={desk}
            />
          )}
        </main>
        <PeakProFooter locale={locale} />
      </div>
    </PeakProProvider>
  );
}
