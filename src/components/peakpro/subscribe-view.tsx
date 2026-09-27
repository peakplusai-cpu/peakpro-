import Link from 'next/link';
import { Check } from 'lucide-react';

import { PeakProFooter } from '@/components/peakpro/footer';
import { PeakProNav } from '@/components/peakpro/nav';
import type { Locale } from '@/i18n/locale';
import { PEAKPRO_DISCLAIMER_EN, PEAKPRO_DISCLAIMER_ZH } from '@/lib/peakpro/disclaimer';
import { tPeakpro } from '@/lib/peakpro/copy';
import type { PeakProSession } from '@/lib/peakpro/types';

const FEATURES_EN = [
  'Taiwan & U.S. equities — daily trends, monthly trends, annual macro outlook',
  'Crypto trends for BTC and ETH',
  'Spot gold charts and macro analysis',
  'Geopolitical & war news risk feed',
  'Market Fear & Greed Index',
  'Weekly trending assets ranking',
  'AI weekly market summary',
];

const FEATURES_ZH = [
  '台股與美股：日線、月線、年度總體展望',
  '比特幣與以太坊加密趨勢',
  '現貨黃金走勢與總體分析',
  '地緣政治與戰事新聞情報',
  '市場恐慌與貪婪指數',
  '本週熱門資產排名',
  'AI 每週市場總結',
];

export function PeakProSubscribeView({
  locale,
  session,
  revoked,
  billingError,
}: {
  locale: Locale;
  session: PeakProSession;
  revoked?: boolean;
  billingError?: string;
}) {
  const features = locale === 'zh' ? FEATURES_ZH : FEATURES_EN;

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <PeakProNav locale={locale} tier={session.tier} signedIn={Boolean(session.userId)} compact />
      <main className="mx-auto max-w-3xl px-6 py-16">
        {revoked ? (
          <p className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {tPeakpro(locale, 'revokedNotice')}
          </p>
        ) : null}
        {billingError ? (
          <p className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {billingError}
          </p>
        ) : null}
        <p className="text-[11px] uppercase tracking-[0.4em] text-gold">PeakPro+</p>
        <h1 className="mt-4 font-peakpro text-4xl text-gold">{tPeakpro(locale, 'subscribeTitle')}</h1>
        <p className="mt-4 text-sm text-zinc-400">{tPeakpro(locale, 'subscribeSub')}</p>
        <div className="mt-10 rounded-3xl border border-gold/25 bg-zinc-950/80 p-8 peakpro-hairline">
          <p className="font-peakpro text-5xl text-gold">
            {tPeakpro(locale, 'subscribePrice')}
            <span className="ml-2 text-base text-zinc-500">{tPeakpro(locale, 'subscribePeriod')}</span>
          </p>
          <h2 className="mt-8 text-xs uppercase tracking-[0.28em] text-gold-antique">
            {tPeakpro(locale, 'subscribeFeaturesTitle')}
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-zinc-300">
            {features.map((item) => (
              <li key={item} className="flex gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {item}
              </li>
            ))}
          </ul>
          {session.userId ? (
            <Link
              href="/api/checkout"
              className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-gold py-3 text-sm font-semibold text-black"
            >
              {tPeakpro(locale, 'subscribeCta')}
            </Link>
          ) : (
            <Link
              href="/login?redirect=/subscribe"
              className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-gold py-3 text-sm font-semibold text-black"
            >
              {tPeakpro(locale, 'subscribeLogin')}
            </Link>
          )}
        </div>
        <section className="mt-10 space-y-4 text-xs leading-relaxed text-zinc-500">
          <p>{PEAKPRO_DISCLAIMER_EN}</p>
          <p>{PEAKPRO_DISCLAIMER_ZH}</p>
        </section>
      </main>
      <PeakProFooter locale={locale} />
    </div>
  );
}
