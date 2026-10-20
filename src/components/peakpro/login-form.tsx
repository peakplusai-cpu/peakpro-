import { peakproSignIn, peakproSignUp } from '@/app/login/actions';
import { Notice } from '@/components/peakpro/notice';
import type { Locale } from '@/i18n/locale';
import { tPeakpro } from '@/lib/peakpro/copy';

export function PeakProLoginForm({
  locale,
  error,
  redirectTo,
}: {
  locale: Locale;
  error?: string;
  redirectTo?: string;
}) {
  return (
    <div className="space-y-8">
      {error ? (
        <Notice role="alert" className="font-mono">
          {error}
        </Notice>
      ) : null}
      <form action={peakproSignIn} className="space-y-4">
        {redirectTo ? <input type="hidden" name="redirect" value={redirectTo} /> : null}
        <div>
          <label htmlFor="email" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            {tPeakpro(locale, 'email')}
          </label>
          <input id="email" name="email" type="email" required className="peakpro-input" />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            {tPeakpro(locale, 'password')}
          </label>
          <input id="password" name="password" type="password" required className="peakpro-input" />
        </div>
        <button type="submit" className="peakpro-btn w-full">
          {tPeakpro(locale, 'signIn')}
        </button>
      </form>
      <form action={peakproSignUp} className="space-y-4 border-t border-signal/10 pt-6">
        {redirectTo ? <input type="hidden" name="redirect" value={redirectTo} /> : null}
        <div>
          <label htmlFor="signup-email" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            {tPeakpro(locale, 'email')}
          </label>
          <input id="signup-email" name="email" type="email" required className="peakpro-input" />
        </div>
        <div>
          <label htmlFor="signup-password" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            {tPeakpro(locale, 'password')}
          </label>
          <input id="signup-password" name="password" type="password" required minLength={6} className="peakpro-input" />
        </div>
        <button type="submit" className="peakpro-btn-ghost w-full">
          {tPeakpro(locale, 'signUp')}
        </button>
        <p className="text-center text-xs text-zinc-500">{tPeakpro(locale, 'signUpHint')}</p>
      </form>
    </div>
  );
}
