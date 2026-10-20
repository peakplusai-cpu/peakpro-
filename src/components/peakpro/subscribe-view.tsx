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
  'Taiwan and U.S. equities on separate desks, plus ticker lookup',
  'Crypto trends for BTC and ETH',
  'Spot gold charts and macro analysis',
  'Market-moving international news — rates, oil, chips, trade, geopolitics',
  'Taiwan / U.S. bid-offer gauges and crypto Fear & Greed, labeled on one page',
  'Taiwan and U.S. market-wide movers',
  'AI weekly market summary',
  'Beginner primer: market principles and how to read the desk',
  'Desk Advisor, 30 messages per day',
  'Personal book with cost basis and marked P&L',
  'Session tape: volume-price turns, relative strength, official after-close institutions',
  'Public filings: U.S. politicians and well-known 13F books, delayed',
  'Concept names: twenty Taiwan and twenty U.S. mega-caps with labeled suppliers',
];

const FEATURES_US_EN = [
  'U.S. equities on their own desk, plus ticker lookup',
  'Crypto trends for BTC and ETH',
  'Spot gold charts and macro analysis',
  'Market-moving international news — rates, oil, chips, trade, geopolitics',
  'U.S. bid-offer gauges and crypto Fear & Greed',
  'U.S. market-wide movers',
  'AI weekly market summary',
  'Beginner primer: market principles and how to read the desk',
  'Desk Advisor, 30 messages per day',
  'Personal book with cost basis and marked P&L',
  'Session tape: volume-price turns and relative strength versus QQQ',
  'Public filings: U.S. politicians and well-known 13F books, delayed',
  'Concept names: twenty U.S. mega-caps with labeled suppliers',
];

const FEATURES_ZH = [
  '台股、美股分頁，並可查自己要看的股票',
  '比特幣與以太坊加密趨勢',
  '現貨黃金走勢與總體分析',
  '會動股價的國際新聞：利率、原油、晶片、貿易、地緣',
  '台股、美股利多利空與加密恐懼貪婪，同一頁分別標示',
  '全台股、全美股熱門排行',
  'AI 每週市場總結',
  '新手課：股市原理與怎麼讀本桌指標',
  '桌面顧問，每日 30 則',
  '自選組合與持有成本、估算損益',
  '動能轉折：盤中量價強弱、相對指數、盤後官方三大法人',
  '公開申報：美國政治人物與知名法人 13F，有法定延遲',
  '概念股：台股、美股各二十家龍頭，點開可見供應鏈與供應物',
];

const FEATURES_US_ZH = [
  '美股專桌，並可查自己要看的股票',
  '比特幣與以太坊加密趨勢',
  '現貨黃金走勢與總體分析',
  '會動股價的國際新聞：利率、原油、晶片、貿易、地緣',
  '美股利多利空與加密恐懼貪婪',
  '全美股熱門排行',
  'AI 每週市場總結',
  '新手課：股市原理與怎麼讀本桌指標',
  '桌面顧問，每日 30 則',
  '自選組合與持有成本、估算損益',
  '動能轉折：盤中量價強弱、相對 QQQ',
  '公開申報：美國政治人物與知名法人 13F，有法定延遲',
  '概念股：二十家美股龍頭，點開可見供應鏈與供應物',
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
