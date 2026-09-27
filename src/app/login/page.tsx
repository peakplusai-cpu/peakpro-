import Link from 'next/link';

import { PeakProFooter } from '@/components/peakpro/footer';
import { PeakProLanguageSwitcher } from '@/components/peakpro/language-switcher';
import { PeakProLoginForm } from '@/components/peakpro/login-form';
import { PeakProLogo } from '@/components/peakpro/logo';
import { getLocale } from '@/i18n/server';
import { tPeakpro } from '@/lib/peakpro/copy';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const locale = await getLocale();
  const { error, redirect: redirectTo } = await searchParams;

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <header className="mx-auto flex max-w-lg items-center justify-between px-6 py-6">
        <PeakProLogo size="sm" />
        <PeakProLanguageSwitcher />
      </header>
      <main className="mx-auto max-w-lg px-6 pb-16">
        <h1 className="font-peakpro text-3xl text-gold">{tPeakpro(locale, 'loginTitle')}</h1>
        <p className="mt-3 text-sm text-zinc-400">{tPeakpro(locale, 'loginSub')}</p>
        <div className="mt-8 rounded-3xl border border-gold/20 bg-zinc-950/80 p-8">
          <PeakProLoginForm locale={locale} error={error} redirectTo={redirectTo} />
        </div>
        <Link href="/" className="mt-6 inline-block text-xs text-zinc-500 hover:text-gold">
          {tPeakpro(locale, 'backHome')}
        </Link>
      </main>
      <PeakProFooter locale={locale} />
    </div>
  );
}
