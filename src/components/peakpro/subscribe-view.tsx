import Link from 'next/link';
import { Check } from 'lucide-react';

import { PeakProFooter } from '@/components/peakpro/footer';
import { Notice } from '@/components/peakpro/notice';
import { PeakProTopBar } from '@/components/peakpro/top-bar';
import type { DeskRegion } from '@/lib/peakpro/desk-region';
import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';
import type { PeakProSession } from '@/lib/peakpro/types';

const FEATURES_EN = [
  'Forecast path from Bollinger, RSI-vs-mean, tape, headlines, and filings',
  'Market-moving international news',
  'Public filings: U.S. politicians and 13F books',
  'Taiwan / U.S. sentiment gauges',
  'Desk Advisor, 30 messages per day',
  'Custom ticker lookup beyond the free universe',
  'AI desk notes on a name',
];

const FEATURES_US_EN = [
  'Forecast path from Bollinger, RSI-vs-mean, tape, headlines, and filings',
  'Market-moving international news',
  'Public filings: U.S. politicians and 13F books',
  'U.S. sentiment gauges',
  'Desk Advisor, 30 messages per day',
  'Custom ticker lookup beyond the free universe',
  'AI desk notes on a name',
];

const FEATURES_ZH = [
  '預測路徑：布林、RSI 均值、走勢、標題與申報',
  '會動股價的國際新聞',
  '公開申報：美國政治人物與 13F',
  '台／美情緒',
  '桌面顧問，每日 30 則',
  '免費清單以外的自選代碼',
  '個股 AI 桌面筆記',
];

const FEATURES_US_ZH = [
  '預測路徑：布林、RSI 均值、走勢、標題與申報',
  '會動股價的國際新聞',
  '公開申報：美國政治人物與 13F',
  '美股情緒',
  '桌面顧問，每日 30 則',
  '免費清單以外的自選代碼',
  '個股 AI 桌面筆記',
];

export function PeakProSubscribeView({
  locale,
  session,
  revoked,
  canceled,
  billingError,
  desk = 'tw',
}: {
  locale: Locale;
  session: PeakProSession;
  revoked?: boolean;
  canceled?: boolean;
  billingError?: string;
  desk?: DeskRegion;
}) {
  const features =
    desk === 'us'
      ? locale === 'zh'
        ? FEATURES_US_ZH
        : FEATURES_US_EN
      : locale === 'zh'
        ? FEATURES_ZH
        : FEATURES_EN;

  return (
    <div className="relative min-h-screen text-ice">
      <PeakProTopBar locale={locale} signedIn={Boolean(session.userId)} desk={desk} />
      <main className="peakpro-rise mx-auto max-w-3xl px-5 py-16">
        {canceled ? (
          <Notice tone="ok" role="status" className="mb-6">
            {tPeakpro(locale, 'trialCanceled')}
          </Notice>
        ) : null}
        {revoked ? (
          <Notice role="alert" className="mb-6">
            {tPeakpro(locale, 'revokedNotice')}
          </Notice>
        ) : null}
        {billingError ? (
          <Notice role="alert" className="mb-6">
            {billingError}
          </Notice>
        ) : null}
        <p className="peakpro-kicker">
          <span className="peakpro-live" />
          PeakPro+
        </p>
        <h1 className="mt-4 font-peakpro text-4xl font-bold tracking-tight text-ice sm:text-5xl">{tPeakpro(locale, 'subscribeTitle')}</h1>
        <p className="mt-4 text-sm text-ice-dim">{tPeakpro(locale, 'subscribeSub')}</p>
        <div className="peakpro-panel peakpro-frame mt-10 p-8">
          <p className="peakpro-glow font-mono text-5xl tabular-nums text-ice">
            {tPeakpro(locale, 'subscribePrice')}
            <span className="ml-2 text-base text-zinc-500">{tPeakpro(locale, 'subscribePeriod')}</span>
          </p>
          <h2 className="mt-8 font-mono text-[11px] uppercase tracking-[0.28em] text-signal">
            {tPeakpro(locale, 'subscribeFeaturesTitle')}
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-zinc-300">
            {features.map((item) => (
              <li key={item} className="flex gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
                {item}
              </li>
            ))}
          </ul>
          {session.userId ? (
            session.trial && session.subscriptionId ? (
              <form action="/api/billing/cancel" method="post" className="mt-8">
                <button type="submit" className="peakpro-btn-ghost w-full">
                  {tPeakpro(locale, 'trialCancelCta')}
                </button>
              </form>
            ) : session.tier === 'premium' ? (
              <p className="peakpro-chip mt-8 w-full justify-center border-plasma/50 bg-plasma/10 !py-3 text-plasma">
                {tPeakpro(locale, 'premiumBadge')}
              </p>
            ) : (
              <a href="/api/checkout" className="peakpro-btn mt-8 w-full">
                {tPeakpro(locale, 'subscribeCta')}
              </a>
            )
          ) : (
            <Link href="/login?redirect=/subscribe" className="peakpro-btn mt-8 w-full">
              {tPeakpro(locale, 'subscribeLogin')}
            </Link>
          )}
          {session.userId && session.customerId ? (
            <a
              href="/api/billing/portal"
              className="mt-5 block text-center font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:text-signal"
            >
              {tPeakpro(locale, 'manageBilling')}
            </a>
          ) : null}
        </div>
      </main>
      <PeakProFooter locale={locale} />
    </div>
  );
}
