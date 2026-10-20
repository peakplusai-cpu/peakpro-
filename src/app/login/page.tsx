import Link from 'next/link';

import { PeakProFooter } from '@/components/peakpro/footer';
import { PeakProDeskSwitcher } from '@/components/peakpro/desk-switcher';
import { PeakProLanguageSwitcher } from '@/components/peakpro/language-switcher';
import { PeakProLoginForm } from '@/components/peakpro/login-form';
import { PeakProLogo } from '@/components/peakpro/logo';
import { getLocale } from '@/i18n/server';
import { getDeskRegion } from '@/lib/peakpro/desk-region-server';
import { tPeakpro } from '@/lib/peakpro/copy';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const locale = await getLocale();
  const desk = await getDeskRegion();
  const { error, redirect: redirectTo } = await searchParams;

  return (
    <div className="relative min-h-screen text-ice">
      <header className="mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3 px-5 py-6">
        <PeakProLogo size="sm" align="left" />
        <div className="flex items-center gap-2">
          <PeakProDeskSwitcher locale={locale} desk={desk} />
          <PeakProLanguageSwitcher />
        </div>
      </header>
      <main className="peakpro-rise mx-auto max-w-lg px-5 pb-16">
        <p className="peakpro-kicker">
          <span className="peakpro-live" />
          {locale === 'zh' ? '客戶端閘道' : 'Client gate'}
        </p>
        <h1 className="mt-4 font-peakpro text-4xl font-bold tracking-tight text-ice">{tPeakpro(locale, 'loginTitle')}</h1>
        <p className="mt-3 text-sm text-ice-dim">{tPeakpro(locale, 'loginSub')}</p>
        <div className="peakpro-panel peakpro-frame mt-8 p-8">
          <PeakProLoginForm locale={locale} error={error} redirectTo={redirectTo} />
        </div>
        <Link href="/" className="mt-6 inline-block font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500 hover:text-signal">
          {tPeakpro(locale, 'backHome')}
        </Link>
      </main>
      <PeakProFooter locale={locale} />
    </div>
  );
}
