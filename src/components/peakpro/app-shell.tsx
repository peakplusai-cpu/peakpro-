import type { ReactNode } from 'react';

import { PeakProFooter } from '@/components/peakpro/footer';
import { PeakProModuleView } from '@/components/peakpro/modules';
import { Notice } from '@/components/peakpro/notice';
import { PeakProProvider } from '@/components/peakpro/provider';
import { PeakProRail } from '@/components/peakpro/rail';
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
      <div className="relative min-h-screen text-ice">
        <PeakProRail
          locale={locale}
          tier={session.tier}
          signedIn={Boolean(session.userId)}
          trial={session.trial}
          expiresAt={session.expiresAt}
          desk={desk}
        />
        <div className="lg:pl-64">
          <main className="peakpro-rise mx-auto max-w-6xl px-5 pb-10 pt-24 lg:px-10 lg:pt-12">
            {notice === 'revoked' ? (
              <Notice role="alert" className="mb-6">
                {tPeakpro(locale, 'revokedNotice')}
              </Notice>
            ) : null}
            {notice === 'success' ? (
              <Notice tone="ok" role="status" className="mb-6">
                {tPeakpro(locale, session.trial ? 'trialStarted' : 'paymentSuccess')}
              </Notice>
            ) : null}
            {cache.lastUpdated ? (
              <p className="peakpro-kicker mb-8">
                <span className="peakpro-live" />
                {tPeakpro(locale, 'lastPrint')}{' '}
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
      </div>
    </PeakProProvider>
  );
}
