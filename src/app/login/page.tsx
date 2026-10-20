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
    <div className="relative min-h-screen text-zinc-100">
      <header className="mx-auto flex max-w-lg items-center justify-between px-6 py-6">
        <PeakProLogo size="sm" align="left" />
        <div className="flex items-center gap-2">
          <PeakProDeskSwitcher locale={locale} desk={desk} />
          <PeakProLanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-lg px-6 pb-16">
        <p className="peakpro-kicker">
          <span className="peakpro-live" />
          {locale === 'zh' ? '客戶端閘道' : 'Client gate'}
        </p>
        <h1 className="mt-4 font-peakpro text-5xl tracking-tight text-gold">{tPeakpro(locale, 'loginTitle')}</h1>
        <p className="mt-3 text-sm text-gold/55">{tPeakpro(locale, 'loginSub')}</p>
        <div className="peakpro-panel mt-8 p-8">
          <PeakProLoginForm locale={locale} error={error} redirectTo={redirectTo} />
        </div>
        <Link href="/" className="mt-6 inline-block font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500 hover:text-phosphor">
          {tPeakpro(locale, 'backHome')}
        </Link>
      </main>
      <PeakProFooter locale={locale} />
    </div>
  );
}
